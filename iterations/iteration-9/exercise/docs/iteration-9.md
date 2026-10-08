# Iteration 9：評価の記録を残し，指標で読む(演習)

## このIterationで作るもの

Iteration 7では，部署の正解率と混同行列で精度を測った．
このIterationでは，返金と緊急度の正解も付けた評価用のデータで，3つの判定をそれぞれに合った指標で測る．
評価の結果は1件ずつ記録し，判断エンジンに尋ね直さなくても，記録から指標を計算できるようにする．

```console
$ pnpm start eval --out results/dev.jsonl data/dev.jsonl
accuracy: 0.96 (auto-routed 26 / 30), review rate: 0.13

actual \ predicted   billing   support     sales
billing                   10         1         0
support                    0        11         0
sales                      0         2         6

wrote 30 records to results/dev.jsonl
$ pnpm start report results/dev.jsonl
accuracy: 0.96 (auto-routed 26 / 30), review rate: 0.13

department  precision  recall
billing          1.00    0.91
support          0.79    1.00
sales            1.00    0.75

refund accuracy: 0.93, brier score: 0.066
urgency mean absolute error: 0.82
latency median: 1186 ms, p95: 1310 ms
```

作りながら，調整用と確かめ用のデータを分ける理由，適合率と再現率，Brierスコア，平均絶対誤差，パーセンタイル，評価の記録の残し方を学ぶ．
Iteration 10では，このIterationで作る記録と指標を使って，質問の文やモデルを替えた結果を比べる．

## 進め方

演習9-1から順に進める．
詰まったら，`../solution/docs/iteration-9.md`の同じ番号の節を読む．
コマンドは，このパッケージのディレクトリ(`iterations/iteration-9/exercise`)で実行する．

## 演習9-1：引き継いだパッケージを確かめる

1. テストを実行して型を検査する．Iteration 8の71のテストがすべて通ることを確かめる．
2. `.env`を作り，`pnpm start eval data/dev.jsonl`を実行する．`data/dev.jsonl`は，`data/labeled.jsonl`と同じ30件に，返金(`refund`)と緊急度(`urgency`)の正解を足したものである．
3. `data/dev.jsonl`と`data/test.jsonl`を開き，正解の付け方を読む．自分なら違う正解を付ける問い合わせはあるか．

## 演習9-2：評価の指標を学ぶ

[Iteration 9：評価の記録と指標](../../../../docs/systemone/iteration-9.md)を読む．
読みながら，`node`の対話モードで例を試す．

読み終えたら，次を試す．

1. 演習9-1の2の混同行列から，3つの部署の適合率と再現率を手で求める．
2. 返金の確率が0.6で正解が「いいえ」の問い合わせと，確率が0.95で正解が「いいえ」の問い合わせがある．正解率では，どちらも同じ1件の誤りである．Brierスコアに足される値は，それぞれいくつか．
3. 所要時間が`[800, 700, 750, 720, 690, 710, 730, 760, 9000, 740]`(ミリ秒)のとき，平均・中央値・95パーセンタイルを求める．どれが「ふだんの速さ」に近いか．
4. 資料の`timer.ts`と`write.ts`を`/tmp`に書いて実行し，結果を確かめる．

## 演習9-3：テストリストを書く

次の要求を読み，[TESTLIST.md](../TESTLIST.md)にテストリストを書く．

### 要求

- 評価用のデータは，1行に1件，`subject`・`body`と，3つの正解を持つJSONを書いたもの(JSON Lines)である．
  - `department`：billing・support・salesのどれか．
  - `refund`：`true`か`false`．
  - `urgency`：0から3の整数(緊急度の段階の番号)．
- 正解がそろっていない行は，`line 4: skipped (not a JSON object with subject, body and labels)`のように知らせて飛ばす．
- `triage eval`は，判断エンジンに1件ずつ問い合わせ，1件ごとにかかった時間(ミリ秒の整数)を測る．表示はIteration 7と同じである．
- `triage eval --out <ファイル>`で，1件ごとの評価の記録をJSON Linesで書く．1行に1件，`{"ticket": 正解の付いた問い合わせ, "result": 振り分けの結果(Triageの項目), "elapsedMs": かかった時間}`を書く．
  - 書く先のディレクトリがなければ作る．
  - 書いたら，評価の表示のあとに空の行を挟んで，`wrote 30 records to results/dev.jsonl`と表示する．
  - 書けなければ，`cannot write <ファイル>: <理由>`を表示して終了コード1で終わる．
