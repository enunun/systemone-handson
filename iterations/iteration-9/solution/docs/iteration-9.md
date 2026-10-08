# Iteration 9：評価の記録を残し，指標で読む(解説)

演習用の`docs/iteration-9.md`の各手順について，解答の例と考え方を説明する．

## 演習9-1：引き継いだパッケージを確かめる

Iteration 8の71のテストが通る．
Iteration 8のコードは，`refund`と`urgency`を読まずに飛ばすので，`data/dev.jsonl`もそのまま評価できる．

```console
$ pnpm start eval data/dev.jsonl
accuracy: 0.93 (auto-routed 27 / 30), review rate: 0.10

actual \ predicted   billing   support     sales
billing                   10         1         0
support                    0        11         0
sales                      0         2         6
```

正解の付け方で迷いやすいのは，次のような問い合わせである．

- `Overcharged`(`I downgraded last month but I am still paying the old price.`)：払いすぎた分を返してほしいと読めば返金あり，料金を直してほしいと読めば返金なしになる．解答例では返金ありとした．
- `Double charge`：二重に請求された分は返してほしいはずなので，返金ありとした．本文に「refund」という語はない．
- 緊急度：同じ「ログインできない」でも，仕事が止まっているかで段階が変わる．本文に書かれていることだけで決めた．

正解は人が決めるので，評価の結果は，正解の付け方にも左右される．

## 演習9-2：評価の指標を学ぶ

1. 混同行列から求めると，次のとおりである．

   | 部署 | 適合率 | 再現率 |
   | --- | --- | --- |
   | billing | 10 / 10 = 1.00 | 10 / 11 = 0.91 |
   | support | 11 / 14 = 0.79 | 11 / 11 = 1.00 |
   | sales | 6 / 6 = 1.00 | 6 / 8 = 0.75 |

   supportと判定したものに，ほかの部署の問い合わせが3件混ざっている．
2. 0.6の誤りは0.36，0.95の誤りは0.9025を足す．自信を持って外した誤りほど，Brierスコアを大きく悪くする．

   ```console
   > (0.6 - 0) ** 2
   0.36
   > (0.95 - 0) ** 2
   0.9025
   ```

3. 平均は1560ミリ秒，中央値は730ミリ秒，95パーセンタイルは9000ミリ秒である．ふだんの速さに近いのは中央値である．1件だけの遅い値が，平均を2倍に押し上げている．

   ```console
   > const times = [800, 700, 750, 720, 690, 710, 730, 760, 9000, 740]
   undefined
   > times.reduce((sum, t) => sum + t, 0) / times.length
   1560
   > const sorted = times.toSorted((a, b) => a - b)
   undefined
   > sorted[Math.ceil(0.5 * sorted.length) - 1]
   730
   > sorted[Math.ceil(0.95 * sorted.length) - 1]
   9000
   ```

4. `timer.ts`は200前後を表示する．`setTimeout`は，指定した時間より少し遅れて呼ばれることがある．`write.ts`は，1回目の`writeFile`が`ENOENT`で失敗し，`mkdir`のあとで書ける．

## 演習9-3：テストリストを書く

解答例のテストリストは[TESTLIST.md](../TESTLIST.md)である．

- 正解の読み方が変わるので，`parseLabeledTickets`のテストの期待値と，結合テストの評価用のファイルを先に直した．読めない行のメッセージも変わる．
- `formatRecords`で書いた記録を`parseRecords`で読み戻すテストは，書き方と読み方を一度に確かめる．
- 指標のテストには，手で計算できる4件の記録を使う．

  | 正解の部署 | 判定 | 返金の正解 | 返金の確率 | 緊急度の正解 | 期待値 | 時間 |
  | --- | --- | --- | --- | --- | --- | --- |
  | billing | billing | はい | 0.9 | 2 | 1.5 | 100 |
  | billing | support | いいえ | 0.6 | 1 | 1 | 300 |
  | support | support | いいえ | 0.2 | 0 | 1 | 200 |
  | sales | support | いいえ | 0.1 | 3 | 2 | 400 |

  salesと判定したものがないので，salesの適合率は求められない(`undefined`)．返金の確率0.6の誤りが1件あるので，正解率は3/4になる．
- 時間は毎回変わるので，`eval --out`の結合テストでは，`elapsedMs`が0以上の数であることだけを確かめる．`report`の結合テストでは，所要時間の行を正規表現で確かめ，ほかの行は値まで確かめる．
- `report`が判断エンジンに尋ねないことは，必ず失敗する`fetch`を持つ判断エンジンを渡して確かめる．尋ねれば，テストは失敗する．

## 演習9-4：設計書を更新する

