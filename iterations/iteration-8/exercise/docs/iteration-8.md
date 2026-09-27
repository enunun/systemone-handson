# Iteration 8：振り分けをHTTP APIで公開する(演習)

## このIterationで作るもの

`triage serve`でHTTPサーバを起動し，振り分けをHTTP APIで公開する．
問い合わせフォームやチャットなど，ほかのシステムから`triage`を使えるようになる．

```console
$ pnpm start serve --port 3000
listening on http://localhost:3000
```

別のターミナルから，curlでリクエストを送る．

```console
$ curl -s localhost:3000/triage -d '{"subject": "Refund not received", "body": "Where is my refund?"}'
{"department":"billing","departmentProbability":0.7253,"departmentConfidence":0.318,"needsReview":false,"urgency":1.4061,"refundProbability":0.8631}
```

作りながら，`node:http`でのHTTPサーバ，入力の検証とステータスコード，入口側と出口側のアダプタ，HTTPサーバの結合テストを学ぶ．

## 進め方

演習8-1から順に進める．
詰まったら，`../solution/docs/iteration-8.md`の同じ番号の節を読む．
コマンドは，このパッケージのディレクトリ(`iterations/iteration-8/exercise`)で実行する．

## 演習8-1：引き継いだパッケージを確かめる

1. テストを実行して型を検査する．Iteration 7の61のテストがすべて通ることを確かめる．
2. `.env`を作り，`pnpm start eval data/labeled.jsonl`を実行する．
3. 設計書のComponentの図を読み，コマンドラインの引数を受け取るモジュールはどれか，判断エンジンを呼ぶモジュールはどれかを確かめる．

## 演習8-2：HTTPサーバを学ぶ

[Iteration 8：HTTP APIと，入口側のアダプタ](../../../../docs/systemone/iteration-8.md)を読む．

読み終えたら，次を試す．

1. 資料の最初の例(`{ hello: "world" }`を返すサーバ)を`/tmp/hello.ts`に書き，`node /tmp/hello.ts`で起動する．別のターミナルで`curl -s -i localhost:3000/`を実行し，ステータスとヘッダと本文を読む．`Ctrl+C`でサーバを止める．
2. 1のサーバに，`curl -s -i localhost:3000/anything -d 'data'`を送る．サーバは，パスやメソッドの違いを区別しているか．

## 演習8-3：テストリストを書く

次の要求を読み，[TESTLIST.md](../TESTLIST.md)にテストリストを書く．

### 要求

- `triage serve [--min-confidence <0-1>] [--port <0-65535>]`で，HTTPサーバを起動する．ポートを指定しなければ3000とする．起動したら`listening on http://localhost:3000`のように表示する．
- `POST /triage`に，`subject`と`body`を持つJSONを本文として送ると，振り分けの結果(`Triage`の項目)をJSONで返す．ステータスは200，`Content-Type`は`application/json`とする．しきい値は，`--min-confidence`で指定したもの(なければ0.2)を使う．
- 次の場合は，`{"error": "理由"}`のJSONとステータスコードを返す．
  - 本文がJSONとして読めない，または`subject`か`body`がない：400．
  - `/triage`以外のパス：404．
  - `/triage`にPOST以外のメソッド：405．
  - 本文が64KBを超える：413．
  - 判断エンジンが失敗した：502．
- `--port`が0から65535の整数でなければ，使い方を表示する．`--port`は`serve`でだけ使える．使い方には`triage serve`の行を足す．

### 作るもの

| モジュール | 名前 | 型 | 役割 |
| --- | --- | --- | --- |
| `src/adapters/http-api.ts` | `createApi` | `(engine: DecisionEngine, options: TriageOptions) => Server` | HTTP APIのサーバを作る．`listen`で待ち受けを始める． |
| `src/app.ts` | `RunResult`の`server` | `Server`(省略可) | `serve`のときに，待ち受けているサーバを返す．テストで止めるのに使う． |
| `src/app.ts` | `run` | (変えない) | `serve`サブコマンドを読み，サーバを起動する． |

### 考えること

- `createApi`のテストでは，判断エンジンに何を使うか．
- エラーの場合は，いくつ確かめる必要があるか．
- `run(["serve", …])`のテストでは，サーバが起動したままになる．どうやって止めるか．
- `--port 0`を指定すると，何が起きるか．テストで役に立つか．

## 演習8-4：設計書を更新する

- Context：HTTP APIを使う外部のシステムを足す．
- Container：`triage serve`を描き足す．同じプログラムを，HTTPサーバとして起動したものである．
- Component：`adapters/http-api`を足す．入口側のアダプタ(`app`・`adapters/http-api`)と出口側のアダプタを，別の境界に描き分ける．
- Code：`serve`の流れと，HTTP APIがリクエストを処理する流れを足す．
- シーケンス：HTTP APIの流れを，別の図として足す．

## 演習8-5：テスト駆動で実装する

- `test/integration/http-api.test.ts`を作る．`beforeAll`で`createApi`のサーバをポート0で起動し，`afterAll`で止める．判断エンジンにはfakeを使う．
- エラーの場合を1つずつRed→Greenにする．fakeに答えを1つも渡さないと，判断エンジンが失敗する場合を作れる．
- `node:http`のリクエストは，`for await`で本文を読む．
- `app`に`serve`サブコマンドを足す．`listen`を`Promise`で包んで待ち，`server.address()`から実際のポートを取り出して表示する．
- 最後に，`pnpm start serve`で起動し，別のターミナルからcurlで確かめる．

## 演習8-6：振り返る

1. 自分の`TESTLIST.md`と，解答例の[TESTLIST.md](../../solution/TESTLIST.md)を比べる．
2. HTTP APIを足すのに，`triage`・`format`・`batch`・`evaluate`・`ports/decision-engine`・出口側のアダプタは変えたか．それはなぜか．
3. HTTP APIが返すJSONは，`format`の表示ではなく`Triage`の項目にした．それはなぜか．
4. Iteration 0から8までの設計書のComponentの図を並べて，構造がどう育ってきたかを振り返る．
5. 設計書と実装を見比べる．違う形になったところがあれば，設計書を実装に合わせて直す．

## 演習8-7(発展)：死活確認のエンドポイント

`GET /healthz`に`{"status": "ok"}`を返すようにする．
サーバが動いているかを，ほかのシステムや監視の仕組みから確かめるのに使う．

```console
$ pnpm start serve --port 3001
listening on http://localhost:3001
```

```console
$ curl -s localhost:3001/healthz
{"status":"ok"}
```

発展課題の解答の一例は，`../solution/docs/iteration-8.md`の演習8-7にある．

発展課題でも，テストリストを書いたあとに設計書を更新してから実装し，実装したら設計書と見比べる．
