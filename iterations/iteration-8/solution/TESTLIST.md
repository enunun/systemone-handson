# テストリスト(Iteration 8・解答例)

## 結合テスト

- [x] `createApi`：`POST /triage`に件名と本文を送ると，振り分けの結果をJSONで返す
- [x] `createApi`：本文がJSONとして読めなければ，400を返す
- [x] `createApi`：件名か本文がなければ，400を返す
- [x] `createApi`：本文が64KBを超えれば，413を返す
- [x] `createApi`：`/triage`以外のパスには，404を返す
- [x] `createApi`：`/triage`にPOST以外で送ると，405を返す
- [x] `createApi`：判断エンジンが失敗したら，502を返す
- [x] `run serve`：HTTP APIの待ち受けを始め，URLを表示する．`--min-confidence`が振り分けに使われる
- [x] `run serve`：`--port`が0から65535の整数でなければ，使い方を表示する
- [x] `run`：`--port`は，serve以外では使えない
- [x] `run`・`run batch`：使い方の文に，`triage serve`の行を足す

## 単体テスト

- [x] 変更なし(HTTP APIは，HTTPのリクエストとレスポンスで確かめる)

## 発展課題(演習8-7)

解答例のパッケージでは，`発展(演習8-7)`で始まるコメントとして書いている．

- [x] `createApi`：`GET /healthz`に，200と`{"status": "ok"}`を返す
- [x] `createApi`：`/healthz`にGET以外で送ると，ほかのパスと同じく404を返す
