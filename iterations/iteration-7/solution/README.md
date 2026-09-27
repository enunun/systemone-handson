# triage-solution-iteration-7(解答例)

Iteration 7の演習用パッケージ([../exercise/](../exercise/))を完成させた状態の解答例．

```console
$ pnpm start eval --sweep data/labeled.jsonl
min-confidence  auto-routed  accuracy  review rate
0.0                      30      0.87         0.00
0.1                      25      0.92         0.17
0.2                      19      0.95         0.37
0.3                      17      1.00         0.43
0.4                      15      1.00         0.50
0.5                       8      1.00         0.73
0.6                       4      1.00         0.87
0.7                       3      1.00         0.90
0.8                       1      1.00         0.97
0.9                       1      1.00         0.97
1.0                       0       n/a         1.00
```

## 見どころ

- [docs/iteration-7.md](docs/iteration-7.md)：演習の各手順の解説．評価の結果からしきい値を選ぶ考え方も説明する．
- [TESTLIST.md](TESTLIST.md)：テストリストの模範解答．
- [design/](design/)：設計書の模範解答．
- [src/evaluate.ts](src/evaluate.ts)：`parseLabeledTickets`・`evaluate`・`confusionMatrix`・`sweep`．
- [src/batch.ts](src/batch.ts)：JSON Linesの読み方を`parseJsonLines`に分けた．

## ディレクトリ構成

```text
data/                             問い合わせのサンプルと，評価用のデータ
src/main.ts                       実行ファイルの入口(組み立ての場所)
src/app.ts                        引数を読み，triage・batch・evaluate・formatをつなぐ(run，runBatch，runEval)
src/evaluate.ts                   精度を測る
src/batch.ts                      まとめて振り分けるための部品(parseJsonLinesを足した)
src/triage.ts                     質問と，答えのまとめ(departmentConfidenceを足した)
src/format.ts                     表示(formatEvaluation，formatConfusionMatrix，formatSweepを足した)
src/config.ts                     環境変数から設定を読む
src/ports/，src/adapters/         ポートとアダプタ
test/unit/                        単体テスト
test/integration/                 結合テスト(app，batch，evaluate)
TESTLIST.md                       テストリストの模範解答
design/                           設計書の模範解答
docs/iteration-7.md               演習の各手順の解説
```
