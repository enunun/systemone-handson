# Iteration 7：ラベル付きデータで精度を測る(解説)

演習用の`docs/iteration-7.md`の各手順について，解答の例と考え方を説明する．

## 演習7-1：引き継いだパッケージを確かめる

Iteration 6の45のテストが通る．
`data/labeled.jsonl`は30件で，正解の部署はbillingが11件，supportが11件，salesが8件である．

## 演習7-2：評価を学ぶ

1. 5件を振り分けた結果は次のとおりである．

   ```console
   $ pnpm start "Double charge" "My card was charged twice for the same order."
   department: billing (0.99)
   urgency: somewhat urgent (1.2)
   refund: no (0.14)
   $ pnpm start "Demo" "Could we schedule a product demo for our team next week?"
   department: support (0.63)
   urgency: somewhat urgent (0.8)
   refund: no (0.02)
   $ pnpm start "Two-factor" "I lost my phone and cannot get the two-factor code."
   department: support (0.99)
   urgency: urgent (1.6)
   refund: no (0.21)
   $ pnpm start "Education" "Do you have special prices for universities?"
   department: sales (0.52) -> needs review
   urgency: somewhat urgent (0.9)
   refund: no (0.16)
   $ pnpm start "Cancel plan" "I want to cancel my plan at the end of this month."
   department: billing (0.56) -> needs review
   urgency: somewhat urgent (0.8)
   refund: no (0.05)
   ```

   正解はbilling・sales・support・sales・billingである．
   `Demo`は部署を誤ったのに，人の確認に回らなかった．
   `Education`と`Cancel plan`は正しいのに人の確認に回った．
   数件を見るだけでは，しきい値が妥当かを判断しにくい．

2. しきい値を上げると，確信度の低いものから人の確認に回る．このとき，人の確認に回る割合は下がらない．正解率は，確信度の低いものほど誤りやすいなら上がる．
3. 0件のうちの正解の割合は決められないので，「値がない」とする．0や1にすると，「すべて誤り」や「すべて正解」と区別できない．

## 演習7-3：テストリストを書く

解答例のテストリストは[TESTLIST.md](../TESTLIST.md)である．

- 先にリファクタリングの項目を置いた．`parseTickets`と`parseLabeledTickets`は，「行ごとにJSONを読み，確かめて，だめなら行番号を知らせる」という同じ流れを持つ．違いは「何を確かめるか」と「メッセージの説明」だけである．
- `evaluate`のテストでは，5件の組を作った．
  - 確信度が高い：正解1件．
  - 確信度が中くらい：誤り1件，正解1件．
  - 確信度が低い：誤り1件，正解1件．

  しきい値0.2では，3件を自動で振り分け，そのうち2件が正解になる．
- しきい値0(すべて自動)と，0.9(すべて人の確認)も試した．後者で正解率が`undefined`になる．
- 混同行列は，人の確認に回るものも含めることを確かめる．
- `sweep`は，しきい値の並びと，1つの行が`evaluate`と同じになることを確かめる．
- 結合テストの偽の`fetch`は，件名(A・B・C)で部署と確信度を決める．計算の結果を手で確かめられる件数にした．

## 演習7-4：設計書を更新する

| ファイル | 変更 | 理由 |
| --- | --- | --- |
| [01-context.md](../design/01-context.md)・[02-container.md](../design/02-container.md) | 評価を読むこと，評価用のファイルを足した | 使い方とデータが増えた |
| [03-component.md](../design/03-component.md) | `evaluate`を足した．`evaluate`は`batch`の`parseJsonLines`・`isTicket`を使う | 新しいモジュール |
| [04-code.md](../design/04-code.md) | `eval`の流れ・`runEval`の流れと，`LabeledTicket`・`Evaluation`・`ConfusionMatrix`，`Triage`の`departmentConfidence`を足した | 新しい型と関数 |
| [05-sequence.md](../design/05-sequence.md) | `triage eval`は`triage batch`と同じ流れで送ることを書いた | 新しい使い方 |

`evaluate`は，しきい値を変えて評価し直すので，`needsReview`ではなく`departmentConfidence`を使う．
`needsReview`は，振り分けたときのしきい値で決まった値なので，別のしきい値の評価には使えない．

