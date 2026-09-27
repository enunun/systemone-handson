# triage-iteration-2(演習用)

問い合わせを振り分けるプログラム`triage`を育てるハンズオンの，Iteration 2の演習用パッケージ．
Iteration 1の解答例と同じコード・テスト・設計書から始まる．

## このIterationで作るもの

問い合わせの緊急度を4段階(not urgent・somewhat urgent・urgent・critical)で判定し，2行目に表示する．
あわせて，質問と答えを扱う`triage`と，表示を扱う`format`にモジュールを分け直す．

```console
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.73)
urgency: somewhat urgent (1.4)
refund: yes (0.86)
```

作りながら，段階で評価する質問(`score`)と期待値，判断と表示を分ける設計，振る舞いを変えずに構造を変えるリファクタリングを学ぶ．

## 進め方

1. [docs/iteration-2.md](docs/iteration-2.md)を読み，演習2-1から順に進める．
2. テストリストは[TESTLIST.md](TESTLIST.md)に書く．
3. 詰まったら，解答例[../solution/](../solution/)の同じ番号の解説(`../solution/docs/iteration-2.md`)を読む．

コマンドは，このパッケージのディレクトリで実行する．

## ディレクトリ構成

```text
src/main.ts          実行ファイルの入口(変更しない)
src/app.ts           引数を読み，判断エンジンに問い合わせる
src/refund.ts        返金の質問と判定の表示(triageとformatに移す)
src/department.ts    担当部署の質問と判定の表示(triageとformatに移す)
test/unit/           単体テスト
test/integration/    結合テスト
TESTLIST.md          テストリスト(自分で書く)
design/              設計書(Iteration 1の解答例．自分で更新する)
docs/iteration-2.md  演習の手順
```

## 資料

- [Iteration 2：scoreの質問と，判断と表示の分離](../../../docs/systemone/iteration-2.md)
- [テスト駆動開発とテストリスト](../../../docs/tdd.md)
- [設計書の書き方](../../../docs/design.md)
