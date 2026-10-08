# Iteration 2：緊急度を判定する．判断と表示を分ける(解説)

演習用の`docs/iteration-2.md`の各手順について，解答の例と考え方を説明する．

## 演習2-1：引き継いだパッケージを確かめる

Iteration 1の単体テスト6つと結合テスト2つが通る．

```console
$ pnpm test
 Test Files  3 passed (3)
      Tests  8 passed (8)
```

## 演習2-2：scoreの質問を試す

1. `Refund not received`の問い合わせの答えは，小数第4位に丸めると`probabilities`が`{"0":0.182,"1":0.2903,"2":0.3939,"3":0.1338}`，`score`が1.4796である．手で計算すると`0×0.182 + 1×0.2903 + 2×0.3939 + 3×0.1338 = 1.4795`で，丸めの誤差を除いて一致する．
2. `Production down`の問い合わせでは，`probabilities`が`{"0":0.0061,"1":0.013,"2":0.6127,"3":0.3683}`，`score`が2.3432になった．高い段階に確率が集まり，期待値も上がる．
3. `Refund not received`では，もっとも確率の高い段階は2(urgent)だが，期待値を四捨五入すると1(somewhat urgent)になる．not urgentとsomewhat urgentにも確率が分かれているので，期待値はもっとも確率の高い段階より低くなった．`Production down`では，どちらも2(urgent)で一致する．
4. 2段階にすると，小数第4位に丸めて`probabilities`が`{"0":0.21,"1":0.79}`，`score`が0.79になる．2段階の期待値は，`0×(lowの確率) + 1×(highの確率)`なので，highの確率と同じになる．

## 演習2-3：テストリストを書く

解答例のテストリストは[TESTLIST.md](../TESTLIST.md)である．
リファクタリングの項目と，緊急度の項目を分けて書いた．

- リファクタリングでは，テストを移すだけで，期待する表示は変えない．期待値を変えずに通ることが，振る舞いを変えていないことの確認になる．
- `formatDepartment`は，`ChoiceResponse`ではなく部署の名前と確率を受け取るようになる．Iteration 1の2つのテストのうち，「確率の分布から選ばれた部署の確率を取り出す」は`triage`の役目になるので，`triage`のテストに移した．
- 「質問を1回で送る」ことは，`triage`の単体テストで確かめる．送る質問を組み立てるのは`triage`だからである．結合テストでは，問い合わせが1回であることと，件名と本文を送ることだけを確かめる．
- `formatUrgency`は，段階の中の値(2.4387)，ちょうど中間の値(0.5)，両端(0と3)を試す．`Math.round`は0.5を1に丸めるので，中間は上の段階になる．

## 演習2-4：設計書を更新する

Iteration 1からの変更は次のとおりである．

| ファイル | 変更 | 理由 |
| --- | --- | --- |
| [01-context.md](../design/01-context.md)・[02-container.md](../design/02-container.md) | 説明の文に緊急度を足した | 判定するものが増えた |
| [03-component.md](../design/03-component.md) | `refund`・`department`を消し，`triage`・`format`を足した．判断エンジンとやりとりするのは`triage`だけであることを説明に書いた | モジュールの分け方を変えた |
| [04-code.md](../design/04-code.md) | 流れを3つの図に分けた(全体，`triage`の中，`formatTriage`の中)．`Ticket`・`Triage`・`urgencyLevels`・`ScoreResponse`を足した | 新しい型と関数 |
| [05-sequence.md](../design/05-sequence.md) | `triage`と`format`を描き入れた | 呼び出しの経路が変わった |

- `format`は，型`Triage`と段階の名前`urgencyLevels`を使うので，`triage`に依存する．依存の向きは`format`→`triage`で，`triage`は`format`を知らない．
- `format`はSDKに依存しない．Componentの図で，SDKへの矢印が`main`・`app`・`triage`からだけ出ていることが，それを表している．

## 演習2-5：テスト駆動で実装する

### モジュールを分け直す

1. `src/triage.ts`を作り，`Ticket`・`Triage`・`triage`を書く．部署と返金の質問は`department.ts`と`refund.ts`から移す．答えから部署の確率を取り出す処理(`?? 0`)も，`formatDepartment`から`triage`に移る．

   ```ts
   export const triage = async (client: TypeSafeClient, ticket: Ticket): Promise<Triage> => {
     const { answers } = await client.systemOne({
       state: { subject: ticket.subject, body: ticket.body },
       questions: { department: departmentQuestion, refund: refundQuestion },
     });
     const department = answers.department;
     return {
       department: department.choice,
       // 選ばれた部署は必ずprobabilitiesのキーにあるが，型の上では見つからない場合もありうるので0とする．
       departmentProbability: department.probabilities[department.choice] ?? 0,
       refundProbability: answers.refund.noul,
     };
   };
   ```

