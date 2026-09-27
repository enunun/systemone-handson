# triage-solution-iteration-6(解答例)

Iteration 6の演習用パッケージ([../exercise/](../exercise/))を完成させた状態の解答例．

```console
$ pnpm start batch data/tickets.jsonl
line 21: skipped (not a JSON object with subject and body)
billing: 4, support: 6, sales: 0, needs review: 11
$ pnpm start batch --min-confidence 0.05 data/tickets.jsonl
line 21: skipped (not a JSON object with subject and body)
billing: 5, support: 9, sales: 3, needs review: 4
```

## 見どころ

- [docs/iteration-6.md](docs/iteration-6.md)：演習の各手順の解説．
- [TESTLIST.md](TESTLIST.md)：テストリストの模範解答．
- [design/](design/)：設計書の模範解答．シーケンス図に，同時に送る流れを描いた．
- [src/batch.ts](src/batch.ts)：`parseTickets`・`mapWithConcurrency`・`summarize`．
- [src/app.ts](src/app.ts)：サブコマンド(`batch`)の解析と，ファイルの読み込み．
- [test/integration/batch.test.ts](test/integration/batch.test.ts)：一時ディレクトリにファイルを作る結合テスト．

## ディレクトリ構成

```text
data/tickets.jsonl                問い合わせのサンプル
src/main.ts                       実行ファイルの入口(組み立ての場所)
src/app.ts                        引数を読み，triage・batch・formatをつなぐ(run，runBatch)
src/batch.ts                      まとめて振り分けるための部品
src/triage.ts                     質問と，答えのまとめ(departmentNamesを足した)
src/format.ts                     表示(formatSummaryを足した)
src/config.ts                     環境変数から設定を読む
src/ports/decision-engine.ts      DecisionEngineと，質問・答えの型
src/adapters/                     アダプタ
test/unit/                        単体テスト
test/integration/                 結合テスト(app.test.ts，batch.test.ts)
TESTLIST.md                       テストリストの模範解答
design/                           設計書の模範解答
docs/iteration-6.md               演習の各手順の解説
```