| ファイル | 変更 | 理由 |
| --- | --- | --- |
| [02-container.md](../design/02-container.md) | 評価用のファイルの説明を直し，評価の記録を足した．`triage eval`が1件ずつ送ることを書いた | データの置き場所が増え，送り方が変わった |
| [03-component.md](../design/03-component.md) | `records`と`metrics`を足した | 新しいモジュール |
| [04-code.md](../design/04-code.md) | `runEval`に記録を，`runReport`の流れと指標の表を足した．主な型に`EvalRecord`・`Report`などを足した | 新しい流れと型 |
| [05-sequence.md](../design/05-sequence.md) | `eval --out`と`report`の図を足した | 新しい使い方 |

`records`は，記録の形(`EvalRecord`)と読み書きだけを受け持つ．
`metrics`は，記録から数を計算するだけで，表示の書式は`format`に任せる．
`metrics`は`evaluate`の`evaluate`を使い，部署の正解率をIteration 7と同じ求め方で出す．
`records`と`metrics`はアプリの中心にあり，ファイルや判断エンジンには依存しない．

## 演習9-5：テスト駆動で実装する

### 正解の読み方

`readLabeledTicket`に，`refund`と`urgency`の確かめを足した．
`urgency`は，`Number.isInteger`で整数かを確かめ，`urgencyLevels`の添字の範囲に入っているかを見る．
`readLabeledTicket`は，記録を読むときにも使うので，`export`した．

```ts
export const readLabeledTicket = (value: unknown): LabeledTicket | undefined => {
  if (!isTicket(value)) return undefined;
  const { department, refund, urgency } = value as unknown as Record<string, unknown>;
  if (typeof department !== "string" || !departmentNames.includes(department)) return undefined;
  if (typeof refund !== "boolean") return undefined;
  if (!Number.isInteger(urgency) || (urgency as number) < 0 || (urgency as number) >= urgencyLevels.length) {
    return undefined;
  }
  return { subject: value.subject, body: value.body, department, refund, urgency: urgency as number };
};
```

### `records`

最初のテストは，`formatRecords`である．モジュールがないので，テストの読み込みで失敗する．

```console
Error: Cannot find module '../../src/records.ts' imported from …/test/unit/records.test.ts
```

`formatRecords`は，記録ごとに`JSON.stringify`して改行を付ける．
`parseRecords`は，Iteration 7で作った`parseJsonLines`に，1行の読み方(`readRecord`)を渡す．
`readRecord`は，`ticket`を`readLabeledTicket`で，`result`を`isTriage`で確かめる．

```ts
export const parseRecords = (text: string): { records: EvalRecord[]; errors: string[] } => {
  const { items, errors } = parseJsonLines(text, readRecord, "ticket, result and elapsedMs");
  return { records: items, errors };
};
```

### `metrics`

指標の関数は，1つずつRed→Greenにした．
割る数が0のときに`undefined`を返す`ratio`と，平均を返す`mean`を最初に作り，各関数で使った．

```ts
const ratio = (part: number, whole: number): number | undefined => (whole === 0 ? undefined : part / whole);
```

`percentile`を，最初は`Math.floor((p / 100) * sorted.length)`番目(0から数える)とした．
4件の中央値で，2番目に小さい200ではなく，3番目の300が返った．

```console
 FAIL  |unit| test/unit/metrics.test.ts > percentile > 小さい順に並べて，p%の位置にある値を返す
AssertionError: expected 300 to be 200 // Object.is equality

- Expected
+ Received

- 200
+ 300
```

最近順位法の「`Math.ceil(p / 100 × 件数)`番目(1から数える)」を，0から数える添字に直した．
pが0のときに添字が-1にならないように，`Math.max`で0以上にした．

```ts
export const percentile = (values: readonly number[], p: number): number | undefined => {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.max(Math.ceil((p / 100) * sorted.length) - 1, 0)];
};
```

値がないときは，`sorted[0]`が`undefined`になるので，そのまま`undefined`を返す．

### `eval --out`と`report`

`runEval`は，`triage`の前後の`performance.now()`の差を，丸めて`elapsedMs`にした．
同時に送る数は`evalConcurrency`(1)にした．

```ts
const records = await mapWithConcurrency(tickets, evalConcurrency, async (ticket): Promise<EvalRecord> => {
  const start = performance.now();
  const result = await triage(engine, ticket, options);
  return { ticket, result, elapsedMs: Math.round(performance.now() - start) };
});
```

記録を書く処理(`writeRecords`)は，ディレクトリを作ってから書き，失敗したらメッセージを返す．
`runReport`は，ファイルを読んで`parseRecords`・`buildReport`・`formatReport`の順に呼ぶだけで，`engine`を受け取らない．

```console
$ pnpm test
 Test Files  14 passed (14)
      Tests  91 passed (91)
```

本物の判断エンジンで，2つのデータの記録を取る．