- `triage report [--min-confidence <0-1>] <ファイル>`で，評価の記録を読んで次の指標を表示する．判断エンジンには尋ねない．書式は「このIterationで作るもの」の例のとおりである．
  - 1行目：部署の正解率・自動で振り分けた件数・人の確認に回る割合(`triage eval`と同じ)．しきい値は`--min-confidence`で指定し，指定しなければ0.3とする．
  - 部署ごとの適合率と再現率の表．人の確認に回すものも含めて，すべての記録で求める．
  - 返金の正解率(確率0.5以上を「はい」とする)とBrierスコア(小数第3位まで)．
  - 緊急度の平均絶対誤差(小数第2位まで)．
  - 所要時間の中央値と95パーセンタイル(最近順位法．ミリ秒の整数)．
  - 割る数が0になるなど，求められない値は`n/a`と表示する．
  - 読めない行は，`line 2: skipped (not a JSON object with ticket, result and elapsedMs)`のように知らせて飛ばす．
  - 判断エンジンの設定(`.env`)がなくても実行できる．記録のファイルが読めなければ，`cannot read <ファイル>: <理由>`を表示して終了コード1で終わる．
- `--out`は`eval`でだけ使える．使い方には，`triage eval`の行に`[--out <file>]`を足し，`triage report [--min-confidence <0-1>] <file>`の行を足す．
- `data/labeled.jsonl`は，`data/dev.jsonl`に置き換えたので消す．

### 作るもの

| モジュール | 名前 | 型 | 役割 |
| --- | --- | --- | --- |
| `src/evaluate.ts` | `LabeledTicket` | `refund: boolean`と`urgency: number`を足す | 正解の付いた問い合わせ． |
| `src/evaluate.ts` | `readLabeledTicket` | `(value: unknown) => LabeledTicket \| undefined` | JSONの値を正解の付いた問い合わせとして読む．記録を読むときにも使う． |
| `src/records.ts` | `EvalRecord` | `{ ticket: LabeledTicket; result: Triage; elapsedMs: number }` | 1件の評価の記録． |
| `src/records.ts` | `formatRecords` | `(records: readonly EvalRecord[]) => string` | 記録をJSON Linesにする． |
| `src/records.ts` | `parseRecords` | `(text: string) => { records: EvalRecord[]; errors: string[] }` | JSON Linesから記録を読む． |
| `src/records.ts` | `toLabeledResults` | `(records: readonly EvalRecord[]) => LabeledResult[]` | 記録を，Iteration 7の`evaluate`などに渡せる形にする． |
| `src/metrics.ts` | `precisionRecall` | `(results: readonly LabeledResult[]) => Record<string, PrecisionRecall>` | 部署ごとの適合率と再現率． |
| `src/metrics.ts` | `refundMetrics` | `(records: readonly EvalRecord[]) => RefundMetrics` | 返金の正解率とBrierスコア． |
| `src/metrics.ts` | `meanAbsoluteError` | `(records: readonly EvalRecord[]) => number \| undefined` | 緊急度の平均絶対誤差． |
| `src/metrics.ts` | `percentile` | `(values: readonly number[], p: number) => number \| undefined` | 最近順位法のパーセンタイル． |
| `src/metrics.ts` | `buildReport` | `(records: readonly EvalRecord[], minConfidence: number) => Report` | 指標をまとめる． |
| `src/format.ts` | `formatReport` | `(report: Report) => string` | 指標を表示する文字列にする． |
| `src/app.ts` | `EngineUnavailable` | `{ unavailable: string }` | 判断エンジンを使えない理由．設定が足りないときに，`main`が判断エンジンの代わりに`run`へ渡す． |
| `src/app.ts` | `run` | `(args: string[], engine: DecisionEngine \| EngineUnavailable) => Promise<RunResult>` | `eval --out`と`report`を読む．判断エンジンを使うコマンドで理由を渡されたら，理由を表示して終了コード1で終わる． |
| `src/main.ts` | (変える) | | 設定が足りなければ，`{ unavailable: 理由 }`を`run`に渡す． |

### 考えること

