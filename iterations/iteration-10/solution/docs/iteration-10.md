# Iteration 10：2つの設定を比べ，確信度の較正を確かめる(解説)

演習用の`docs/iteration-10.md`の各手順について，解答の例と考え方を説明する．

## 演習10-1：引き継いだパッケージを確かめる

Iteration 9の93のテストが通る．
比べる前の記録は，`results/dev-before.jsonl`と`results/test-before.jsonl`である．
比べる記録は，続けて取る．このハンズオンの開発環境では，Iteration 9で記録を取ったときより推論が遅く，所要時間の中央値は約2.8秒だった．

## 演習10-2：比べ方と較正を学ぶ

1. 0件と5件なら0.0625(16回に1回)，2件と7件なら約0.18(5回に1回ほど)である．後者は，食い違った9件のうち，片方に転ぶのが2件以下になる確率(0件・1件・2件の場合の数は1・9・36)を，両側の分だけ2倍した．

   ```console
   > 2 * (1 / 2) ** 5
   0.0625
   > 2 * (1 + 9 + 36) / 2 ** 9
   0.1796875
   ```

   9件のうち7件がBに転んでも，差がなければ5回に1回は起きる．差があると言うには，もっと件数が要る．
2. 確信度は，確率の分布の集まり方を表す値で，正しい確率ではない．`tev1:0.8b`の確信度は，正解率より低く出る．確信度0.3の問い合わせも8割は正しい．人の確認に回すかは，確信度の値の意味ではなく，Iteration 7のしきい値ごとの評価で決める．このデータでは，確信度0.2未満の1件は誤っている．0.2から0.4の5件にも誤りが1件ある．既定のしきい値0.3では，確信度0.3未満の5件が人の確認に回り，そのうち2件が誤っていた．
3. devcontainerを開いた直後は，`tev1:0.8b`だけが一覧にある．

## 演習10-3：テストリストを書く

解答例のテストリストは[TESTLIST.md](../TESTLIST.md)である．

- `compareRecords`のテストには，4件の組を作った．A正解とB誤り(A)・B正解とA誤り(B)・両方誤りで判定は別(C)・両方正解で判定は同じ(D)である．Cは食い違いに入るが，片方だけの正解には数えない．Dはどちらにも入らない．
- `calibration`は，区間の分け方を件数で確かめ，平均と正解率は1つの区間で確かめた．境目のテストは別の項目にした．0.2ちょうどと1ちょうどは，`Math.floor`の書き方を誤るとずれる境界である．
- `compare`の結合テストでは，件名で答えを決める偽の`fetch`を2つ用意した．2つ目は，件名Bの判定だけを正解のbillingに変える．同じ評価用のファイルで2回`eval --out`を実行して，2つの記録を作る．
- 説明文を直すと，`triage`のテストの「3つの質問を1回で尋ねる」で，送った質問の期待値が変わる．

## 演習10-4：設計書を更新する

| ファイル | 変更 | 理由 |
| --- | --- | --- |
| [02-container.md](../design/02-container.md) | `.env`の説明に待つ時間を足し，記録を`triage compare`も読むことを書いた | 設定と使い方が増えた |
| [03-component.md](../design/03-component.md) | `compare`を足した | 新しいモジュール |
| [04-code.md](../design/04-code.md) | `report --calibration`と`runCompare`の流れ，`SYSTEMONE_TIMEOUT_MS`の決めごとを足した．主な型に`CalibrationBin`・`Comparison`を足した | 新しい流れと型 |
| [05-sequence.md](../design/05-sequence.md) | `triage compare`の図を足した | 新しい使い方 |

`compare`は，2つの記録の突き合わせだけを受け持つ．
2つの記録の指標は，`app`が`metrics`の`buildReport`でそれぞれ求める．
`compare`が`metrics`を呼ぶ形にすると，`compare`のテストで指標の値まで考えることになる．

## 演習10-5：テスト駆動で実装する

### `compareRecords`

同じ位置の件名と本文を`every`で確かめてから，1件ずつ突き合わせる．

```ts
const sameTickets =
  a.length === b.length &&
  a.every(({ ticket }, i) => ticket.subject === b[i]?.ticket.subject && ticket.body === b[i]?.ticket.body);
if (!sameTickets) return { ok: false, message: "the records are not from the same tickets" };
```

`b[i]`の型は`EvalRecord | undefined`になる(`noUncheckedIndexedAccess`)．件数が同じことを先に確かめているので，突き合わせのところでは`as EvalRecord`とした．

### `calibration`

最初は，区間の番号を`Math.floor(確信度 × 区間の数)`とした．
確信度1の記録が，どの区間にも入らなかった．番号が5になり，0〜4のどれとも一致しないからである．

```console
 FAIL  |unit| test/unit/metrics.test.ts > calibration > 区間の下端ちょうどはその区間に，確信度1は最後の区間に入れる
AssertionError: expected [ +0, 1, +0, +0, +0 ] to deeply equal [ +0, 1, +0, +0, 1 ]

- Expected
+ Received

  [
    0,
    1,
    0,
    0,
-   1,
+   0,
  ]
```

