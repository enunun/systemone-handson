# triage-iteration-1(演習用)

問い合わせを振り分けるプログラム`triage`を育てるハンズオンの，Iteration 1の演習用パッケージ．
Iteration 0の解答例と同じコード・テスト・設計書から始まる．

## このIterationで作るもの

返金の判定に加えて，問い合わせを担当する部署(billing・support・sales)を判定し，もっとも確からしい部署とその確率を表示する．

```console
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.82)
refund: yes (0.61)
```

作りながら，選択肢から1つを選ぶ質問(`choice`)と確率の分布，選択肢の説明文の役割，1回の問い合わせで複数の質問に答えさせる方法を学ぶ．

## 進め方

1. [docs/iteration-1.md](docs/iteration-1.md)を読み，演習1-1から順に進める．
2. テストリストは[TESTLIST.md](TESTLIST.md)に書く．
3. 詰まったら，解答例[../solution/](../solution/)の同じ番号の解説(`../solution/docs/iteration-1.md`)を読む．

コマンドは，このパッケージのディレクトリで実行する．

## ディレクトリ構成

```text
src/main.ts          実行ファイルの入口(変更しない)
src/app.ts           引数を読み，判断エンジンに問い合わせる(担当部署の質問を足す)
src/refund.ts        返金の質問と判定の表示
src/department.ts    担当部署の質問と判定の表示(自分で作る)
test/unit/           単体テスト
test/integration/    結合テスト
TESTLIST.md          テストリスト(自分で書く)
design/              設計書(Iteration 0の解答例．自分で更新する)
docs/iteration-1.md  演習の手順
```

## 資料

- [Iteration 1：choiceの質問と確率の分布](../../../docs/systemone/iteration-1.md)
- [テスト駆動開発とテストリスト](../../../docs/tdd.md)
- [設計書の書き方](../../../docs/design.md)
