# Iteration 8：振り分けをHTTP APIで公開する(解説)

演習用の`docs/iteration-8.md`の各手順について，解答の例と考え方を説明する．

## 演習8-1：引き継いだパッケージを確かめる

Iteration 7の61のテストが通る．
コマンドラインの引数を受け取るのは`app`，判断エンジンを呼ぶのは`adapters/systemone-engine`(`triage`から`DecisionEngine`を通して呼ばれる)である．

## 演習8-2：HTTPサーバを学ぶ

```console
$ curl -s -i localhost:3000/
HTTP/1.1 200 OK
Content-Type: application/json
Date: Sun, 27 Sep 2026 12:45:48 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{"hello":"world"}
$ curl -s -i localhost:3000/anything -d 'data'
HTTP/1.1 200 OK
Content-Type: application/json
Date: Sun, 27 Sep 2026 12:45:48 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{"hello":"world"}
```

資料の例のサーバは，パスやメソッドを見ていないので，どんなリクエストにも同じ答えを返す．
`triage`のHTTP APIでは，`request.url`と`request.method`を見て分ける．

## 演習8-3：テストリストを書く

解答例のテストリストは[TESTLIST.md](../TESTLIST.md)である．

- HTTP APIは，HTTPのリクエストとレスポンスで確かめるので，すべて結合テストにした．判断エンジンにはfakeを使う．fakeの`calls`で，リクエストの件名と本文が`triage`に渡ったことも確かめる．
- エラーの場合は，要求の6つ(400が2通り・404・405・413・502)をそれぞれ確かめる．
- `run serve`のテストでは，`RunResult`の`server`を`finally`で止める．テストが失敗しても，サーバが残らない．
- `--port 0`で起動すると，空いているポートが選ばれる．テストを並べて実行しても，ポートがぶつからない．
- `--min-confidence`が振り分けに使われることは，`serve`のテストで確かめる(確信度0.1の答えが，しきい値0.05では人の確認に回らない)．

## 演習8-4：設計書を更新する

| ファイル | 変更 | 理由 |
| --- | --- | --- |
| [01-context.md](../design/01-context.md) | 問い合わせを受け付けるシステムを足した | 利用者が増えた |
| [02-container.md](../design/02-container.md) | `triage serve`を足し，同じプログラムであることを書いた | 動かし方が増えた |
| [03-component.md](../design/03-component.md) | `adapters/http-api`を足し，入口側と出口側のアダプタを別の境界に描いた | 新しいモジュールと，アダプタの役割 |
| [04-code.md](../design/04-code.md) | `serve`の流れと，HTTP APIがリクエストを処理する流れを足した | 新しい流れ |
| [05-sequence.md](../design/05-sequence.md) | HTTP APIの図を足した | 新しい使い方 |

`adapters/http-api`は，`triage`・ポート・`batch`の`isTicket`に依存する．
`format`には依存しない．
Componentの図で，アプリの中心(`triage`・`format`・`batch`・`evaluate`・ポート)の中の矢印が，Iteration 7から変わっていないことを確かめる．

## 演習8-5：テスト駆動で実装する

### `createApi`

最初のテストは，200を返す場合である．
`beforeAll`でサーバをポート0で起動する．

```ts
const server = createApi(engine, {});
let baseURL = "";

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

const post = (body: string): Promise<Response> =>
  fetch(`${baseURL}/triage`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
```

```ts
  test("POST /triageに件名と本文を送ると，振り分けの結果をJSONで返す", async () => {
    const response = await post('{"subject": "Refund not received", "body": "Where is my refund?"}');

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.json()).toEqual({
      department: "billing",
      departmentProbability: 0.7253,
      departmentConfidence: 0.318,
      needsReview: false,
      urgency: 1.4061,
      refundProbability: 0.8631,
    });
    expect(engine.calls.at(-1)?.state).toEqual({ subject: "Refund not received", body: "Where is my refund?" });
  });
```

モジュールがないので，テストの読み込みで失敗する．

```console
Error: Cannot find module '../../src/adapters/http-api.ts' imported from …/test/integration/http-api.test.ts
```

`createApi`は，パス・メソッド・本文の大きさ・本文の形を順に確かめ，最後に`triage`を呼ぶ．

```ts
export const createApi = (engine: DecisionEngine, options: TriageOptions): Server =>
  createServer(async (request, response) => {
    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    if (path !== "/triage") return sendError(response, 404, `not found: ${path}`);
    if (request.method !== "POST") return sendError(response, 405, "use POST");
    const text = await readBody(request);
    if (text === undefined) return sendError(response, 413, "request body is too large");
    const ticket = parseTicket(text);
    if (ticket === undefined) return sendError(response, 400, "request body must be a JSON object with subject and body");
    try {
      sendJson(response, 200, await triage(engine, ticket, options));
    } catch (error) {
      sendError(response, 502, `the decision engine failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
