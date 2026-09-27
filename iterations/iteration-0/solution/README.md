# triage-solution-iteration-0(解答例)

Iteration 0の演習用パッケージ([../exercise/](../exercise/))を完成させた状態の解答例．

```console
$ pnpm start "Refund not received" "Where is my refund?"
refund: yes (0.86)
$ pnpm start "Login problem" "I cannot log in since yesterday."
refund: no (0.08)
```

## 見どころ

- [docs/iteration-0.md](docs/iteration-0.md)：演習の各手順の解説．テストリストの考え方，設計書の描き方，テスト駆動で実装した順序を説明する．
- [TESTLIST.md](TESTLIST.md)：テストリストの模範解答．
- [design/](design/)：設計書の模範解答．
- [test/unit/refund.test.ts](test/unit/refund.test.ts)：`formatRefund`の単体テスト．
- [test/integration/app.test.ts](test/integration/app.test.ts)：偽の`fetch`を使った`run`の結合テスト．

## ディレクトリ構成

```text
package.json         パッケージの定義(スクリプトと依存パッケージ)
vitest.config.ts     テストの設定(単体テストと結合テストを分ける)
src/main.ts          実行ファイルの入口(判断エンジンのクライアントを作り，結果を表示する)
src/app.ts           引数を読み，判断エンジンに問い合わせる(run)
src/refund.ts        返金の質問と判定の表示(refundQuestion，formatRefund)
test/unit/           単体テスト
test/integration/    結合テスト
TESTLIST.md          テストリストの模範解答
design/              設計書の模範解答
docs/iteration-0.md  演習の各手順の解説
```
