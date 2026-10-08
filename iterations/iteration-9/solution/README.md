# triage-solution-iteration-9(解答例)

Iteration 9の演習用パッケージ([../exercise/](../exercise/))を完成させた状態の解答例．

```console
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

## 見どころ

- [docs/iteration-9.md](docs/iteration-9.md)：演習の各手順の解説．
- [TESTLIST.md](TESTLIST.md)：テストリストの模範解答．
- [design/](design/)：設計書の模範解答．Codeに指標の求め方の表を足した．
- [src/records.ts](src/records.ts)：評価の記録の書き方と読み方．
- [src/metrics.ts](src/metrics.ts)：記録から指標を計算する．
- [test/unit/metrics.test.ts](test/unit/metrics.test.ts)：手で計算できる4件の記録で，指標を確かめる．

## ディレクトリ構成

```text
data/                             問い合わせのサンプルと，評価用のデータ(dev.jsonl・test.jsonl)
src/main.ts                       実行ファイルの入口(組み立ての場所)
src/app.ts                        コマンドライン(run，runBatch，runEval，runReport，runServe)
src/adapters/http-api.ts          HTTP API(createApi)
src/adapters/systemone-engine.ts  /v1/systemoneを話す判断エンジンにつなぐ
src/adapters/fake-engine.ts       決まった答えを返す
src/ports/decision-engine.ts      DecisionEngineと，質問・答えの型
src/triage.ts                     質問と，答えのまとめ
src/batch.ts                      まとめて振り分けるための部品
src/evaluate.ts                   精度を測る
src/records.ts                    評価の記録
src/metrics.ts                    記録から指標を計算する
src/format.ts                     表示
src/config.ts                     環境変数から設定を読む
test/unit/                        単体テスト
test/integration/                 結合テスト(app，batch，evaluate，http-api，serve)
TESTLIST.md                       テストリストの模範解答
design/                           設計書の模範解答
docs/iteration-9.md               演習の各手順の解説
```