- 正解の読み方が変わると，既存のテストのどれの期待値が変わるか．
- 時間は毎回変わる．`eval --out`のテストでは，記録の`elapsedMs`をどう確かめるか．`report`のテストでは，時間をどう決めるか．
- 指標の関数のテストでは，手で計算できる件数の記録を作る．適合率・再現率・Brierスコア・平均絶対誤差の期待値を，その記録から手で求める．
- 「求められない値」になるのは，どの指標の，どんな場合か．
- `report`が判断エンジンに尋ねないことは，どう確かめられるか．
- Iteration 5から，`main`は設定が足りなければ`run`を呼ばずに終わっていた．設定がなくても`report`を実行するには，`main`と`run`の間で何を渡せばよいか．

## 演習9-4：設計書を更新する

- Container：評価用のファイルの説明を直し，評価の記録のファイルを足す．`triage eval`が1件ずつ送ることを書く．
- Component：`records`と`metrics`を足す．`records`と`metrics`が，どのモジュールに依存するかを考える．
- Code：`runEval`の流れに記録を，`runReport`の流れを足す．指標の求め方を表にする．主な型に`EvalRecord`と`Report`を足す．設定が足りないときに`main`が`run`へ渡すものを，`main`の流れに描く．
- シーケンス：`eval --out`で記録を書く流れと，`report`が記録だけを読む流れを描く．設定が足りないときの分岐を，`main`から`app`へ移す．

## 演習9-5：テスト駆動で実装する

- まず`LabeledTicket`に正解を足し，`parseLabeledTickets`のテストを直す．結合テストの評価用のファイルにも正解を足す．
- `records`は，`formatRecords`で書いたものを`parseRecords`で読み戻せることを確かめると，書き方と読み方を一度に確かめられる．
- `metrics`の関数は，1つずつRed→Greenにする．割り算の期待値は，`2 / 3`のように割り算で書く．
- `runEval`の`mapWithConcurrency`の同時に送る数を1にする．時間は，`triage`を呼ぶ前後の`performance.now()`の差で測る．
- `writeFile`の前に`mkdir(path.dirname(ファイル), { recursive: true })`でディレクトリを作る．
- `report`のテストでは，`run(["eval", "--out", …])`で記録を作ってから読むと，記録の形式を手で書かずに済む．
- 最後に，次を実行する．
  1. `pnpm start eval --out results/dev.jsonl data/dev.jsonl`と`pnpm start report results/dev.jsonl`で，使い方の例と同じ形の表示になることを確かめる．所要時間は，環境によって変わる．
  2. `data/test.jsonl`でも記録を取り，`report`で表示する．
  3. `pnpm start report --min-confidence 0.5 results/dev.jsonl`を実行し，判断エンジンに尋ね直さなくてもしきい値を変えられることを確かめる．

## 演習9-6：振り返る

1. 自分の`TESTLIST.md`と，解答例の[TESTLIST.md](../../solution/TESTLIST.md)を比べる．
2. `dev`と`test`の`report`を比べる．どの指標がどれくらい違うか．まだ質問を何も調整していないのに差が出ることから，30件の評価について何が言えるか．
3. 部署の適合率と再現率から，どの部署の問い合わせが，どの部署へ流れ出ているかを読み取る．混同行列と見比べる．
4. 返金の正解率とBrierスコアは，それぞれ何を見落とすか．緊急度の平均絶対誤差はどうか．
5. 設計書と実装を見比べる．違う形になったところがあれば，設計書を実装に合わせて直す．

## 演習9-7(発展)：F1スコアを表示する

部署ごとの表に，適合率と再現率の調和平均(F1スコア)の列を足す．
F1は`2 × 適合率 × 再現率 / (適合率 + 再現率)`で求める．適合率か再現率が求められないとき，両方とも0のときは`n/a`とする．

```console
$ pnpm start report results/dev.jsonl
accuracy: 0.96 (auto-routed 26 / 30), review rate: 0.13

department  precision  recall    f1
billing          1.00    0.91  0.95
support          0.79    1.00  0.88
sales            1.00    0.75  0.86

refund accuracy: 0.93, brier score: 0.066
urgency mean absolute error: 0.82
latency median: 1186 ms, p95: 1310 ms
```

発展課題の解答の一例は，解答例のパッケージ(`../solution`)に`発展(演習9-7)`で始まるコメントとして書いてある．
解説は`../solution/docs/iteration-9.md`の演習9-7にある．

発展課題でも，テストリストを書いたあとに設計書を更新してから実装し，実装したら設計書と見比べる．
