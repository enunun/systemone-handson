# triage-solution-iteration-4(解答例)

Iteration 4の演習用パッケージ([../exercise/](../exercise/))を完成させた状態の解答例．

```console
$ pnpm start "Discount" "Do you offer a discount for non-profit organizations?"
department: support (0.53) -> needs review
urgency: somewhat urgent (0.9)
refund: no (0.17)
$ pnpm start --min-confidence 0.1 "Plan" "What is the difference between your plans?"
department: support (0.61)
urgency: somewhat urgent (0.8)
refund: no (0.08)
```

## 見どころ

- [docs/iteration-4.md](docs/iteration-4.md)：演習の各手順の解説．
- [TESTLIST.md](TESTLIST.md)：テストリストの模範解答．
- [design/](design/)：設計書の模範解答．
- [src/triage.ts](src/triage.ts)：`TriageOptions`と，確信度による`needsReview`．
- [src/app.ts](src/app.ts)：`parseArgs`によるオプションの解析(`parseCommand`)．

## ディレクトリ構成

```text
src/main.ts                       実行ファイルの入口
src/app.ts                        引数を読み，triageとformatをつなぐ(run，parseCommand)
src/triage.ts                     質問と，答えのまとめ(TriageOptions，defaultMinConfidence)
src/format.ts                     表示
src/ports/decision-engine.ts      DecisionEngineと，質問・答えの型
src/adapters/systemone-engine.ts  createSystemOneEngine
src/adapters/fake-engine.ts       createFakeEngine
test/unit/                        単体テスト
test/integration/                 結合テスト
TESTLIST.md                       テストリストの模範解答
design/                           設計書の模範解答
docs/iteration-4.md               演習の各手順の解説
```
