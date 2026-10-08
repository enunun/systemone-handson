# Iteration 3：判断エンジンをアプリから切り離す(解説)

演習用の`docs/iteration-3.md`の各手順について，解答の例と考え方を説明する．

## 演習3-1：引き継いだパッケージを確かめる

Iteration 2の13のテストが通る．

SDKを`import`しているのは，`main`(`TypeSafeClient`を作る)，`app`(`TypeSafeClient`の型)，`triage`(`TypeSafeClient`と質問の型)の3つである．
Componentの図でも，SDKへの矢印はこの3つから出ている．
アプリの中心の処理である`triage`が，SDKに依存していることがわかる．

## 演習3-2：ポートとアダプタを学ぶ

1. `triage`のテストにとって必要なのは，部署の`choice`と`probabilities`，緊急度の`score`，返金の`noul`である．`type`・`confidence`・`legend`・`usage`・`model`は，`triage`が使わないのに，SDKがレスポンスとして読めるように書いていた．
2. `triage`(質問の型と答えの取り出し)，`app`(引数の型)，`main`(クライアントの作り方)を変える必要がある．テストも，偽の`fetch`が返すJSONの形を変える必要がある．
3. `case "yesno"`を消すと，次のように型検査が失敗する．

   ```console
   src/try.ts(3,40): error TS2366: Function lacks ending return statement and return type does not include 'undefined'.
   ```

   `yesno`の質問を渡すと，何も返さずに関数が終わってしまうからである．

## 演習3-3：テストリストを書く

解答例のテストリストは[TESTLIST.md](../TESTLIST.md)である．

- `createSystemOneEngine`は，`fetch`だけをstubにしてテストする．質問の変換は，送られたリクエストの本文で確かめる．答えの変換は，stubが返したJSONと`decide`の結果を比べて確かめる．
- 質問の変換のテストでは，3種類の質問を1回で送る．「1回で送る」ことも同時に確かめられる．
- テストの質問は，`triage`の質問(部署など)ではなく，短い架空の質問(`team`・`size`・`angry`)にした．アダプタは，どんな質問でも変換できるべきだからである．
- `triage`のテストは，fakeで書き換えた．期待する`Triage`は変わらない．送った質問は，fakeの`calls`で確かめる．質問はアプリの型(`kind`・`prompt`)で書く．
- 結合テストは，本物のアダプタに`fetch`のstubを渡す．SDKの通信の手前まで，本物が組み合わさって動くことを確かめる．

## 演習3-4：設計書を更新する

| ファイル | 変更 | 理由 |
| --- | --- | --- |
| [03-component.md](../design/03-component.md) | ポートとアダプタを足し，アプリの中心とアダプタを`Boundary`で分けた．`triage`からSDKへの矢印がなくなり，アダプタからポートへの矢印ができた | 依存の向きが変わった |
| [04-code.md](../design/04-code.md) | `triage`の中の流れを`engine.decide`に描き直し，アダプタの変換の流れと，ポートの型を足した | 新しい型と関数 |
| [05-sequence.md](../design/05-sequence.md) | `triage`とSDKの間に`systemone-engine`を描き入れ，`toWire`・`fromWire`を足した | 呼び出しの経路が変わった |

- Componentの図では，アダプタからポートへの矢印に「DecisionEngineを実装する」と書いた．依存の矢印がポートに集まり，ポートからは外に矢印が出ていないことが，依存性の逆転を表している．
- ContextとContainerは変えていない．外から見た`triage`は変わらないからである．

## 演習3-5：テスト駆動で実装する

### ポート

`src/ports/decision-engine.ts`に型を書く．
答えの`ChoiceAnswer`には，選ばれたラベルの確率`probability`を入れる．
Iteration 2で`triage`が`?? 0`で取り出していた値を，アダプタで計算して渡す形にした．

### `createSystemOneEngine`

最初のテストは，質問の変換である．

