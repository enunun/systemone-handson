# triage-iteration-10(演習用)

問い合わせを振り分けるプログラム`triage`を育てるハンズオンの，Iteration 10の演習用パッケージ．
Iteration 9の解答例と同じコード・テスト・設計書から始まる．

## このIterationで作るもの

同じデータで取った2つの評価の記録を比べ，確信度の較正を確かめる．
部署の選択肢の説明文を調整用のデータで直し，確かめ用のデータで一度だけ確かめる．モデルを`tev1:4b`に替えた結果とも比べる．

```console
$ pnpm start compare results/test-before.jsonl results/test-after.jsonl
A: results/test-before.jsonl
B: results/test-after.jsonl

metric                             A       B
accuracy                        0.85    0.96
review rate                     0.10    0.17
refund accuracy                 1.00    1.00
refund brier score             0.011   0.011
urgency mean absolute error     0.77    0.79
latency median (ms)             2806    2824
latency p95 (ms)                3067    3234

department differs: 3
subject                 actual    A         B
Price increase          billing   sales     billing
Enterprise demo         sales     support   sales
Startup program         sales     support   sales
only A correct: 0, only B correct: 3
```

作りながら，同じデータでの比べ方，片方だけが正解した件数の読み方，調整用のデータで測った精度が高く出る理由，確信度の較正，精度と速さの引き換え，タイムアウトの設定を学ぶ．

## 進め方

1. [docs/iteration-10.md](docs/iteration-10.md)を読み，演習10-1から順に進める．
2. テストリストは[TESTLIST.md](TESTLIST.md)に書く．
3. 詰まったら，解答例[../solution/](../solution/)の同じ番号の解説(`../solution/docs/iteration-10.md`)を読む．

コマンドは，このパッケージのディレクトリで実行する．`.env`は`.env.example`から作る．

## ディレクトリ構成

```text
data/dev.jsonl                    調整用の評価データ
data/test.jsonl                   確かめ用の評価データ
data/records/test-tev1-4b.jsonl   tev1:4bでtest.jsonlを評価した記録(4Bを動かせない環境で使う)
src/                              ソース(compareを足し，app・metrics・format・config・main・triageを変える)
test/unit/                        単体テスト
test/integration/                 結合テスト
TESTLIST.md                       テストリスト(自分で書く)
design/                           設計書(Iteration 9の解答例．自分で更新する)
docs/iteration-10.md              演習の手順
```

## 資料

- [Iteration 10：比べ方と，確信度の較正](../../../docs/systemone/iteration-10.md)
- [テスト駆動開発とテストリスト](../../../docs/tdd.md)
- [設計書の書き方](../../../docs/design.md)
