# Iteration 0：System One・SDK・Vitest

Iteration 0で初めて使う概念・API・ツールを説明する．
コマンドの例は，devcontainerの中で実行した実際の結果である．

## System Oneとは

System Oneは，文章を生成せず，あらかじめ決めた形の答えを確率つきで返すモデルである．
名前は，人の思考を「速く直感的な判断(System 1)」と「遅く熟考する推論(System 2)」の2つで捉える考え方に由来する．

大規模言語モデル(LLM)とSystem Oneは，得意なことが違う．

| | 大規模言語モデル | System One |
| --- | --- | --- |
| 返すもの | 文章(トークンの列) | 質問の種類で決まった形の答え(はい・いいえの確率など) |
| 答えの範囲 | 何を書くかはモデル次第 | こちらが渡した選択肢の中だけ |
| プログラムでの扱い | 文章を解析して値を取り出す | 値をそのまま使う |
| 速さ | 答えの長さに比例して時間がかかる | 質問をまとめて1回の計算で答える |

問い合わせの振り分けのように，「どれにあてはまるか」「はいか，いいえか」を大量にすばやく決めたい処理は，System Oneに向いている．
文章を書く・要約する・理由を説明するといった処理は，LLMに向いている．

このハンズオンでは，TypeSafe AIのJevと同じAPIを持つ[Ollama](https://ollama.com/)を使う．
Ollamaは，手元のCPUでモデルを動かすサーバである．モデルには，Together AIのSystem Oneのモデル`tev1:0.8b`(Tev1の0.8B版．約800MB)を使う．

## `/v1/systemone`：質問を送って答えを受け取る

判断エンジンには，HTTPの`POST /v1/systemone`で問い合わせる．
リクエストの本文は，使うモデルの名前(`model`)と，判断の材料(`state`)と，名前を付けた質問(`questions`)のJSONである．

```json
{
  "model": "tev1:0.8b",
  "state": { "subject": "Refund not received", "body": "Where is my refund?" },
  "questions": {
    "refund": { "type": "noul", "instructions": "Is the customer asking for a refund?" }
  }
}
```

- `model`は，Ollamaに入れたモデルの名前である．
- `state`は，文字列でもJSONのオブジェクトでもよい．
- `questions`のキー(ここでは`refund`)は，答えを取り出すときの名前になる．自分で好きな名前を付ける．
- `type`は質問の種類である．このIterationでは`noul`(はい・いいえ)を使う．ほかの種類は，後のIterationで使う．
- `instructions`は，質問の文である．

devcontainerの中で，curlで問い合わせてみる．

```console
$ curl -s http://ollama:11434/v1/systemone -H 'Content-Type: application/json' -d '{"model": "tev1:0.8b", "state": {"subject": "Refund not received", "body": "Where is my refund?"}, "questions": {"refund": {"type": "noul", "instructions": "Is the customer asking for a refund?"}}}'
{"model":"tev1:0.8b","answers":{"refund":{"type":"noul","noul":0.8090922107684615}},"usage":{"input_tokens":138,"output_tokens":1}}
```

レスポンスの`answers`に，質問の名前ごとの答えが入る．
`noul`の質問の答えは，「はい」である確率(0から1)である．
`usage`は，読んだトークン(`input_tokens`)と，答えを決めるために使ったトークン(`output_tokens`)の数である．文章を生成しないので，`output_tokens`は質問ごとに数個で済む．

同じリクエストを何度送っても，同じ確率が返る．
問い合わせの内容を変えると，確率が変わる．

```console
$ curl -s http://ollama:11434/v1/systemone -H 'Content-Type: application/json' -d '{"model": "tev1:0.8b", "state": {"subject": "Login problem", "body": "I cannot log in since yesterday."}, "questions": {"refund": {"type": "noul", "instructions": "Is the customer asking for a refund?"}}}'
{"model":"tev1:0.8b","answers":{"refund":{"type":"noul","noul":0.1440886316110138}},"usage":{"input_tokens":137,"output_tokens":1}}
```

1回のリクエストで，複数の質問をまとめて尋ねられる．

```console
$ curl -s http://ollama:11434/v1/systemone -H 'Content-Type: application/json' -d '{"model": "tev1:0.8b", "state": {"subject": "Login problem", "body": "I cannot log in since yesterday."}, "questions": {"refund": {"type": "noul", "instructions": "Is the customer asking for a refund?"}, "angry": {"type": "noul", "instructions": "Is the customer angry?"}}}'
{"model":"tev1:0.8b","answers":{"refund":{"type":"noul","noul":0.11976156770903792},"angry":{"type":"noul","noul":0.5630101063694293}},"usage":{"input_tokens":383,"output_tokens":3}}
```

`refund`だけを尋ねたときと，`refund`の確率が少し違う．Tev1の答えは，一緒に尋ねる質問によって少し変わることがある．同じ質問の組み合わせなら，何度送っても同じ確率が返る．ただし，Ollamaを起動し直すと，小数の下の桁は少し変わることがある．

質問がないなど，リクエストが誤っていると，エラーを返す．

```console
$ curl -s http://ollama:11434/v1/systemone -H 'Content-Type: application/json' -d '{"model": "tev1:0.8b", "state": "Where is my refund?", "questions": {}}'
{"error":"questions must contain 1–64 fields"}
```

Ollamaは，devcontainerを初めて開いたときにモデルをダウンロードする．
モデルが使えるようになったかは，`GET /v1/models`で確かめる．一覧に`tev1:0.8b`があれば，問い合わせられる．

```console
$ curl -s http://ollama:11434/v1/models
{"object":"list","data":[{"id":"tev1:0.8b","object":"model","created":1791429834,"owned_by":"library"}]}
```

## TypeSafeのSDK

`/v1/systemone`は，TypeSafe AIの公式のSDK(`@typesafe-ai/sdk`)から呼べる．
SDKは，リクエストを組み立て，レスポンスを型の付いた値にして返す．

```ts
import { TypeSafeClient } from "@typesafe-ai/sdk";

const client = new TypeSafeClient({ baseURL: "http://ollama:11434", apiKey: "ollama", defaultModel: "tev1:0.8b" });

const result = await client.systemOne({
  state: { subject: "Login problem", body: "I cannot log in since yesterday." },
  questions: { angry: { type: "noul", instructions: "Is the customer angry?" } },
});
console.log(result.answers.angry.noul); // 0.6484420177215527
```

- `new TypeSafeClient(設定)`でクライアントを作る．
  - `baseURL`：判断エンジンのURL．省略すると本家Jev(`https://api.typesafe.ai`)になる．
  - `apiKey`：APIキー．Ollamaは検査しないので，何でもよい．このハンズオンでは`ollama`にする．
  - `defaultModel`：モデルの名前．SDKは，これをリクエストの`model`に入れる．
- `client.systemOne({ state, questions })`は，答えを`Promise`で返す．`await`で待つ．
- `result.answers.<質問の名前>`で，その質問の答えを取り出す．答えの型は質問の種類から決まる．`noul`の質問なら，答えは`{ type: "noul", noul: number }`である．
- 質問の型もSDKにある．`noul`の質問は`NoulQuestion`型である．型だけを使うときは`import type { NoulQuestion } from "@typesafe-ai/sdk"`と書く．

判断エンジンにつながらないときは`APIConnectionError`が，エラーのレスポンスが返ったときは`APIError`が，例外として投げられる．
SDKは，503などのエラーのときに，少し待ってから2回まで送り直す．

## TypeScriptをそのまま実行する

このハンズオンでは，TypeScriptのファイルをビルドせずに，Node.jsでそのまま実行する．

```sh
node src/main.ts
```

Node.jsは，ファイルを読み込むときに型の注釈を取り除き(型の除去)，残ったJavaScriptを実行する．
型の検査はしないので，型の誤りは`tsc`(`pnpm typecheck`)で見つける．

このやり方には，2つの決まりがある．

- ほかのファイルを`import`するときは，拡張子の`.ts`まで書く(`import { run } from "./app.ts"`)．
- 型を取り除くだけでは消せない構文(`enum`，コンストラクタの引数に`private`などを付ける書き方)は使わない．

## Vitest

テストは[Vitest](https://vitest.dev/)で書く．

```ts
import { describe, expect, test } from "vitest";
import { add } from "../../src/math.ts";

describe("add", () => {
  test("2つの数を足す", () => {
    expect(add(1, 2)).toBe(3);
  });
});
```

- `describe(名前, 関数)`で，テストをまとめる．このハンズオンでは，テストする関数の名前にする．
- `test(説明, 関数)`が1つのテストである．説明には，確かめる振る舞いを書く．テストリストの項目の文と同じにすると，対応がわかりやすい．
- `expect(実際の値)`に続けて，期待を書く．
  - `.toBe(値)`：`===`と同じ比べ方で等しい．数や文字列に使う．
  - `.toEqual(値)`：オブジェクトや配列の中身が等しい．
  - `.toMatchObject(値)`：オブジェクトが，指定したプロパティを(ほかのプロパティがあってもよいので)持つ．
  - `.toHaveLength(数)`：配列の長さ．
- `Promise`を返す関数のテストは，`async`の関数にして`await`する．

テストのファイルは`test/unit/`と`test/integration/`に，`<モジュール名>.test.ts`という名前で置く．
`vitest.config.ts`で，2つのディレクトリを`unit`と`integration`という別のプロジェクトにしてある．

```sh
pnpm test                          # すべてのテスト
pnpm test --project unit           # 単体テストだけ
pnpm test --project integration    # 結合テストだけ
```

## 通信を差し替えてテストする

テストでは，判断エンジンと通信しない([tdd.md](../tdd.md)の「判断エンジンを使わずにテストする」)．
代わりに，SDKの`fetch`の設定に，決まったレスポンスを返す関数を渡す．
SDKは，HTTPの通信を`fetch`関数で行うので，この関数を差し替えると，通信せずに決まった答えを受け取れる．

次の例は，`angry`という質問に，いつも0.9と答える偽の`fetch`である．

```ts
import { TypeSafeClient } from "@typesafe-ai/sdk";

const fakeFetch = async (_url: string, init?: RequestInit) => {
  console.log(init?.body); // SDKが送ろうとしたリクエストの本文(JSONの文字列)
  return Response.json({
    model: "tev1:0.8b",
    answers: { angry: { type: "noul", noul: 0.9 } },
    usage: { input_tokens: 10, output_tokens: 0 },
  });
};

const client = new TypeSafeClient({ baseURL: "http://ollama.test", apiKey: "test", fetch: fakeFetch });
```

- `Response.json(値)`は，値をJSONにしたレスポンスを作る．
- 偽の`fetch`は，SDKが送ろうとしたリクエストを受け取る．本文(`init.body`)を`JSON.parse`して配列に記録しておくと，何を送ったかをテストで確かめられる．
- `baseURL`には，実在しないURLを書いておくと，誤って本物に送ることがない．

## 終了コード

コマンドラインのプログラムは，終わるときに終了コードを返す．0は成功，それ以外は失敗を表す．
使い方の誤り(引数が足りないなど)には，2を使うことが多い．
`src/main.ts`は，`run`が返した`code`を`process.exitCode`に設定する．`code`が0なら`output`を標準出力へ，それ以外なら標準エラー出力へ表示する．