```ts
// test/unit/adapters/systemone-engine.test.ts
const engineWith = (answers: object, requests: unknown[] = []) =>
  createSystemOneEngine(
    new TypeSafeClient({ baseURL: "http://ollama.test", apiKey: "test", fetch: fakeFetch(answers, requests) }),
  );

describe("createSystemOneEngine", () => {
  test("アプリの質問を，/v1/systemoneの質問にして1回で送る", async () => {
    const requests: unknown[] = [];
    const answers = {
      team: { type: "choice", choice: "a", confidence: 1, probabilities: { a: 1, b: 0 } },
      size: { type: "score", score: 0, confidence: 1, legend: {}, probabilities: { 0: 1, 1: 0 } },
      angry: { type: "noul", noul: 0 },
    };

    await engineWith(answers, requests).decide(
      { subject: "Hi" },
      {
        team: { kind: "choice", prompt: "Which team?", options: { a: "team A", b: "team B" } },
        size: { kind: "scale", prompt: "How large?", levels: ["small", "large"] },
        angry: { kind: "yesno", prompt: "Angry?" },
      },
    );

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      state: { subject: "Hi" },
      questions: {
        team: { type: "choice", instructions: "Which team?", criteria: { a: "team A", b: "team B" } },
        size: { type: "score", instructions: "How large?", criteria: ["small", "large"] },
        angry: { type: "noul", instructions: "Angry?" },
      },
    });
  });
});
```

モジュールがまだないので，テストの読み込みで失敗する．

```console
 FAIL  |unit| test/unit/adapters/systemone-engine.test.ts [ test/unit/adapters/systemone-engine.test.ts ]
Error: Cannot find module '../../../src/adapters/systemone-engine.ts' imported from …/test/unit/adapters/systemone-engine.test.ts
```

アプリの質問を`/v1/systemone`の質問にする`toWire`を，`switch`で書く．

```ts
const toWire = (question: Question): WireQuestion => {
  switch (question.kind) {
    case "choice":
      return { type: "choice", instructions: question.prompt, criteria: question.options };
    case "scale": {
      const [first, second, ...rest] = question.levels;
      if (first === undefined || second === undefined) throw new Error("a scale question needs at least two levels");
      return { type: "score", instructions: question.prompt, criteria: [first, second, ...rest] };
    }
    case "yesno":
      return { type: "noul", instructions: question.prompt };
  }
};
```

SDKの`score`の`criteria`は「2つ以上の要素を持つ配列」の型である．
ポートの`levels`は`readonly string[]`なので，そのままでは渡せない．
最初の2つを取り出して`undefined`でないことを確かめると，`[first, second, ...rest]`が2つ以上の要素を持つ配列の型になる．

次のテストは，答えの変換である．

```ts
  test("答えを，質問の種類ごとのアプリの答えにする", async () => {
    const answers = {
      team: { type: "choice", choice: "b", confidence: 0.4, probabilities: { a: 0.2, b: 0.8 } },
      size: { type: "score", score: 1.6, confidence: 0.3, legend: {}, probabilities: { 0: 0.1, 1: 0.2, 2: 0.7 } },
      angry: { type: "noul", noul: 0.9 },
    };

    const result = await engineWith(answers).decide(
      { subject: "Hi" },
      {
        team: { kind: "choice", prompt: "Which team?", options: { a: "team A", b: "team B" } },
        size: { kind: "scale", prompt: "How large?", levels: ["small", "medium", "large"] },
        angry: { kind: "yesno", prompt: "Angry?" },
      },
    );

    expect(result).toEqual({
      team: { kind: "choice", value: "b", probability: 0.8, confidence: 0.4, probabilities: { a: 0.2, b: 0.8 } },
      size: { kind: "scale", value: 1.6, confidence: 0.3, probabilities: [0.1, 0.2, 0.7] },
      angry: { kind: "yesno", probability: 0.9 },
    });
  });
```

`fromWire`も，質問の種類で分ける．
SDKの答えの型は，送った質問の型から決まるが，ここでは質問を`Object.fromEntries`で作り直しているので，型の情報が失われる．
そこで，答えは`unknown`として受け取り，質問の種類に合わせて値を取り出す．