## 演習7-5：テスト駆動で実装する

### JSON Linesの読み方を共通にする

`batch.ts`に，確かめ方を引数で受け取る`parseJsonLines`を作り，`parseTickets`はそれを使う形にした．

```ts
export const parseJsonLines = <T>(
  text: string,
  read: (value: unknown) => T | undefined,
  expected: string,
): { items: T[]; errors: string[] } => {
  const items: T[] = [];
  const errors: string[] = [];
  text.split("\n").forEach((line, index) => {
    if (line.trim() === "") return;
    let item: T | undefined;
    try {
      item = read(JSON.parse(line));
    } catch {
      item = undefined;
    }
    if (item === undefined) errors.push(`line ${index + 1}: skipped (not a JSON object with ${expected})`);
    else items.push(item);
  });
  return { items, errors };
};

export const parseTickets = (text: string): ParsedTickets => {
  const { items, errors } = parseJsonLines(
    text,
    (value) => (isTicket(value) ? { subject: value.subject, body: value.body } : undefined),
    "subject and body",
  );
  return { tickets: items, errors };
};
```

`parseTickets`のテストは変えずに通る．

### `departmentConfidence`

`Triage`に`departmentConfidence`を足すと，型検査が`Triage`を作っている既存のテストを指摘する．

```console
$ pnpm typecheck
test/unit/batch.test.ts(89,22): error TS2345: Argument of type '{ department: string; departmentProbability: number; needsReview: boolean; urgency: number; refundProbability: number; }[]' is not assignable to parameter of type 'readonly Triage[]'.
  Property 'departmentConfidence' is missing in type '{ department: string; departmentProbability: number; needsReview: boolean; urgency: number; refundProbability: number; }' but required in type 'Triage'.
test/unit/format.test.ts(56,25): error TS2345: Argument of type '{ department: string; departmentProbability: number; needsReview: boolean; urgency: number; refundProbability: number; }' is not assignable to parameter of type 'Triage'.
```

`triage`のテストの期待値にも`departmentConfidence`を足す．

### `evaluate`・`confusionMatrix`・`sweep`

```ts
const pair = (label: string, department: string, departmentConfidence: number) => ({
  label,
  result: { department, departmentProbability: 0.5, departmentConfidence, needsReview: false, urgency: 1, refundProbability: 0.1 },
});

const pairs = [
  pair("billing", "billing", 0.8),
  pair("billing", "support", 0.3),
  pair("support", "support", 0.5),
  pair("sales", "billing", 0.05),
  pair("sales", "sales", 0.02),
];

  test("しきい値以上の確信度のものを自動で振り分けたとして，件数・正解率・人の確認に回る割合を求める", () => {
    expect(evaluate(pairs, 0.2)).toEqual({ minConfidence: 0.2, total: 5, autoRouted: 3, correct: 2, accuracy: 2 / 3, reviewRate: 2 / 5 });
  });
```

```ts
export const evaluate = (results: readonly LabeledResult[], minConfidence: number): Evaluation => {
  const routed = results.filter(({ result }) => result.departmentConfidence >= minConfidence);
  const correct = routed.filter(({ label, result }) => result.department === label).length;
  return {
    minConfidence,
    total: results.length,
    autoRouted: routed.length,
    correct,
    accuracy: routed.length === 0 ? undefined : correct / routed.length,
    reviewRate: results.length === 0 ? 0 : (results.length - routed.length) / results.length,
  };
};
```

`evaluate`は，`triage`と同じく「確信度がしきい値を下回れば人の確認に回す」とみなす．
`sweep`は，`evaluate`をしきい値ごとに呼ぶだけである．

```ts
export const sweep = (results: readonly LabeledResult[]): Evaluation[] =>
  Array.from({ length: 11 }, (_, i) => evaluate(results, i / 10));
```

しきい値を`0.1`ずつ足して作ると，`0.30000000000000004`のような誤差が出る．
`i / 10`で作ると，`0.3`などの値になる．

### 表示

表の期待値を空白の数まで手で書くと，数え間違えやすい．
空白を1つ多く数えると，テストは次のように失敗する．

