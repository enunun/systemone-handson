# triage-iteration-6(演習用)

問い合わせを振り分けるプログラム`triage`を育てるハンズオンの，Iteration 6の演習用パッケージ．
Iteration 5の解答例と同じコード・テスト・設計書から始まる．
問い合わせのサンプル`data/tickets.jsonl`が加わっている．

## このIterationで作るもの

`triage batch <ファイル>`で，ファイルに並んだ問い合わせをまとめて振り分け，部署ごとの件数と，人の確認に回した件数を表示する．

```console
$ pnpm start batch data/tickets.jsonl
line 21: skipped (not a JSON object with subject and body)
billing: 4, support: 6, sales: 0, needs review: 11
```

作りながら，ファイルの読み込み，JSON Lines，サブコマンド，`Promise.all`と同時に送る数の制限を学ぶ．

## 進め方

1. [docs/iteration-6.md](docs/iteration-6.md)を読み，演習6-1から順に進める．
2. テストリストは[TESTLIST.md](TESTLIST.md)に書く．
3. 詰まったら，解答例[../solution/](../solution/)の同じ番号の解説(`../solution/docs/iteration-6.md`)を読む．

コマンドは，このパッケージのディレクトリで実行する．`.env`は，Iteration 5と同じく`.env.example`から作る．

## ディレクトリ構成

```text
data/tickets.jsonl   問い合わせのサンプル(1行に1件)
src/main.ts          実行ファイルの入口
src/app.ts           引数を読む(サブコマンドを足す)
src/triage.ts        質問と，答えのまとめ
src/format.ts        表示(集計の表示を足す)
src/config.ts        環境変数から設定を読む
src/ports/           ポート
src/adapters/        アダプタ
test/unit/           単体テスト
test/integration/    結合テスト
TESTLIST.md          テストリスト(自分で書く)
design/              設計書(Iteration 5の解答例．自分で更新する)
docs/iteration-6.md  演習の手順
```

## 資料

- [Iteration 6：ファイル，JSON Lines，並行処理](../../../docs/systemone/iteration-6.md)
- [テスト駆動開発とテストリスト](../../../docs/tdd.md)
- [設計書の書き方](../../../docs/design.md)
