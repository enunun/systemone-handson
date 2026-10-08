# テストリスト(Iteration 10・解答例)

## 単体テスト

- [x] `compareRecords`：部署の判定が食い違った問い合わせと，片方だけが正解した件数を求める
- [x] `compareRecords`：件数か，同じ位置の件名と本文が違えば，同じデータの記録ではないとメッセージを返す
- [x] `calibration`：確信度を0.2刻みの5つの区間に分け，区間ごとの件数・確信度の平均・正解率を求める
- [x] `calibration`：区間の下端ちょうどはその区間に，確信度1は最後の区間に入れる
- [x] `calibration`：記録のない区間は，確信度の平均と正解率をundefinedにする
- [x] `formatCalibration`：区間ごとの表にする．記録のない区間は`n/a`と表示する
- [x] `formatComparison`：2つの記録の指標を並べ，食い違った問い合わせと，片方だけが正解した件数を表示する
- [x] `formatComparison`：食い違いがなければ，表の見出しを表示しない
- [x] `loadConfig`：`SYSTEMONE_TIMEOUT_MS`があれば，問い合わせを待つ時間にする．なければ`timeoutMs`をundefinedにする
- [x] `loadConfig`：`SYSTEMONE_TIMEOUT_MS`が正の整数でなければ，メッセージを返す
- [x] `triage`：部署の質問の，salesの説明文の期待値を変える

## 結合テスト

- [x] `run report --calibration`：指標のあとに，確信度の区間ごとの表を表示する
- [x] `run`：`--calibration`は，`report`以外では使えない
- [x] `run compare`：2つの記録の指標を並べ，食い違った問い合わせと，片方だけが正解した件数を表示する
- [x] `run compare`：`--min-confidence`で，正解率を求めるしきい値を変える
- [x] `run compare`：同じデータの記録でなければ，メッセージを表示して終了コード1で終わる
- [x] `run compare`：記録のファイルを読めなければ，理由を表示して終了コード1で終わる
- [x] `run compare`：記録のファイルが2つでなければ，使い方を表示する
- [x] `run`：使い方の文に，`--calibration`と`triage compare`の行を足す

## 発展課題(演習10-7)

解答例のパッケージでは，`発展(演習10-7)`で始まるコメントとして書いている．

- [x] `expectedCalibrationError`：区間ごとの確信度の平均と正解率の差を，件数の割合で重み付けして足す
- [x] `expectedCalibrationError`：記録がなければundefinedを返す
- [x] `run report --calibration`：表の下に期待較正誤差を表示する