```

- `request.url`には，クエリ(`?…`)も入る．`new URL`でパスだけを取り出す．
- 本文の形は，Iteration 6の`isTicket`で確かめる．
- `triage`の例外は，判断エンジンの失敗として502にする．例外を受け止めないと，レスポンスを返さないままになる．

エラーの場合のテストを1つずつ足す．
判断エンジンが失敗する場合は，答えを1つも持たないfakeで作れる．

```ts
  test("判断エンジンが失敗したら，502を返す", async () => {
    const failing = createApi(createFakeEngine({}), {});
    await new Promise<void>((resolve) => failing.listen(0, resolve));
    const url = `http://127.0.0.1:${(failing.address() as AddressInfo).port}/triage`;

    const response = await fetch(url, { method: "POST", body: '{"subject": "A", "body": "a"}' });

    expect(response.status).toBe(502);
    failing.close();
  });
```

### `run serve`

`Command`に`serve`を足し，`runServe`でサーバを起動する．

```ts
const runServe = async (port: number, options: TriageOptions, engine: DecisionEngine): Promise<RunResult> => {
  const server = createApi(engine, options);
  await new Promise<void>((resolve) => server.listen(port, resolve));
  const { port: actualPort } = server.address() as AddressInfo;
  return { code: 0, output: `listening on http://localhost:${actualPort}`, server };
};
```

`main`は変えていない．
`run`が返したあとも，待ち受けているサーバがあるので，プロセスは終わらずに動き続ける．

すべてのテストが通る．

```console
$ pnpm test
 Test Files  12 passed (12)
      Tests  71 passed (71)
```

本物の判断エンジンで起動し，curlで確かめる．

```console
$ pnpm start serve --port 3000
listening on http://localhost:3000
```

```console
$ curl -s localhost:3000/triage -d '{"subject": "Refund not received", "body": "Where is my refund?"}'
{"department":"billing","departmentProbability":0.7253,"departmentConfidence":0.318,"needsReview":false,"urgency":1.4061,"refundProbability":0.8631}
$ curl -s localhost:3000/triage -d '{"subject": "Team plan", "body": "We are 20 people and want to upgrade to the team plan. What does it cost?"}'
{"department":"sales","departmentProbability":0.4394,"departmentConfidence":0.0229,"needsReview":true,"urgency":0.9847,"refundProbability":0.0692}
```

## 演習8-6：振り返る

1. HTTP APIのテストを単体テストに分類した場合は，その理由を振り返る．解答例では，HTTPのリクエストとレスポンスを通して，`triage`まで組み合わせて確かめるので，結合テストとした．
2. 変えていない．`triage`は，コマンドラインから呼ばれても，HTTPから呼ばれても，同じ`Ticket`を受け取って同じ`Triage`を返す．入口の違いは，入口側のアダプタが吸収する．Iteration 3で出口側を切り離したのと同じ考え方を，入口側にも当てはめた．
3. HTTP APIを使うのはほかのプログラムなので，文字列を解析せずに値を使えるJSONのほうが扱いやすい．`format`の表示は人が読むためのもので，書式を変えるとプログラムが読めなくなる．
4. Iteration 0では，`main`・`app`・`refund`の3つのモジュールだった．Iteration 2で判断と表示を分け，Iteration 3で判断エンジンをポートとアダプタで切り離し，Iteration 5で組み立ての場所ができた．Iteration 6〜8では，アプリの中心を変えずに，部品(`batch`・`evaluate`)と入口(`http-api`)を足していった．
5. 解答例は設計書どおりに実装できた．

## 演習8-7(発展)：死活確認のエンドポイント

テストリストに次の項目を足す．

- `createApi`：`GET /healthz`に，200と`{"status": "ok"}`を返す
- `createApi`：`/healthz`にGET以外で送ると，ほかのパスと同じく404を返す

パスを確かめる前に，`/healthz`の場合を足す．

```ts
    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    if (path === "/healthz" && request.method === "GET") return sendJson(response, 200, { status: "ok" });
    if (path !== "/triage") return sendError(response, 404, `not found: ${path}`);
```

```console
$ pnpm start serve --port 3001
listening on http://localhost:3001
```

```console
$ curl -s localhost:3001/healthz
{"status":"ok"}
```

判断エンジン(laya-server)にも`GET /healthz`がある．
`triage serve`の`/healthz`で，判断エンジンの準備ができているかまで確かめるかは，監視で何を知りたいかによって決める．

解答例のパッケージでは，この実装とテストを`発展(演習8-7)`で始まるコメントとして書いている．
コメントを外して動かす方法は，リポジトリの[README](../../../../README.md#発展課題)にある．