```console
- billing                     8         2         1
+ billing                    8         2         1
```

このときは，実装の出力を目で見て，列の右端が見出しの右端にそろっていることを確かめてから，期待値を直す．

### `run eval`

`parseCommand`に`eval`と`--sweep`を足し，ファイルを読む処理は`readText`として`runBatch`と共通にした．
すべてのテストが通る．

```console
$ pnpm test
 Test Files  10 passed (10)
      Tests  61 passed (61)
```

本物の判断エンジンで評価する．

```console
$ pnpm start eval data/labeled.jsonl
accuracy: 0.93 (auto-routed 27 / 30), review rate: 0.10

actual \ predicted   billing   support     sales
billing                   10         1         0
support                    0        11         0
sales                      0         2         6
$ pnpm start eval --sweep data/labeled.jsonl
min-confidence  auto-routed  accuracy  review rate
0.0                      30      0.90         0.00
0.1                      29      0.90         0.03
0.2                      27      0.93         0.10
0.3                      26      0.96         0.13
0.4                      26      0.96         0.13
0.5                      24      0.96         0.20
0.6                      23      1.00         0.23
0.7                      21      1.00         0.30
0.8                      18      1.00         0.40
0.9                      13      1.00         0.57
1.0                       0       n/a         1.00
```

## 演習7-6：振り返る

1. リファクタリングの項目がなかった場合は，`parseLabeledTickets`が`parseTickets`をまるごと写したものになっていないかを確かめる．
2. 「誤りは5%まで」(正解率0.95以上)なら，しきい値0.3を選ぶ．人の確認に回るのは13%である．Iteration 4で決めた既定値0.2では，正解率は0.93で，わずかに足りない．既定値を0.3に上げるか，誤りを7%まで許すかを決める．ただし30件では1件の違いで正解率が大きく変わるので，件数を増やして確かめるとよい．
3. salesの問い合わせを，supportと取り違えやすい(8件のうち2件)．salesの選択肢の説明(`new purchases, pricing and plan upgrades`)に，デモや見積もり，割引などの言葉を足すと変わる可能性がある．変えたら，同じデータで評価して比べる．
4. 同じ`data/labeled.jsonl`で`--sweep`の表を作り，同じ正解率を満たすしきい値と，そのときの人の確認に回る割合を比べる．確信度の尺度が違うので，しきい値そのものは比べられない．
5. 解答例は設計書どおりに実装できた．

## 演習7-7(発展)：部署ごとの再現率を表示する

テストリストに次の項目を足す．

- `formatConfusionMatrix`：各行の右に，その行の対角線の件数を行の合計で割った再現率を表示する
- `formatConfusionMatrix`：行の合計が0なら，再現率を`n/a`とする
- 既存の`formatConfusionMatrix`と結合テストの期待値に`recall`の列を足す

```ts
export const formatConfusionMatrix = (matrix: ConfusionMatrix): string => {
  const labels = Object.keys(matrix);
  const header = [
    "actual \\ predicted".padEnd(18),
    ...labels.map((label) => label.padStart(10)),
    "recall".padStart(10),
  ].join("");
  const rows = labels.map((label) => {
    const row = matrix[label] ?? {};
    const total = Object.values(row).reduce((sum, count) => sum + count, 0);
    const recall = total === 0 ? undefined : (row[label] ?? 0) / total;
    return [
      label.padEnd(18),
      ...labels.map((predicted) => String(row[predicted] ?? 0).padStart(10)),
      formatRate(recall).padStart(10),
    ].join("");
  });
  return [header, ...rows].join("\n");
};
```

```console
$ pnpm start eval data/labeled.jsonl
accuracy: 0.93 (auto-routed 27 / 30), review rate: 0.10

actual \ predicted   billing   support     sales    recall
billing                   10         1         0      0.91
support                    0        11         0      1.00
sales                      0         2         6      0.75
```

salesの再現率が0.75と低いことが，数で見える．

解答例のパッケージでは，この実装とテストを`発展(演習7-7)`で始まるコメントとして書いている．
コメントを外して動かす方法は，リポジトリの[README](../../../../README.md#発展課題)にある．
