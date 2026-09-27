# テストリスト(Iteration 6・解答例)

## 単体テスト

- [x] `parseTickets`：1行に1件の問い合わせ(JSON)を読む
- [x] `parseTickets`：空の行は飛ばす
- [x] `parseTickets`：JSONとして読めない行は，行番号とともに知らせて飛ばす
- [x] `parseTickets`：件名か本文が文字列でない行も，知らせて飛ばす
- [x] `mapWithConcurrency`：すべての要素に関数を適用し，結果を元の順に並べる
- [x] `mapWithConcurrency`：同時に実行する数を，指定した数までにする
- [x] `summarize`：自動で振り分けた件数を部署ごとに数え，人の確認に回した件数を別に数える
- [x] `formatSummary`：部署ごとの件数と，人の確認に回した件数を1行で表示する

## 結合テスト

- [x] `run batch`：ファイルの問い合わせを振り分け，部署ごとの件数と人の確認に回した件数を表示する
- [x] `run batch`：読めない行は，行番号とともに知らせて飛ばす
- [x] `run batch`：`--min-confidence`で，しきい値を変える
- [x] `run batch`：ファイルが読めなければ，終了コード1で知らせる
- [x] `run batch`：ファイルを指定しなければ，使い方を表示する
- [x] `run`：使い方の文を，`triage batch`の行を足した2行に変える