```console
$ pnpm start eval --out results/dev.jsonl data/dev.jsonl
accuracy: 0.93 (auto-routed 27 / 30), review rate: 0.10

actual \ predicted   billing   support     sales
billing                   10         1         0
support                    0        11         0
sales                      0         2         6

wrote 30 records to results/dev.jsonl
$ pnpm start report results/dev.jsonl
accuracy: 0.93 (auto-routed 27 / 30), review rate: 0.10

department  precision  recall
billing          1.00    0.91
support          0.79    1.00
sales            1.00    0.75

refund accuracy: 0.93, brier score: 0.068
urgency mean absolute error: 0.82
latency median: 696 ms, p95: 819 ms
$ pnpm start eval --out results/test.jsonl data/test.jsonl
accuracy: 0.79 (auto-routed 29 / 30), review rate: 0.03

actual \ predicted   billing   support     sales
billing                    8         1         1
support                    0        10         0
sales                      1         3         6

wrote 30 records to results/test.jsonl
$ pnpm start report results/test.jsonl
accuracy: 0.79 (auto-routed 29 / 30), review rate: 0.03

department  precision  recall
billing          0.89    0.80
support          0.71    1.00
sales            0.86    0.60

refund accuracy: 1.00, brier score: 0.011
urgency mean absolute error: 0.77
latency median: 709 ms, p95: 771 ms
```

しきい値を変えても，判断エンジンには尋ねない．

```console
$ pnpm start report --min-confidence 0.5 results/dev.jsonl
accuracy: 0.96 (auto-routed 24 / 30), review rate: 0.20

department  precision  recall
billing          1.00    0.91
support          0.79    1.00
sales            1.00    0.75

refund accuracy: 0.93, brier score: 0.068
urgency mean absolute error: 0.82
latency median: 696 ms, p95: 819 ms
```

## 演習9-6：振り返る

1. 時間を確かめる項目がなかった場合は，`elapsedMs`のテストをどう書いたかを振り返る．毎回変わる値は，「0以上の数」のように性質で確かめる．
2. 部署の正解率は，devの0.93に対してtestは0.79である．salesの再現率は0.75と0.60，返金のBrierスコアは0.068と0.011である．質問を何も調整していないのに，データが違うだけでこれだけ差が出る．30件では，1件の違いで正解率が3ポイント動く．1つの評価の数を，小数第2位まで信じてはいけない．Iteration 10で質問を調整するときも，この差を頭に置く．
3. devでは，salesの問い合わせ2件と，billingの問い合わせ1件がsupportへ流れ出ている．そのため，supportの適合率が0.79に下がっている．testでも，salesから3件，billingから1件がsupportに流れている．`triage`は，迷うとsupportを選びやすい．
4. 返金の正解率は，確率の大きさを見ない．0.51で当たっても0.99で当たっても同じ1件である．Brierスコアは，確率の大きさは見るが，「はい」と「いいえ」のどちらの誤りが多いかは見ない．緊急度の平均絶対誤差は，ずれの大きさは見るが，高く見積もったか低く見積もったかを区別しない．1つの指標だけでは見落とすものがあるので，いくつかの指標を並べて読む．
5. 解答例は設計書どおりに実装できた．`evalConcurrency`は，設計書のCodeに`mapWithConcurrency(…, 1, triage)`と書いた．

## 演習9-7(発展)：F1スコアを表示する

テストリストに次の項目を足す．

- `precisionRecall`：適合率と再現率の調和平均(F1)も求める
- `precisionRecall`：適合率と再現率がどちらも0なら，F1はundefinedにする
- `formatReport`・`run report`：部署ごとの表にF1の列を足す

`PrecisionRecall`に`f1`を足し，`precisionRecall`で求める．
`ratio`を使うので，適合率と再現率がどちらも0なら，割る数が0になって`undefined`が返る．

```ts
const precision = ratio(correct, predicted.length);
const recall = ratio(correct, actual.length);
const f1 =
  precision === undefined || recall === undefined ? undefined : ratio(2 * precision * recall, precision + recall);
return [name, { precision, recall, f1 }];
```

```console
$ pnpm start report results/dev.jsonl
accuracy: 0.93 (auto-routed 27 / 30), review rate: 0.10

department  precision  recall    f1
billing          1.00    0.91  0.95
support          0.79    1.00  0.88
sales            1.00    0.75  0.86

refund accuracy: 0.93, brier score: 0.068
urgency mean absolute error: 0.82
latency median: 696 ms, p95: 819 ms
```

F1は，適合率と再現率のうち低いほうに引っ張られる．
1つの数で部署を比べたいときに使う．

解答例のパッケージでは，この実装とテストを`発展(演習9-7)`で始まるコメントとして書いている．
コメントを外して動かす方法は，リポジトリの[README](../../../../README.md#発展課題)にある．
