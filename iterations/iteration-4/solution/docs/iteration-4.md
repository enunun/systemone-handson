# Iteration 4：迷っている問い合わせを人の確認に回す(解説)

演習用の`docs/iteration-4.md`の各手順について，解答の例と考え方を説明する．

## 演習4-1：引き継いだパッケージを確かめる

Iteration 3の18のテストが通る．
2つの問い合わせの表示は次のとおりである．

```console
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.73)
urgency: somewhat urgent (1.4)
refund: yes (0.86)
$ pnpm start "Team plan" "We are 20 people and want to upgrade to the team plan. What does it cost?"
department: sales (0.44)
urgency: somewhat urgent (1.0)
refund: no (0.07)
```

部署の確率だけを見ると，0.73の`Refund not received`のほうが信用できそうに見える．
ただし，0.44が「3つのうちでは明らかに高い」のか「ほかとほとんど変わらない」のかは，確率1つからはわからない．

## 演習4-2：確信度を調べる

1. `Team plan`の答えは，`probabilities`が`{"billing":0.2642,"support":0.2963,"sales":0.4394}`，`confidence`が0.0229である．salesがもっとも高いが，ほかの2つとの差は小さい．
2. `node`の対話モードで計算すると，丸めると0.0229になる．

   ```console
   > const p = [0.4394, 0.2963, 0.2642]
   undefined
   > 1 - (-p.reduce((s, x) => s + x * Math.log(x), 0)) / Math.log(3)
   0.022934839558632736
   ```

3. 結果は次のとおりである．しきい値0.2では，4つのうち3つが人の確認に回る．

   | 問い合わせ | 選ばれた部署 | 部署の確率 | `confidence` | 部署は正しいか | 0.2で人の確認に回るか |
   | --- | --- | --- | --- | --- | --- |
   | `Invoice` | billing | 0.9238 | 0.7069 | 正しい | 回らない |
   | `Discount` | sales | 0.5024 | 0.072 | 正しい | 回る |
   | `Cancel` | billing | 0.4957 | 0.0613 | 正しい | 回る |
   | `Enterprise` | billing | 0.3985 | 0.0224 | 誤り(salesが正しい) | 回る |

   誤って`billing`とした`Enterprise`は，確信度がもっとも低く，人の確認に回る．
   一方で，部署が正しい`Discount`と`Cancel`も人の確認に回る．
   Layaの確信度は，全体として低い．そのため，しきい値0.2でも多くの問い合わせが人の確認に回る．

## 演習4-3：テストリストを書く

解答例のテストリストは[TESTLIST.md](../TESTLIST.md)である．

- しきい値の判定は，`triage`の単体テストで，下回る場合・ちょうどの場合・既定値の場合を確かめる．fakeの答えの確信度は0.5なので，しきい値を0.6と0.5にして試した．
- 既定値のテストでは，確信度を0.19にした答えを使い，しきい値を渡さずに呼ぶ．既定値が0.2なら人の確認に回り，もっと低い値なら回らないので，0.2であることを確かめられる．
- 印の付け方は，`formatDepartment`の単体テストで確かめる．
- 結合テストでは，既定のしきい値での印，`--min-confidence`での変更，引数の誤りの3つを確かめる．0から1の数でない例は，数でない値(`abc`)・範囲の上(`1.5`)・範囲の下(`-0.1`)を1つのテストにまとめた．

## 演習4-4：設計書を更新する

| ファイル | 変更 | 理由 |
| --- | --- | --- |
| [01-context.md](../design/01-context.md) | `triage`の説明に，人の確認に回す印を足した | 外から見える振る舞いが増えた |
| [03-component.md](../design/03-component.md) | `app`の説明と，`app`→`triage`の矢印の説明に`TriageOptions`を足した | 渡すものが増えた |
| [04-code.md](../design/04-code.md) | 全体の流れに`parseCommand`と使い方の条件を，`triage`の中に`needsReview`の分岐を足した．`TriageOptions`と`needsReview`を足し，しきい値の決めごとを書いた | 新しい型と分岐 |
| [05-sequence.md](../design/05-sequence.md) | `parseCommand`と，`triage`にしきい値を渡すところを足した | 呼び出しが変わった |

