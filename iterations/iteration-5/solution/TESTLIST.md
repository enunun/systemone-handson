# テストリスト(Iteration 5・解答例)

## 単体テスト

- [x] `loadConfig`：3つの環境変数から，/v1/systemoneの判断エンジンにつなぐ設定を作る
- [x] `loadConfig`：足りない環境変数があれば，その名前を並べたメッセージを返す
- [x] `loadConfig`：空の環境変数は，足りないものとして扱う
- [x] `loadConfig`：DECISION_ENGINEがfakeなら，ほかの環境変数がなくても，決まった答えを返す判断エンジンの設定にする
- [x] `loadConfig`：DECISION_ENGINEがsystemoneなら，指定しないときと同じ
- [x] `loadConfig`：DECISION_ENGINEが知らない値なら，メッセージを返す

## 結合テスト

- [x] 変更なし(`run`は判断エンジンを受け取るので，設定の読み方が変わっても影響しない)

## 手で確かめること

- [x] `.env`がなければ，足りない環境変数を表示して終了コード1で終わる
- [x] `.env.example`を`.env`にコピーすると，laya-serverにつながる
- [x] `DECISION_ENGINE=fake`を付けると，判断エンジンなしで決まった答えを表示する
