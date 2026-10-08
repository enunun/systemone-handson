# triage-iteration-9(演習用)

問い合わせを振り分けるプログラム`triage`を育てるハンズオンの，Iteration 9の演習用パッケージ．
Iteration 8の解答例と同じコード・テスト・設計書から始まる．

## このIterationで作るもの

評価の結果を1件ずつ記録し，記録から指標を計算する．
評価用のデータは2つに分ける．質問の調整には`data/dev.jsonl`を，調整した結果の確認には`data/test.jsonl`を使う．

```console
$ pnpm start eval --out results/dev.jsonl data/dev.jsonl
accuracy: 0.93 (auto-routed 27 / 30), review rate: 0.10

actual \ predicted   billing   support     sales
billing                   10         1         0
support                    0        11         0
sales                      0         2         6

wrote 30 records to results/dev.jsonl
$ pnpm start report results/dev.jsonl
accuracy: 0.93 (auto-routed 27 / 30), review rate: 0.10

department  precision  recall
billing          1.00    0.91
support          0.79    1.00
sales            1.00    0.75

refund accuracy: 0.93, brier score: 0.068
urgency mean absolute error: 0.82
latency median: 696 ms, p95: 819 ms
```

作りながら，調整用と確かめ用のデータを分ける理由，適合率と再現率，Brierスコア，平均絶対誤差，パーセンタイル，評価の記録の残し方を学ぶ．

## 進め方

1. [docs/iteration-9.md](docs/iteration-9.md)を読み，演習9-1から順に進める．
2. テストリストは[TESTLIST.md](TESTLIST.md)に書く．
3. 詰まったら，解答例[../solution/](../solution/)の同じ番号の解説(`../solution/docs/iteration-9.md`)を読む．

コマンドは，このパッケージのディレクトリで実行する．`.env`は`.env.example`から作る．

## ディレクトリ構成

```text
data/dev.jsonl       調整用の評価データ(30件．部署・返金・緊急度の正解付き)
data/test.jsonl      確かめ用の評価データ(30件)
data/labeled.jsonl   Iteration 7の評価データ(dev.jsonlに置き換える)
src/app.ts           引数を読む(eval --outとreportを足す)
src/evaluate.ts      精度を測る(正解に返金と緊急度を足す)
src/…                そのほかはIteration 8と同じ
test/unit/           単体テスト
test/integration/    結合テスト
TESTLIST.md          テストリスト(自分で書く)
design/              設計書(Iteration 8の解答例．自分で更新する)
docs/iteration-9.md  演習の手順
```

## 資料

- [Iteration 9：評価の記録と指標](../../../docs/systemone/iteration-9.md)
- [テスト駆動開発とテストリスト](../../../docs/tdd.md)
- [設計書の書き方](../../../docs/design.md)
