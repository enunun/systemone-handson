# テストリスト(Iteration 3・解答例)

振る舞いは変えない．表示の期待値は，どのテストでも変えない．

## 単体テスト

- [x] `createSystemOneEngine`：アプリの質問を，/v1/systemoneの質問にして1回で送る
- [x] `createSystemOneEngine`：答えを，質問の種類ごとのアプリの答えにする
- [x] `createFakeEngine`：質問の名前ごとに，決めておいた答えを返す
- [x] `createFakeEngine`：受け取った状態と質問を記録する
- [x] `createFakeEngine`：答えを決めていない質問を尋ねられたら，例外を投げる
- [x] `triage`：偽の`fetch`をfakeに置き換える．問い合わせと3つの質問を，判断エンジンに1回で尋ねる(質問はアプリの型で確かめる)
- [x] `triage`：偽の`fetch`をfakeに置き換える．答えから，部署とその確率・緊急度の期待値・返金の確率を取り出す
- [x] `format`のテスト：変更なし

## 結合テスト

- [x] `run`：`TypeSafeClient`の代わりに，`createSystemOneEngine`で作ったアダプタを渡す(偽の`fetch`はそのまま)
- [x] `run`：件名と本文がそろっていなければ，判断エンジンへ送らずに使い方を表示する(同上)

## 発展課題(演習3-7)

解答例のパッケージでは，`発展(演習3-7)`で始まるコメントと，`advanced/`のファイルとして書いている．

- [x] `createTimingEngine`：包んだ判断エンジンの答えを，そのまま返す
- [x] `createTimingEngine`：質問の数と，かかった時間を記録する