```ts
const fromWire = (question: Question, answer: unknown): Answer => {
  const wire = answer as Record<string, unknown>;
  switch (question.kind) {
    case "choice": {
      const probabilities = wire.probabilities as Record<string, number>;
      const value = wire.choice as string;
      return {
        kind: "choice",
        value,
        probability: probabilities[value] ?? 0,
        confidence: wire.confidence as number,
        probabilities,
      };
    }
    case "scale": {
      const probabilities = wire.probabilities as Record<string, number>;
      return {
        kind: "scale",
        value: wire.score as number,
        confidence: wire.confidence as number,
        probabilities: question.levels.map((_, level) => probabilities[String(level)] ?? 0),
      };
    }
    case "yesno":
      return { kind: "yesno", probability: wire.noul as number };
  }
};

export const createSystemOneEngine = (client: TypeSafeClient): DecisionEngine => ({
  async decide<const Q extends Questions>(state: Readonly<Record<string, string>>, questions: Q): Promise<Answers<Q>> {
    const wireQuestions = Object.fromEntries(Object.entries(questions).map(([name, q]) => [name, toWire(q)]));
    const result = await client.systemOne({ state: { ...state }, questions: wireQuestions });
    const answers: Record<string, Answer> = {};
    for (const [name, question] of Object.entries(questions)) {
      answers[name] = fromWire(question, result.answers[name]);
    }
    return answers as Answers<Q>;
  },
});
```

`as`は，型検査に「この値はこの型である」と伝える書き方である．
型検査は`as`の中身を確かめないので，誤りはテストで見つける．
`as`はアダプタの中の変換だけで使う．そうすれば，アプリの中心では型の検査がそのまま効く．

### `createFakeEngine`

```ts
// test/unit/adapters/fake-engine.test.ts
  test("答えを決めていない質問を尋ねられたら，例外を投げる", async () => {
    const engine = createFakeEngine({});

    await expect(engine.decide({}, { angry: { kind: "yesno", prompt: "Angry?" } })).rejects.toThrow(
      'the fake engine has no answer for "angry"',
    );
  });
```

答えがない質問に黙って`undefined`を返すと，テストの誤りが別の場所の`TypeError`として現れる．
例外にすると，どの質問の答えを決め忘れたかがすぐにわかる．

```ts
export const createFakeEngine = (answers: Readonly<Record<string, Answer>>): FakeEngine => {
  const calls: FakeEngineCall[] = [];
  return {
    calls,
    async decide<const Q extends Questions>(state: Readonly<Record<string, string>>, questions: Q): Promise<Answers<Q>> {
      calls.push({ state, questions });
      const result: Record<string, Answer> = {};
      for (const name of Object.keys(questions)) {
        const answer = answers[name];
        if (answer === undefined) throw new Error(`the fake engine has no answer for "${name}"`);
        result[name] = answer;
      }
      return result as Answers<Q>;
    },
  };
};
```

### `triage`をポートに移す

質問をポートの型で書き直し，`triage`は`DecisionEngine`を受け取るようにする．

```ts
export const triage = async (engine: DecisionEngine, ticket: Ticket): Promise<Triage> => {
  const answers = await engine.decide(
    { subject: ticket.subject, body: ticket.body },
    { department: departmentQuestion, urgency: urgencyQuestion, refund: refundQuestion },
  );
  return {
    department: answers.department.value,
    departmentProbability: answers.department.probability,
    urgency: answers.urgency.value,
    refundProbability: answers.refund.probability,
  };
};
```

`answers.department`は`ChoiceAnswer`，`answers.urgency`は`ScaleAnswer`として型が付く．
`triage`のテストをfakeで書き換えてから型を検査すると，`app`が`TypeSafeClient`を渡している場所が指摘される．