2. `src/format.ts`を作り，`formatDepartment`(部署の名前と確率を受け取る形)・`formatRefund`・`formatTriage`を書く．
3. `run`を，`triage`と`formatTriage`を呼ぶだけにする．

   ```ts
   export const run = async (args: string[], client: TypeSafeClient): Promise<RunResult> => {
     const [subject, body] = args;
     if (subject === undefined || body === undefined) return { code: 2, output: usage };
     return { code: 0, output: formatTriage(await triage(client, { subject, body })) };
   };
   ```

4. テストを`format.test.ts`と`triage.test.ts`に移す．`triage`のテストでは，Iteration 1の結合テストと同じ偽の`fetch`を使う．答えを引数で受け取る形にして，テストごとに違う答えを返せるようにした．

   ```ts
   const fakeFetch = (answers: object, requests: unknown[]) => async (_url: string, init?: RequestInit) => {
     requests.push(JSON.parse(String(init?.body)));
     return Response.json({ model: "tev1:0.8b", answers, usage: { input_tokens: 120, output_tokens: 0 } });
   };
   ```

5. `src/refund.ts`・`src/department.ts`とそのテストを消す．期待する表示を変えずに，すべてのテストが通る．

   ```console
   $ pnpm test
    Test Files  3 passed (3)
         Tests  10 passed (10)
   ```

### `formatUrgency`：期待値にもっとも近い段階の名前と，期待値を表示する

```ts
describe("formatUrgency", () => {
  test("期待値にもっとも近い段階の名前と，期待値を表示する", () => {
    expect(formatUrgency(2.4387)).toBe("urgency: urgent (2.4)");
  });
});
```

`throw new Error("TODO")`だけの`formatUrgency`でRedを確かめ，仮実装(`return "urgency: urgent (2.4)"`)で通す．

### `formatUrgency`：期待値が段階のちょうど中間なら，上の段階にする

```ts
  test("期待値が段階のちょうど中間なら，上の段階にする", () => {
    expect(formatUrgency(0.5)).toBe("urgency: somewhat urgent (0.5)");
  });
```

```console
AssertionError: expected 'urgency: urgent (2.4)' to be 'urgency: somewhat urgent (0.5)' // Object.is equality
```

段階の名前は，緊急度の質問の`criteria`と同じ配列から取り出したい．
`triage.ts`に段階の配列を`urgencyLevels`として定義し，質問と表示の両方で使う．

```ts
// src/triage.ts
/** 緊急度の段階．添字が段階の番号(0がもっとも低い)である． */
export const urgencyLevels = ["not urgent", "somewhat urgent", "urgent", "critical"] as const;

/** 緊急度を尋ねる，段階評価の質問． */
const urgencyQuestion: ScoreQuestion = {
  type: "score",
  instructions: "How urgent is this ticket?",
  criteria: urgencyLevels,
};
```

```ts
// src/format.ts
export const formatUrgency = (score: number): string => {
  const level = urgencyLevels[Math.round(score)];
  return `urgency: ${level} (${score.toFixed(1)})`;
};
```

### `formatUrgency`：期待値が0なら最も低い段階，3なら最も高い段階にする

```ts
  test("期待値が0なら最も低い段階，3なら最も高い段階にする", () => {
    expect(formatUrgency(0)).toBe("urgency: not urgent (0.0)");
    expect(formatUrgency(3)).toBe("urgency: critical (3.0)");
  });
```

書いた時点で通る．両端の値でも，配列の範囲に収まることを確かめる例として残した．

### `triage`：3つの質問を1回で送る．緊急度の期待値も取り出す

`triage`のテストの，送る質問と取り出す結果に緊急度を足す．

```ts
    expect(result).toEqual({
      department: "support",
      departmentProbability: 0.8427,
      urgency: 1.6092,
      refundProbability: 0.08,
    });
```

```console
 FAIL  |unit| test/unit/triage.test.ts > triage > 問い合わせと質問を1回で送る
- Expected
+ Received
-     "urgency": {
-       "criteria": [
-         "not urgent",
-         "somewhat urgent",
-         "urgent",
-         "critical",
-       ],
-       "instructions": "How urgent is this ticket?",
-       "type": "score",
-     },
 FAIL  |unit| test/unit/triage.test.ts > triage > 選ばれた部署と，その部署の確率・緊急度の期待値・返金の確率を取り出す
-   "urgency": 1.6092,
```

`Triage`に`urgency`を足し，質問に`urgency`を足して，答えの`score`を取り出す．
テストは通るが，型検査は`Triage`を作っている別の場所を指摘する．

```console
$ pnpm typecheck
test/unit/format.test.ts(46,25): error TS2345: Argument of type '{ department: string; departmentProbability: number; refundProbability: number; }' is not assignable to parameter of type 'Triage'.
  Property 'urgency' is missing in type '{ department: string; departmentProbability: number; refundProbability: number; }' but required in type 'Triage'.
```

### `formatTriage`：部署・緊急度・返金の判定を，この順に表示する

