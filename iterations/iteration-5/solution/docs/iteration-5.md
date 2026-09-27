# Iteration 5：接続先を環境変数で選ぶ(解説)

演習用の`docs/iteration-5.md`の各手順について，解答の例と考え方を説明する．

## 演習5-1：引き継いだパッケージを確かめる

Iteration 4の26のテストが通る．

接続先は，`src/main.ts`の`new TypeSafeClient({ baseURL: "http://laya:8080", apiKey: "local", defaultModel: "laya" })`に書かれている．
本家Jevに替えるには，この3つの値を書き換えることになる．
書き換えたコードはGitに入るので，APIキーも一緒に入ってしまう．

## 演習5-2：環境変数を試す

```console
> process.env.HOME
'/root'
> process.env.NO_SUCH_VARIABLE
undefined
```

設定されていない環境変数は`undefined`になる．

```console
$ GREETING=Hi node -e 'console.log(process.env.GREETING)'
Hi
$ node --env-file-if-exists=.env -e 'console.log(process.env.GREETING)'
Hello
$ GREETING=Hi node --env-file-if-exists=.env -e 'console.log(process.env.GREETING)'
Hi
```

`.env`に`GREETING=Hello`があっても，コマンドの前に書いた`GREETING=Hi`が使われる．
シェルで設定した環境変数が，`.env`より優先される．

## 演習5-3：テストリストを書く

解答例のテストリストは[TESTLIST.md](../TESTLIST.md)である．

- `loadConfig`は，環境変数のオブジェクトを引数で受け取るので，テストでは普通のオブジェクトを渡す．
- 足りない変数は，1つだけではなく2つ足りない例にした．名前をどう並べるか(コンマと空白でつなぐ)まで確かめられる．
- 空の値の例は別のテストにした．`.env`に`SYSTEMONE_API_KEY=`と書いたままにすると，値は`undefined`ではなく空文字列になるからである．
- `main`には，`loadConfig`の結果で分けてアダプタを作る処理だけが残る．`main`の振る舞いは，「手で確かめること」として実際に実行して確かめた．
- `run`は判断エンジンを引数で受け取るので，結合テストは変わらない．

## 演習5-4：設計書を更新する

| ファイル | 変更 | 理由 |
| --- | --- | --- |
| [01-context.md](../design/01-context.md) | 本家Jevを`System_Ext`で足した．どちらか1つを使うことを図の下に書いた | 接続できる判断エンジンが増えた |
| [02-container.md](../design/02-container.md) | `.env`(`ContainerDb`)と本家Jev(`Container_Ext`)を足した．環境変数の優先順位と，`.env`をGitに入れないことを書いた | 設定の置き場所ができた |
| [03-component.md](../design/03-component.md) | `config`と，`main`から`config`・`fake-engine`・ポートへの矢印を足した | `main`が設定からアダプタを選ぶようになった |
| [04-code.md](../design/04-code.md) | 環境変数から`DecisionEngine`ができるまでの流れと，`Config`・`ConfigResult`を足した | 新しい型と関数 |
| [05-sequence.md](../design/05-sequence.md) | `loadConfig`と，設定が足りないときに終わる流れを足した | 起動の流れが変わった |

Componentの図では，`main`から出る矢印がもっとも多い．
組み立ての場所は，具体的な部品をすべて知っている場所だからである．
一方，`config`はほかのモジュールに依存しない．

## 演習5-5：テスト駆動で実装する

### `loadConfig`

最初のテストは，3つの環境変数がそろっている場合である．

```ts
const laya = { SYSTEMONE_BASE_URL: "http://laya:8080", SYSTEMONE_MODEL: "laya", SYSTEMONE_API_KEY: "local" };

describe("loadConfig", () => {
  test("3つの環境変数から，/v1/systemoneの判断エンジンにつなぐ設定を作る", () => {
    expect(loadConfig(laya)).toEqual({
      ok: true,
      config: { engine: "systemone", baseURL: "http://laya:8080", model: "laya", apiKey: "local" },
    });
  });
});
```

環境変数をそのまま詰めるだけの実装で通したあと，足りない場合のテストを書く．

```ts
  test("足りない環境変数があれば，その名前を並べたメッセージを返す", () => {
    expect(loadConfig({ SYSTEMONE_MODEL: "laya" })).toEqual({
      ok: false,
      message: "missing environment variables: SYSTEMONE_BASE_URL, SYSTEMONE_API_KEY",
    });
  });
```

```console
AssertionError: expected { ok: true, config: { …(4) } } to deeply equal { ok: false, …(1) }

- Expected
+ Received

  {
-   "message": "missing environment variables: SYSTEMONE_BASE_URL, SYSTEMONE_API_KEY",
-   "ok": false,
+   "config": {
+     "apiKey": "",
+     "baseURL": "",
+     "engine": "systemone",
+     "model": "laya",
+   },
+   "ok": true,
  }
```

必要な名前の配列から，値のないものを集める．
`DECISION_ENGINE`のテストも1つずつ足して，次の実装になった．