```console
$ pnpm typecheck
src/app.ts(19,55): error TS2345: Argument of type 'TypeSafeClient' is not assignable to parameter of type 'DecisionEngine'.
  Property 'decide' is missing in type 'TypeSafeClient' but required in type 'DecisionEngine'.
```

### `run`と`main`

`run`の引数を`DecisionEngine`に変え，`main`でアダプタを作る．

```ts
// src/main.ts
const client = new TypeSafeClient({ baseURL: "http://ollama:11434", apiKey: "ollama", defaultModel: "tev1:0.8b" });
const { code, output } = await run(process.argv.slice(2), createSystemOneEngine(client));
```

結合テストでは，同じアダプタに偽の`fetch`を持つクライアントを渡す．

```ts
// 本物と同じアダプタに，偽のfetchを持つクライアントを渡す．
const engineWith = (requests: unknown[] = []) =>
  createSystemOneEngine(
    new TypeSafeClient({ baseURL: "http://ollama.test", apiKey: "test", fetch: fakeFetch(requests) }),
  );
```

すべてのテストが通り，本物の判断エンジンでもIteration 2と同じ表示になる．

```console
$ pnpm test
 Test Files  5 passed (5)
      Tests  18 passed (18)
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.87)
urgency: somewhat urgent (1.2)
refund: yes (0.52)
```

## 演習3-6：振り返る

1. アダプタのテストを書かずに，結合テストだけで変換を確かめた場合は，`scale`や`yesno`の変換の誤りを，どのテストが見つけるかを考える．結合テストは1つの問い合わせしか試さないので，変換の場合分けは単体テストで確かめるほうが確実である．
2. 判断エンジンを替えるときは，その判断エンジン用のアダプタを1つ作り，`main`で使うアダプタを替えるだけでよい．`triage`・`format`・`app`とそのテストは変わらない．
3. 確かめていることは同じである．Iteration 2のテストでは，`triage`の振る舞いと関係のない`type`や`legend`を書く必要があった．fakeを使うと，`triage`が使う値だけを書けばよい．
4. `yesno`を`score`として送る誤りは，`createSystemOneEngine`の質問の変換のテストで見つかる．`triage`のテストはfakeを使うので見つからない．それでよい．`triage`のテストは`triage`の誤りを，アダプタのテストはアダプタの誤りを見つける．
5. 解答例は設計書どおりに実装できた．`check-component.mjs`で照合すると，図と`import`は一致する．

## 演習3-7(発展)：判断エンジンへの問い合わせを記録するアダプタ

テストリストに次の項目を足す．

- `createTimingEngine`：包んだ判断エンジンの答えを，そのまま返す
- `createTimingEngine`：質問の数と，かかった時間を記録する

記録先を引数で受け取れるようにすると，テストでは記録された行を配列に集めて確かめられる．

```ts
// src/adapters/timing-engine.ts
export const createTimingEngine = (engine: DecisionEngine, log = (line: string) => console.error(line)): DecisionEngine => ({
  async decide<const Q extends Questions>(state: Readonly<Record<string, string>>, questions: Q): Promise<Answers<Q>> {
    const started = performance.now();
    const answers = await engine.decide(state, questions);
    log(`decide: ${Object.keys(questions).length} questions in ${Math.round(performance.now() - started)} ms`);
    return answers;
  },
});
```

```console
$ pnpm start "Refund not received" "Where is my refund?"
decide: 3 questions in 1009 ms
department: billing (0.87)
urgency: somewhat urgent (1.2)
refund: yes (0.52)
```

`createTimingEngine`は，`DecisionEngine`を受け取って`DecisionEngine`を返す．
同じポートを持つものを包んで機能を足す形を，デコレータと呼ぶ．

解答例のパッケージでは，この実装とテストを`発展(演習3-7)`で始まるコメントとして書いている．
新しく作る`src/adapters/timing-engine.ts`とそのテストは，`advanced/`に同じ相対パスで置いている．
コメントを外して動かす方法は，リポジトリの[README](../../../../README.md#発展課題)にある．
