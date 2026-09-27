# Iteration 8：HTTP APIと，入口側のアダプタ

Iteration 8で初めて使う概念・APIを説明する．
コマンドの例は，devcontainerの中で実行した実際の結果である．

## `node:http`でHTTPサーバを作る

Node.jsの`node:http`の`createServer`は，リクエストを受け取るたびに関数を呼ぶHTTPサーバを作る．

```ts
import { createServer } from "node:http";

const server = createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ hello: "world" }));
});
server.listen(3000);
```

- `request.method`はメソッド(`GET`・`POST`など)，`request.url`はパスとクエリである．
- `response.writeHead(ステータスコード, ヘッダ)`でステータスとヘッダを書き，`response.end(本文)`で本文を送って終える．
- `server.listen(ポート)`で待ち受けを始める．ポートに0を渡すと，空いているポートをOSが選ぶ．選ばれたポートは`server.address().port`で取り出せる．
- `server.close()`で待ち受けを終える．

## リクエストの本文を読む

リクエストの本文は，少しずつ(チャンクに分かれて)届く．
`for await`で，届いたチャンクを順に受け取れる．

```ts
const chunks: Buffer[] = [];
for await (const chunk of request) chunks.push(chunk as Buffer);
const text = Buffer.concat(chunks).toString("utf8");
```

大きすぎる本文を送られると，メモリを使い果たすおそれがある．
受け取った大きさを数え，上限を超えたら読むのをやめる．

## ステータスコード

HTTP APIは，結果をステータスコードで伝える．
このハンズオンでは，次のコードを使う．

| コード | 意味 | 使う場面 |
| --- | --- | --- |
| 200 | OK | 振り分けられた |
| 400 | Bad Request | 本文がJSONでない．件名か本文がない |
| 404 | Not Found | `/triage`以外のパス |
| 405 | Method Not Allowed | `/triage`にPOST以外で送った |
| 413 | Content Too Large | 本文が大きすぎる |
| 502 | Bad Gateway | 判断エンジンが失敗した |

400番台は「送った側の誤り」，500番台は「受けた側の誤り」を表す．
502は，受けたサーバがさらに別のサーバ(ここでは判断エンジン)に頼み，そちらが失敗したことを表す．
誤りの理由は，本文のJSONに`{"error": "理由"}`として入れる．

外から届くリクエストは，どんな形でもありうる．
Iteration 6の`isTicket`と同じく，本文を`unknown`として受け取り，確かめてから使う．

## curlでHTTP APIを試す

```console
$ curl -s localhost:3000/triage -d '{"subject": "Refund not received", "body": "Where is my refund?"}'
{"department":"billing","departmentProbability":0.7253,"departmentConfidence":0.318,"needsReview":false,"urgency":1.4061,"refundProbability":0.8631}
```

- `-d 本文`を付けると，POSTで本文を送る．
- `-i`を付けると，レスポンスのステータスとヘッダも表示する．

```console
$ curl -s -i localhost:3000/triage -d 'not json'
HTTP/1.1 400 Bad Request
Content-Type: application/json
Date: Sun, 27 Sep 2026 12:45:59 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{"error":"request body must be a JSON object with subject and body"}
```

## 入口側のアダプタと出口側のアダプタ

Iteration 3で作ったアダプタ(`systemone-engine`・`fake-engine`)は，アプリの中心から外の仕組み(判断エンジン)を呼ぶためのものだった．
これを出口側のアダプタと呼ぶ．

外から届く頼みごと(コマンドラインの引数，HTTPのリクエスト)を，アプリの中心の呼び出しに変えるものも，アダプタである．
これを入口側のアダプタと呼ぶ．

```text
コマンドライン ──▶ app(入口)       ─┐
                                    ├─▶ triage ──▶ DecisionEngine ◀── systemone-engine(出口) ──▶ 判断エンジン
HTTP           ──▶ http-api(入口)  ─┘
```

`app`と`http-api`は，どちらも同じ`triage`を呼ぶ．
入口を増やしても，アプリの中心は変わらない．
HTTP APIが返すJSONは，`Triage`をそのまま並べたものにした．
表示の書式(`format`)はコマンドラインのためのもので，HTTP APIでは使わない．

## HTTPサーバの結合テスト

HTTPサーバは，テストの中で実際に起動し，`fetch`でリクエストを送って確かめる．

```ts
const server = createApi(engine, {});
await new Promise<void>((resolve) => server.listen(0, resolve));
const { port } = server.address() as AddressInfo;
const response = await fetch(`http://127.0.0.1:${port}/triage`, { method: "POST", body: "…" });
server.close();
```

- ポートに0を渡すと，テストを並べて実行しても，ポートがぶつからない．
- `listen`は，待ち受けを始めたときにコールバックを呼ぶ．`Promise`で包むと`await`で待てる．
- Vitestの`beforeAll`で起動し，`afterAll`で`close`すると，テストのファイルごとに1回だけ起動する．
