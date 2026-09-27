# テストリスト(Iteration 7・解答例)

## リファクタリング(振る舞いを変えない)

- [x] JSON Linesの読み方を`parseJsonLines`に分け，`parseTickets`はそれを使う(`parseTickets`のテストは変えない)

## 単体テスト

- [x] `triage`：答えから，部署の確信度も取り出す(期待値に`departmentConfidence`を足す)
- [x] `parseLabeledTickets`：問い合わせと正解の部署を読む
- [x] `parseLabeledTickets`：正解の部署がない行や，知らない部署の行は，行番号とともに知らせて飛ばす
- [x] `evaluate`：しきい値以上の確信度のものを自動で振り分けたとして，件数・正解率・人の確認に回る割合を求める
- [x] `evaluate`：しきい値が0なら，すべてを自動で振り分ける
- [x] `evaluate`：自動で振り分けたものがなければ，正解率はundefinedにする
- [x] `confusionMatrix`：正解の部署ごとに，判定した部署の件数を数える(人の確認に回したものも含める)
- [x] `sweep`：しきい値を0から1まで0.1刻みで変えて評価する
- [x] `formatEvaluation`：正解率・自動で振り分けた件数・人の確認に回る割合を1行で表示する
- [x] `formatEvaluation`：自動で振り分けたものがなければ，正解率をn/aと表示する
- [x] `formatConfusionMatrix`：行を正解の部署，列を判定した部署とした表にする
- [x] `formatSweep`：しきい値ごとの評価を表にする
- [x] `Triage`を作っている既存のテスト(`batch`・`format`)に，`departmentConfidence`を足す

## 結合テスト

- [x] `run eval`：既定のしきい値で評価し，評価の1行と混同行列を表示する．読めない行は知らせて飛ばす
- [x] `run eval`：`--min-confidence`で，評価するしきい値を変える
- [x] `run eval`：`--sweep`で，しきい値ごとの評価の表を表示する
- [x] `run eval`：`--sweep`と`--min-confidence`は一緒に使えない
- [x] `run`：`--sweep`は，eval以外では使えない
- [x] `run`・`run batch`：使い方の文に，`triage eval`の行を足す

## 発展課題(演習7-7)

解答例のパッケージでは，`発展(演習7-7)`で始まるコメントとして書いている．

- [x] `formatConfusionMatrix`：各行の右に，その行の対角線の件数を行の合計で割った再現率を表示する
- [x] `formatConfusionMatrix`：行の合計が0なら，再現率を`n/a`とする
- [x] 既存の`formatConfusionMatrix`と結合テストの期待値に`recall`の列を足す
