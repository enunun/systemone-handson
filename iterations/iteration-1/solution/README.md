# triage-solution-iteration-1(解答例)

Iteration 1の演習用パッケージ([../exercise/](../exercise/))を完成させた状態の解答例．

```console
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.82)
refund: yes (0.61)
$ pnpm start "Login problem" "I cannot log in since yesterday."
department: support (1.00)
refund: no (0.16)
```

## 見どころ

- [docs/iteration-1.md](docs/iteration-1.md)：演習の各手順の解説．
- [TESTLIST.md](TESTLIST.md)：テストリストの模範解答．
- [design/](design/)：設計書の模範解答．
- [src/department.ts](src/department.ts)：選択肢の説明文を付けた`choice`の質問と，答えの表示．
- [test/integration/app.test.ts](test/integration/app.test.ts)：2つの質問を1回で送ることを確かめる結合テスト．

## ディレクトリ構成

```text
src/main.ts          実行ファイルの入口
src/app.ts           引数を読み，判断エンジンに問い合わせる(run)
src/refund.ts        返金の質問と判定の表示(refundQuestion，formatRefund)
src/department.ts    担当部署の質問と判定の表示(departmentQuestion，formatDepartment)
test/unit/           単体テスト
test/integration/    結合テスト
TESTLIST.md          テストリストの模範解答
design/              設計書の模範解答
docs/iteration-1.md  演習の各手順の解説
```
