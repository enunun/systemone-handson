# triage-iteration-7(演習用)

問い合わせを振り分けるプログラム`triage`を育てるハンズオンの，Iteration 7の演習用パッケージ．
Iteration 6の解答例と同じコード・テスト・設計書から始まる．
正解の部署を付けた問い合わせ`data/labeled.jsonl`も加わっている．

## このIterationで作るもの

`triage eval <ファイル>`で，正解の部署が付いた問い合わせを振り分け，自動で振り分けた件数とその正解率，人の確認に回る割合を表示する．
`--sweep`を付けると，しきい値ごとの評価を表で表示する．

```console
$ pnpm start eval data/labeled.jsonl
accuracy: 0.95 (auto-routed 19 / 30), review rate: 0.37

actual \ predicted   billing   support     sales
billing                   10         1         0
support                    0        11         0
sales                      1         2         5
```

作りながら，評価用のデータ，正解率，混同行列，しきい値と人の確認に回る割合の関係を学ぶ．

## 進め方

1. [docs/iteration-7.md](docs/iteration-7.md)を読み，演習7-1から順に進める．
2. テストリストは[TESTLIST.md](TESTLIST.md)に書く．
3. 詰まったら，解答例[../solution/](../solution/)の同じ番号の解説(`../solution/docs/iteration-7.md`)を読む．

コマンドは，このパッケージのディレクトリで実行する．`.env`は`.env.example`から作る．

## ディレクトリ構成

```text
data/tickets.jsonl   問い合わせのサンプル
data/labeled.jsonl   正解の部署が付いた問い合わせ(30件)
src/app.ts           引数を読む(evalサブコマンドを足す)
src/batch.ts         まとめて振り分けるための部品
src/triage.ts        質問と，答えのまとめ(確信度を結果に足す)
src/format.ts        表示(評価の表示を足す)
src/…                そのほかはIteration 6と同じ
test/unit/           単体テスト
test/integration/    結合テスト
TESTLIST.md          テストリスト(自分で書く)
design/              設計書(Iteration 6の解答例．自分で更新する)
docs/iteration-7.md  演習の手順
```

## 資料

- [Iteration 7：評価と，しきい値の選び方](../../../docs/systemone/iteration-7.md)
- [テスト駆動開発とテストリスト](../../../docs/tdd.md)
- [設計書の書き方](../../../docs/design.md)