`Math.min`で，番号を最後の区間までに抑えた．

```ts
const index = Math.min(Math.floor(result.departmentConfidence * binCount), binCount - 1);
```

### タイムアウト

`loadConfig`は，`SYSTEMONE_TIMEOUT_MS`が空でなければ`Number`で数にし，正の整数かを確かめる．
`main`は，`timeoutMs`があるときだけ`timeout`を渡す．

```ts
new TypeSafeClient({
  baseURL: config.baseURL,
  apiKey: config.apiKey,
  defaultModel: config.model,
  ...(config.timeoutMs === undefined ? {} : { timeout: config.timeoutMs }),
}),
```

```console
$ pnpm test
 Test Files  15 passed (15)
      Tests  111 passed (111)
```

### 説明文を直して比べる

`dev`の誤りは，`Payment method`(billingをsupport)，`Demo`と`Trial`(salesをsupport)の3件だった．
`Demo`はデモの依頼，`Trial`は契約前の試用の相談である．salesの説明文(`new purchases, pricing and plan upgrades`)には，どちらも書かれていない．
そこで，salesの説明文に見積もり・デモ・試用を足して，`new purchases, pricing, quotes, demos, trials and plan upgrades`にした．

```console
$ pnpm start compare results/dev-before.jsonl results/dev-after.jsonl
A: results/dev-before.jsonl
B: results/dev-after.jsonl

metric                             A       B
accuracy                        0.96    0.96
review rate                     0.13    0.07
refund accuracy                 0.93    0.93
refund brier score             0.068   0.066
urgency mean absolute error     0.82    0.87
latency median (ms)             2759    2753
latency p95 (ms)                3092    2993

department differs: 2
subject                 actual    A         B
Demo                    sales     support   sales
Trial                   sales     support   sales
only A correct: 0, only B correct: 2
```

狙った2件が直り，ほかの問い合わせの部署は変わらなかった．`Payment method`は直していない．
緊急度の平均絶対誤差は0.82から0.87に悪くなった．部署の説明文を変えると，同じリクエストのほかの質問の答えも変わる(Iteration 1)．

直し終えたので，`test`で一度だけ確かめる．

```console
$ pnpm start compare results/test-before.jsonl results/test-after.jsonl
A: results/test-before.jsonl
B: results/test-after.jsonl

metric                             A       B
accuracy                        0.85    0.96
review rate                     0.10    0.17
refund accuracy                 1.00    1.00
refund brier score             0.011   0.011
urgency mean absolute error     0.77    0.79
latency median (ms)             2806    2824
latency p95 (ms)                3067    3234

department differs: 3
subject                 actual    A         B
Price increase          billing   sales     billing
Enterprise demo         sales     support   sales
Startup program         sales     support   sales
only A correct: 0, only B correct: 3
```

`test`でも，デモ(`Enterprise demo`)や割引(`Startup program`)の問い合わせがsalesに直った．
説明文に足した言葉は，`dev`の2件だけでなく，同じ種類の問い合わせに効いている．

### `tev1:4b`と比べる

`tev1:4b`を取得し，`.env`を次のようにして`test`の記録を取った．1件に約15秒かかり，30件で約8分だった．

```sh
SYSTEMONE_MODEL=tev1:4b
SYSTEMONE_TIMEOUT_MS=120000
```

```console
$ pnpm start compare results/test-after.jsonl results/test-4b.jsonl
A: results/test-after.jsonl
B: results/test-4b.jsonl

metric                             A       B
accuracy                        0.96    0.93
review rate                     0.17    0.03
refund accuracy                 1.00    1.00
refund brier score             0.011   0.001
urgency mean absolute error     0.79    0.65
latency median (ms)             2824   15279
latency p95 (ms)                3234   18542

department differs: 2
subject                 actual    A         B
Price increase          billing   billing   sales
Compare plans           sales     support   sales
only A correct: 1, only B correct: 1
```

```console
$ pnpm start report --calibration results/test-after.jsonl
accuracy: 0.96 (auto-routed 25 / 30), review rate: 0.17

department  precision  recall
billing          0.90    0.90
support          0.83    1.00
sales            1.00    0.80

refund accuracy: 1.00, brier score: 0.011
urgency mean absolute error: 0.79
latency median: 2824 ms, p95: 3234 ms

confidence  tickets  mean confidence  accuracy
0.0-0.2           1             0.07      0.00
0.2-0.4           5             0.29      0.80
0.4-0.6           3             0.52      0.67
0.6-0.8           6             0.72      1.00
0.8-1.0          15             0.95      1.00
$ pnpm start report --calibration results/test-4b.jsonl
accuracy: 0.93 (auto-routed 29 / 30), review rate: 0.03

department  precision  recall
billing          0.89    0.80
support          0.91    1.00
sales            0.90    0.90

refund accuracy: 1.00, brier score: 0.001
urgency mean absolute error: 0.65
latency median: 15279 ms, p95: 18542 ms

confidence  tickets  mean confidence  accuracy
0.0-0.2           1             0.06      0.00
0.2-0.4           1             0.39      0.00
0.4-0.6           2             0.51      0.50
0.6-0.8           4             0.72      1.00
0.8-1.0          22             0.90      1.00
```

