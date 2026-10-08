# テストリスト(Iteration 9・解答例)

## 単体テスト

- [x] `parseLabeledTickets`：「問い合わせと正解の部署を読む」を，部署・返金の要否・緊急度の段階の正解を読むように変える
- [x] `parseLabeledTickets`：正解の部署がない行や知らない部署の行のメッセージを，`subject, body and labels`に変える
- [x] `parseLabeledTickets`：返金の正解が真偽値でない行や，緊急度の正解が0から3の整数でない行は，知らせて飛ばす
- [x] `formatRecords`：記録を1行に1件のJSONにする
- [x] `parseRecords`：`formatRecords`で書いた記録を読み戻す
- [x] `parseRecords`：正解・結果・時間のそろっていない行は，行番号とともに知らせて飛ばす
- [x] `toLabeledResults`：記録を，正解の部署と振り分けの結果の組にする
- [x] `precisionRecall`：部署ごとに適合率と再現率を求める．判定したものがない部署の適合率はundefinedにする
- [x] `refundMetrics`：確率0.5以上を返金ありとした正解率と，Brierスコアを求める
- [x] `refundMetrics`：記録がなければ，どちらもundefinedにする
- [x] `meanAbsoluteError`：緊急度の期待値と正解の段階の差の絶対値を平均する
- [x] `percentile`：小さい順に並べて，p%の位置にある値を返す(最近順位法)
- [x] `percentile`：値がなければundefinedを返す
- [x] `buildReport`：部署の評価・適合率と再現率・返金・緊急度・時間の指標をまとめる
- [x] `formatReport`：部署の評価，適合率と再現率の表，返金・緊急度・所要時間の指標を表示する
- [x] `formatReport`：求められない指標は`n/a`と表示する

## 結合テスト

- [x] `run eval`：評価用のファイルに正解を足し，読めない行のメッセージを変える
- [x] `run eval --out`：1件ごとの正解・振り分けの結果・かかった時間を，JSON Linesで記録する．ディレクトリがなければ作る
- [x] `run eval --out`：記録を書けなければ，理由を表示して終了コード1で終わる
- [x] `run report`：記録だけから指標を表示する(判断エンジンには尋ねない)
- [x] `run report`：`--min-confidence`で，部署の正解率を求めるしきい値を変える
- [x] `run report`：記録のファイルを読めなければ，理由を表示して終了コード1で終わる
- [x] `run report`：判断エンジンを使えなくても，記録から指標を表示する
- [x] `run`：判断エンジンを使えなければ，理由を表示して終了コード1で終わる
- [x] `run`：`--out`と`--sweep`は，`eval`でだけ使える
- [x] `run`：使い方の文に，`--out`と`triage report`の行を足す

## 発展課題(演習9-7)

解答例のパッケージでは，`発展(演習9-7)`で始まるコメントとして書いている．

- [x] `precisionRecall`：適合率と再現率の調和平均(F1)も求める
- [x] `precisionRecall`：適合率と再現率がどちらも0なら，F1はundefinedにする
- [x] `formatReport`・`run report`：部署ごとの表にF1の列を足す
