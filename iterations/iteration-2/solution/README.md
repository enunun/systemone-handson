# triage-solution-iteration-2(解答例)

Iteration 2の演習用パッケージ([../exercise/](../exercise/))を完成させた状態の解答例．

```console
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.87)
urgency: somewhat urgent (1.2)
refund: yes (0.52)
$ pnpm start "Production down" "Since the last update the app crashes on login. Our whole company cannot work."
department: support (1.00)
urgency: urgent (2.3)
refund: no (0.27)
```

## 見どころ

- [docs/iteration-2.md](docs/iteration-2.md)：演習の各手順の解説．リファクタリングの手順も説明する．
- [TESTLIST.md](TESTLIST.md)：テストリストの模範解答．
- [design/](design/)：設計書の模範解答．
- [src/triage.ts](src/triage.ts)：3つの質問と，答えを`Triage`にまとめる`triage`．
- [src/format.ts](src/format.ts)：`Triage`を表示する関数．

## ディレクトリ構成

```text
src/main.ts          実行ファイルの入口
src/app.ts           引数を読み，triageとformatをつなぐ(run)
src/triage.ts        質問と，答えのまとめ(Ticket，Triage，urgencyLevels，triage)
src/format.ts        表示(formatDepartment，formatUrgency，formatRefund，formatTriage)
test/unit/           単体テスト(triage.test.ts，format.test.ts)
test/integration/    結合テスト
TESTLIST.md          テストリストの模範解答
design/              設計書の模範解答
docs/iteration-2.md  演習の各手順の解説
```