## 演習10-6：振り返る

1. 境目の項目がなかった場合は，確信度1の記録がどの区間に入るかを確かめる．
2. しきい値0.3では，`dev`が0.96(人の確認に回る割合7%)，`test`も0.96(17%)である．`test`は，同じ正解率を出すのに，人の確認に回す問い合わせが多い．すべてを自動で振り分けるしきい値0にそろえると，差がはっきりする．

   ```console
   $ pnpm start report --min-confidence 0 results/dev-after.jsonl
   accuracy: 0.97 (auto-routed 30 / 30), review rate: 0.00
   $ pnpm start report --min-confidence 0 results/test-after.jsonl
   accuracy: 0.90 (auto-routed 30 / 30), review rate: 0.00
   ```

   新しい問い合わせでの見積もりとして報告するのは，直すのに使わなかった`test`の値である．`dev`の値は，`dev`の誤りを見て直した結果なので，高めに出ている．
3. `test`では，Bだけが正解した件数が3件，Aだけが0件である．差がなくても4回に1回は起きる偏りなので，`test`だけでは効果があったと言い切れない．ただし，`dev`でも2件と0件で同じ向きに直った．`test`で食い違った3件は，どれもsalesの説明文に関わる問い合わせ(salesへ直ったデモと割引の相談，salesから外れた値上げの問い合わせ)だった．件数の偏りと，食い違った問い合わせの中身の両方から，効果があったと判断した．
4. しきい値0.3での正解率と人の確認に回る割合は，`tev1:0.8b`が0.96と17%，`tev1:4b`が0.93と3%である．`tev1:4b`は確信度が高く出やすいので，同じしきい値でも人の確認に回すものが少ない．しきい値0でそろえて比べると，正解率はどちらも0.90で，片方だけが正解した件数も1件ずつである．

   ```console
   $ pnpm start compare --min-confidence 0 results/test-after.jsonl results/test-4b.jsonl
   …
   metric                             A       B
   accuracy                        0.90    0.90
   review rate                     0.00    0.00
   …
   ```

   部署を当てる力には差が見えないが，`tev1:4b`は迷いが少なく，人の確認に回す件数を減らせる．返金のBrierスコア(0.011と0.001)と緊急度の平均絶対誤差(0.79と0.65)は`tev1:4b`がよい．一方，所要時間の中央値は2.8秒と15.3秒で約5倍，メモリは約1GBと約5GBである．人の確認に回す件数が問題にならないなら，`tev1:0.8b`を使う．人の確認の手間を減らしたいときや，緊急度で対応の順番を決めることが大事になったときは，`tev1:4b`を検討する．
5. どちらのモデルでも，確信度0.2未満の区間は1件で，その1件は誤っている．しきい値0.3では，`tev1:0.8b`は0.2〜0.4の区間の5件(うち誤り1件)も人の確認に回すが，`tev1:4b`はその区間が1件しかない．しきい値は，モデルごとに表を見て選び直す．`tev1:4b`は，確信度0.8以上に22件が集まり，その正解率は1.00である．どちらのモデルでもしきい値0.2はおおむね妥当だが，区間ごとの件数が少ないので，データを増やして確かめるとよい．
6. 解答例は設計書どおりに実装できた．

## 演習10-7(発展)：期待較正誤差を表示する

テストリストに次の項目を足す．

- `expectedCalibrationError`：区間ごとの確信度の平均と正解率の差を，件数の割合で重み付けして足す
- `expectedCalibrationError`：記録がなければundefinedを返す
- `run report --calibration`：表の下に期待較正誤差を表示する

`calibration`の結果から求める．記録のない区間は件数が0なので，重みも0になる．

```ts
export const expectedCalibrationError = (bins: readonly CalibrationBin[]): number | undefined => {
  const total = bins.reduce((sum, bin) => sum + bin.count, 0);
  if (total === 0) return undefined;
  return bins.reduce(
    (sum, bin) => sum + (bin.count / total) * Math.abs((bin.accuracy ?? 0) - (bin.meanConfidence ?? 0)),
    0,
  );
};
```

```console
$ pnpm start report --calibration results/test-after.jsonl
…
expected calibration error: 0.182
$ pnpm start report --calibration results/test-4b.jsonl
…
expected calibration error: 0.125
```

`tev1:4b`のほうが，確信度と正解率が近い．
どちらも0から離れているのは，確信度が正しい確率ではないからである(Iteration 4)．

解答例のパッケージでは，この実装とテストを`発展(演習10-7)`で始まるコメントとして書いている．
コメントを外して動かす方法は，リポジトリの[README](../../../../README.md#発展課題)にある．