型検査が指摘した`formatTriage`のテストに，緊急度を足す．

```ts
  test("部署・緊急度・返金の判定を，この順に1項目1行で表示する", () => {
    const triage = { department: "billing", departmentProbability: 0.7253, urgency: 1.4061, refundProbability: 0.8631 };
    expect(formatTriage(triage)).toBe("department: billing (0.73)\nurgency: somewhat urgent (1.4)\nrefund: yes (0.86)");
  });
```

```console
- Expected
+ Received

  department: billing (0.73)
- urgency: somewhat urgent (1.4)
  refund: yes (0.86)
```

`formatTriage`の行の配列に，`formatUrgency(triage.urgency)`を足す．

### `run`：表示を3行に変える

ここで結合テストが失敗する．偽の`fetch`が緊急度の答えを返さないからである．

```console
 FAIL  |integration| test/integration/app.test.ts > run > 件名と本文を判断エンジンに送り，担当部署と返金の判定を表示する
TypeError: Cannot read properties of undefined (reading 'score')
 ❯ triage src/triage.ts:58:30
```

偽の`fetch`の答えに緊急度を足し，期待する表示を3行にする．
送る質問の中身は`triage`の単体テストで確かめているので，結合テストでは件名と本文を送ることだけを確かめるようにした．

```ts
    expect(result).toEqual({
      code: 0,
      output: "department: billing (0.73)\nurgency: somewhat urgent (1.4)\nrefund: yes (0.86)",
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ state: { subject: "Refund not received", body: "Where is my refund?" } });
```

すべてのテストが通る．

```console
$ pnpm test
 Test Files  3 passed (3)
      Tests  13 passed (13)
```

本物の判断エンジンで実行する．

```console
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.87)
urgency: somewhat urgent (1.2)
refund: yes (0.52)
$ pnpm start "Login problem" "I cannot log in since yesterday."
department: support (1.00)
urgency: urgent (1.6)
refund: no (0.11)
$ pnpm start "Production down" "Since the last update the app crashes on login. Our whole company cannot work."
department: support (1.00)
urgency: urgent (2.3)
refund: no (0.27)
```

## 演習2-6：振り返る

1. リファクタリングの項目を書かずに，いきなり緊急度から始めた場合は，モジュールを分ける前と後のどちらで緊急度を足したかを振り返る．分ける前に足すと，`run`の中の処理が3つずつ並び，分けるときに動かすものが増える．
2. Iteration 1の`department`のテストは，`type`・`confidence`・`probabilities`を持つ答えのオブジェクトを作る必要があった．`format`のテストは，部署の名前と確率の2つの値を渡すだけで書ける．
3. 質問の文は`triage.ts`，表示の書式は`format.ts`だけを変えればよい．
4. 期待値は，中間の度合いを表せる．一方，もっとも確率の高い段階は，「どれか1つを選ぶなら」の答えである．サポートの担当者が対応の順番を決めるなら，期待値で並べると，同じ段階の中でも細かく順位が付く．
5. 解答例は設計書どおりに実装できた．`formatUrgency`は，`format.ts`の中で`formatRefund`より前に置いた．表示する順(部署・緊急度・返金)に関数を並べると，読みやすい．

## 演習2-7(発展)：もっとも確率の高い段階も表示する

テストリストに次の項目を足す．

- `triage`：もっとも確率の高い緊急度の段階の番号を取り出す
- `formatUrgency`：もっとも確率の高い段階の名前を添える
- 既存の`formatUrgency`・`formatTriage`のテストと，結合テストの期待値を変える

```ts
// src/triage.ts(Triageに足す)
  /** もっとも確率の高い緊急度の段階の番号． */
  urgencyMostLikely: number;
```

```ts
// src/triage.ts(triageの戻り値に足す)
    urgencyMostLikely: Number(
      Object.entries(answers.urgency.probabilities).reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0],
    ),
```

```ts
// src/format.ts
export const formatUrgency = (score: number, mostLikely: number): string => {
  const level = urgencyLevels[Math.round(score)];
  return `urgency: ${level} (${score.toFixed(1)}, most likely: ${urgencyLevels[mostLikely]})`;
};
```

```console
$ pnpm start "Login problem" "I cannot log in since yesterday."
department: support (1.00)
urgency: urgent (1.6, most likely: somewhat urgent)
refund: no (0.11)
$ pnpm start "Production down" "Since the last update the app crashes on login. Our whole company cannot work."
department: support (1.00)
urgency: urgent (2.3, most likely: urgent)
refund: no (0.27)
```

`probabilities`のキーは文字列(`"0"`〜`"3"`)なので，`Number`で番号に戻す．
`reduce`で，確率がもっとも大きい組を1つ残す．

解答例のパッケージでは，この実装とテストを`発展(演習2-7)`で始まるコメントとして書いている．
コメントを外して動かす方法は，リポジトリの[README](../../../../README.md#発展課題)にある．