```ts
export const loadConfig = (env: Readonly<Record<string, string | undefined>>): ConfigResult => {
  const engine = env.DECISION_ENGINE ?? "systemone";
  if (engine === "fake") return { ok: true, config: { engine: "fake" } };
  if (engine !== "systemone") {
    return { ok: false, message: `DECISION_ENGINE must be systemone or fake: ${engine}` };
  }
  const names = ["SYSTEMONE_BASE_URL", "SYSTEMONE_MODEL", "SYSTEMONE_API_KEY"] as const;
  const missing = names.filter((name) => !env[name]);
  if (missing.length > 0) return { ok: false, message: `missing environment variables: ${missing.join(", ")}` };
  return {
    ok: true,
    config: {
      engine: "systemone",
      baseURL: env.SYSTEMONE_BASE_URL ?? "",
      model: env.SYSTEMONE_MODEL ?? "",
      apiKey: env.SYSTEMONE_API_KEY ?? "",
    },
  };
};
```

最後の`?? ""`は，型を`string`にするためのものである．
その手前で3つがそろっていることを確かめているので，空文字列になることはない．

### `main`

`main`は，設定を読み，設定に従ってアダプタを作り，`run`に渡す．

```ts
const createEngine = (config: Config): DecisionEngine => {
  switch (config.engine) {
    case "systemone":
      return createSystemOneEngine(
        new TypeSafeClient({ baseURL: config.baseURL, apiKey: config.apiKey, defaultModel: config.model }),
      );
    case "fake":
      return createFakeEngine(fakeAnswers);
  }
};

const loaded = loadConfig(process.env);
if (loaded.ok) {
  const { code, output } = await run(process.argv.slice(2), createEngine(loaded.config));
  if (code === 0) console.log(output);
  else console.error(output);
  process.exitCode = code;
} else {
  console.error(loaded.message);
  process.exitCode = 1;
}
```

`fakeAnswers`は，Iteration 3のfakeに渡す答えの形(ポートの`Answer`)で書く．

すべてのテストが通る．

```console
$ pnpm test
 Test Files  6 passed (6)
      Tests  32 passed (32)
```

使い方の例を実際に試す．

```console
$ pnpm start "Refund not received" "Where is my refund?"
.env not found. Continuing without it.
missing environment variables: SYSTEMONE_BASE_URL, SYSTEMONE_MODEL, SYSTEMONE_API_KEY
$ cp .env.example .env
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.73)
urgency: somewhat urgent (1.4)
refund: yes (0.86)
$ DECISION_ENGINE=fake pnpm start "Refund not received" "Where is my refund?"
department: support (1.00)
urgency: not urgent (0.0)
refund: no (0.00)
```

## 演習5-6：振り返る

1. `main`の振る舞いを，単体テストの項目として書いた場合は，それをどう確かめたかを振り返る．解答例では，`main`に残す処理を小さくし，手で確かめる項目にした．
2. `.env`の3行を書き換えるだけでよい．コードは変えない．APIキーは`.env`にだけ書き，Gitに入れない．
3. 判断エンジンを起動していないときや，表示の書式だけを確かめたいときに，決まった答えで動かせる．laya-serverのモデルのダウンロードを待たずに，プログラムの流れを確かめられる．
4. 変わらない．`run`は`DecisionEngine`を受け取るので，どこから判断エンジンを作ったかを知らない．
5. 解答例は設計書どおりに実装できた．Componentの図の`main`からの矢印が増えたのは，設計のとおりである．

## 演習5-7(発展)：判断エンジンにつながらないときの表示

テストリストに次の項目を足す．

- 手で確かめる：判断エンジンにつながらなければ，接続先のURLとともに短いメッセージを表示して終了コード1で終わる

`main`で`run`を`try`〜`catch`で囲み，`APIConnectionError`だけを受け止める．
ほかの例外は，想定していない誤りなので，そのまま投げ直す．

```ts
import { APIConnectionError, TypeSafeClient } from "@typesafe-ai/sdk";

  try {
    const { code, output } = await run(process.argv.slice(2), createEngine(loaded.config));
    if (code === 0) console.log(output);
    else console.error(output);
    process.exitCode = code;
  } catch (error) {
    if (!(error instanceof APIConnectionError)) throw error;
    const url = loaded.config.engine === "systemone" ? loaded.config.baseURL : "";
    console.error(`cannot reach the decision engine at ${url}: ${error.message}`);
    process.exitCode = 1;
  }
```

```console
$ SYSTEMONE_BASE_URL=http://localhost:9999 pnpm start "Refund" "Where?"
cannot reach the decision engine at http://localhost:9999: Connection error: fetch failed
```

`APIConnectionError`はSDKの型なので，この処理はSDKを知っている`main`に書く．
`run`や`triage`でSDKの例外を受け止めると，アプリの中心がSDKに依存してしまう．

解答例のパッケージでは，この実装とテストを`発展(演習5-7)`で始まるコメントとして書いている．
コメントを外して動かす方法は，リポジトリの[README](../../../../README.md#発展課題)にある．