`parseArgs`は`node:`の組み込みモジュールなので，Componentの図には描かない．

## 演習4-5：テスト駆動で実装する

### `triage`：確信度で人の確認に回す

```ts
  test("部署の確信度がしきい値を下回れば，人の確認に回す", async () => {
    const result = await triage(createFakeEngine(answers), ticket, { minConfidence: 0.6 });

    expect(result.needsReview).toBe(true);
  });
```

テストを実行すると，`needsReview`がないので失敗する．型検査も，引数の数と`needsReview`を指摘する．

```console
$ pnpm typecheck
test/unit/triage.test.ts(62,68): error TS2554: Expected 2 arguments, but got 3.
test/unit/triage.test.ts(64,19): error TS2339: Property 'needsReview' does not exist on type 'Triage'.
```

`TriageOptions`を足し，3つ目の引数を分割代入で受け取る．

```ts
export interface TriageOptions {
  /** 部署の判定の確信度がこれを下回ったら，人の確認に回す．0から1． */
  minConfidence?: number;
}

/** しきい値を指定しないときに使う，部署の判定の確信度のしきい値． */
export const defaultMinConfidence = 0.2;

export const triage = async (
  engine: DecisionEngine,
  ticket: Ticket,
  { minConfidence = defaultMinConfidence }: TriageOptions = {},
): Promise<Triage> => {
  // …
  return {
    department: answers.department.value,
    departmentProbability: answers.department.probability,
    needsReview: answers.department.confidence < minConfidence,
    urgency: answers.urgency.value,
    refundProbability: answers.refund.probability,
  };
};
```

`<`で比べるので，しきい値ちょうどは人の確認に回らない．
`triage`のテストは通るが，型検査は`formatTriage`のテストの`Triage`に`needsReview`がないことを指摘する．

### `formatDepartment`：人の確認に回すなら，末尾に印を付ける

```ts
  test("人の確認に回すなら，末尾に印を付ける", () => {
    expect(formatDepartment("sales", 0.4394, true)).toBe("department: sales (0.44) -> needs review");
  });
```

```console
AssertionError: expected 'department: sales (0.44)' to be 'department: sales (0.44) -> needs rev…' // Object.is equality
```

```ts
export const formatDepartment = (department: string, probability: number, needsReview: boolean): string =>
  `department: ${department} (${probability.toFixed(2)})${needsReview ? " -> needs review" : ""}`;
```

`formatTriage`は，`triage.needsReview`を`formatDepartment`に渡す．

### `run`：オプションを読む

結合テストでは，偽の`fetch`が返す部署の確信度を変えられるようにした．

```ts
const answersWith = (departmentConfidence: number) => ({
  department: {
    type: "choice",
    choice: "billing",
    confidence: departmentConfidence,
    probabilities: { billing: 0.7253, support: 0.1994, sales: 0.0753 },
  },
  // urgencyとrefundは，これまでと同じ
});
```

オプションのテストを書くと，いまの`run`は`--min-confidence`を件名として読んでしまうので失敗する．

```console
 FAIL  |integration| test/integration/app.test.ts > run > --min-confidenceで，しきい値を変える
AssertionError: expected 'department: billing (0.73)' to be 'department: billing (0.73) -> needs r…' // Object.is equality
```

引数の解析を`parseCommand`に分ける．
読めない引数は`undefined`にして，`run`で使い方の表示に変える．

