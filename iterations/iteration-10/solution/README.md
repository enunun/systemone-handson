# triage-solution-iteration-10(解答例)

Iteration 10の演習用パッケージ([../exercise/](../exercise/))を完成させた状態の解答例．
このハンズオンで作る`triage`の完成形である．

```console
$ pnpm start compare results/test-after.jsonl data/records/test-tev1-4b.jsonl
A: results/test-after.jsonl
B: data/records/test-tev1-4b.jsonl

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

## 見どころ

- [docs/iteration-10.md](docs/iteration-10.md)：演習の各手順の解説．説明文の調整と，`tev1:4b`との比較の読み方．
- [TESTLIST.md](TESTLIST.md)：テストリストの模範解答．
- [design/](design/)：設計書の模範解答．
- [src/compare.ts](src/compare.ts)：2つの記録の突き合わせ．
- [src/metrics.ts](src/metrics.ts)：確信度の較正(`calibration`)を足した．
- [src/triage.ts](src/triage.ts)：salesの説明文を，調整用のデータの誤りから直した．

## ディレクトリ構成

```text
data/                             問い合わせのサンプル，評価用のデータ，tev1:4bの評価の記録
src/main.ts                       実行ファイルの入口(組み立ての場所)
src/app.ts                        コマンドライン(run，runBatch，runEval，runReport，runCompare，runServe)
src/adapters/http-api.ts          HTTP API(createApi)
src/adapters/systemone-engine.ts  /v1/systemoneを話す判断エンジンにつなぐ
src/adapters/fake-engine.ts       決まった答えを返す
src/ports/decision-engine.ts      DecisionEngineと，質問・答えの型
src/triage.ts                     質問と，答えのまとめ
src/batch.ts                      まとめて振り分けるための部品
src/evaluate.ts                   精度を測る
src/records.ts                    評価の記録
src/metrics.ts                    記録から指標を計算する
src/compare.ts                    2つの記録を突き合わせる
src/format.ts                     表示
src/config.ts                     環境変数から設定を読む
test/unit/                        単体テスト
test/integration/                 結合テスト(app，batch，evaluate，http-api，serve)
TESTLIST.md                       テストリストの模範解答
design/                           設計書の模範解答
docs/iteration-10.md              演習の各手順の解説
```