```ts
const parseCommand = (args: string[]): Command | undefined => {
  let parsed;
  try {
    parsed = parseArgs({ args, options: { "min-confidence": { type: "string" } }, allowPositionals: true });
  } catch {
    // 知らないオプションや，値のないオプションがあった．
    return undefined;
  }
  const [subject, body] = parsed.positionals;
  if (subject === undefined || body === undefined) return undefined;
  const value = parsed.values["min-confidence"];
  if (value === undefined) return { subject, body, options: {} };
  const minConfidence = Number(value);
  if (!(minConfidence >= 0 && minConfidence <= 1)) return undefined;
  return { subject, body, options: { minConfidence } };
};

export const run = async (args: string[], engine: DecisionEngine): Promise<RunResult> => {
  const command = parseCommand(args);
  if (command === undefined) return { code: 2, output: usage };
  const result = await triage(engine, { subject: command.subject, body: command.body }, command.options);
  return { code: 0, output: formatTriage(result) };
};
```

`!(minConfidence >= 0 && minConfidence <= 1)`は，`abc`から作った`NaN`も範囲外として扱う．
すべてのテストが通る．

```console
$ pnpm test
 Test Files  5 passed (5)
      Tests  26 passed (26)
```

本物の判断エンジンで実行する．

```console
$ pnpm start "Team plan" "We are 20 people and want to upgrade to the team plan. What does it cost?"
department: sales (0.44) -> needs review
urgency: somewhat urgent (1.0)
refund: no (0.07)
$ pnpm start "Hello" "I have a question about my account."
department: support (0.59) -> needs review
urgency: somewhat urgent (1.1)
refund: no (0.10)
$ pnpm start --min-confidence 0.1 "Hello" "I have a question about my account."
department: support (0.59)
urgency: somewhat urgent (1.1)
refund: no (0.10)
$ pnpm start --min-confidence 2 "Hello" "Hi"
usage: triage [--min-confidence <0-1>] "<subject>" "<body>"
```

## 演習4-6：振り返る

1. 境界ちょうどの項目がなかった場合は，`<`と`<=`を取り違えても通ってしまわないかを確かめる．
2. 人の確認に回った3つのうち，部署が正しかったものは2つ(`Discount`・`Cancel`)である．しきい値を0.05に下げると，確信度0.0613と0.072の2つは自動で振り分けられ，誤っていた`Enterprise`(0.0224)だけが人の確認に回る．ただし，4つの例だけで決めるのは危うい．Iteration 7で，もっと多くの問い合わせを使って測る．
3. `triage`が`process.argv`を読むと，テストのたびにプロセスの引数を書き換える必要がある．また，Iteration 6や8のように，コマンドライン以外から`triage`を使うときにも困る．設定は，入口(`app`)で読んで引数として渡す．
4. 解答例は設計書どおりに実装できた．引数の解析は，`run`の中に書くと長くなるので，設計の段階から`parseCommand`として分けて描いた．

## 演習4-7(発展)：確信度も表示する

テストリストに次の項目を足す．

- `triage`：部署の判定の確信度を取り出す
- `formatDepartment`：確信度を渡されたら，確率の後ろに表示する
- `formatTriage`：`showConfidence`が真なら，部署の行に確信度を表示する
- `run`：`--show-confidence`を付けると，部署の行に確信度を表示する
- 既存のテストのうち，`Triage`を作っているものに`departmentConfidence`を足す

`formatDepartment`は，確信度を省略できる4つ目の引数で受け取る．

```ts
export const formatDepartment = (
  department: string,
  probability: number,
  needsReview: boolean,
  confidence?: number,
): string => {
  const detail = confidence === undefined ? "" : `, confidence ${confidence.toFixed(2)}`;
  return `department: ${department} (${probability.toFixed(2)}${detail})${needsReview ? " -> needs review" : ""}`;
};
```

`parseCommand`では，`"show-confidence": { type: "boolean" }`を`options`に足し，`parsed.values["show-confidence"] ?? false`で読む．

```console
$ pnpm start --show-confidence "Team plan" "We are 20 people and want to upgrade to the team plan. What does it cost?"
department: sales (0.44, confidence 0.02) -> needs review
urgency: somewhat urgent (1.0)
refund: no (0.07)
$ pnpm start --show-confidence "Refund not received" "Where is my refund?"
department: billing (0.73, confidence 0.32)
urgency: somewhat urgent (1.4)
refund: yes (0.86)
```
