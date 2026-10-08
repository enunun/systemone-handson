# Iteration 0：返金を求めているかを判定する(解説)

演習用の`docs/iteration-0.md`の各手順について，解答の例と考え方を説明する．

## 演習0-1：パッケージを動かしてみる

`pnpm test`は，テストのファイルが1つもないので，次のように表示して終わる．
`vitest.config.ts`に`passWithNoTests: true`を書いてあるので，テストがなくても失敗にはならない．

```console
$ pnpm test
$ vitest run

 RUN  v5.0.2 /workspaces/iterations/iteration-0/exercise

No test files found, exiting with code 0
```

`pnpm typecheck`は，スタブの型が合っているので，何も表示せずに終わる．

`pnpm start "Refund not received" "Where is my refund?"`の出力は次のようになる．

```console
$ pnpm start "Refund not received" "Where is my refund?"
$ node src/main.ts 'Refund not received' 'Where is my refund?'
file:///workspaces/iterations/iteration-0/exercise/src/app.ts:13
  throw new Error("TODO: 件名と本文を判断エンジンに送り，formatRefundで表示する文字列を作る");
        ^

Error: TODO: 件名と本文を判断エンジンに送り，formatRefundで表示する文字列を作る
    at run (file:///workspaces/iterations/iteration-0/exercise/src/app.ts:13:9)
    at file:///workspaces/iterations/iteration-0/exercise/src/main.ts:7:32
```

`src/app.ts:13:9`は「13行目の9文字目」である．
`main.ts`の7行目が`run`を呼び，`run`の`throw`でプログラムが止まっている．
Nodeは型の注釈を取り除いて実行するが，行と列の位置は元のファイルのままなので，エラーの位置をそのまま読める．

## 演習0-2：判断エンジンに問い合わせてみる

各手順の結果は次のとおりである．件名はどれも`"Refund not received"`のままにしている．

| 手順 | 変えたところ | `refund`の確率 |
| --- | --- | --- |
| 2 | (資料の例のまま) | 0.8091 |
| 3 | 本文を`"How do I change my password?"`にする | 0.3459 |
| 4 | 本文を`"I am not happy with my purchase."`にする | 0.8995 |
| 5 | 質問の文を`"Does the customer want their money back?"`にする | 0.6961 |

手順6では，`{"error":"questions must contain 1–64 fields"}`が返る．

手順3の本文は返金と関係がないが，確率は0.35と，0に近くはならなかった．
件名の`"Refund not received"`も判断の材料(`state`)に含まれているからである．
件名を`"Order"`に変えて同じ本文を送ると，確率は0.1285まで下がる．
System Oneは，渡した`state`の全体を読んで判断する．何を`state`に含めるかも，判断の結果を左右する．

手順4の本文は，返金を求めているとは言い切れない文だが，確率は0.90と高く出た．
件名を`"Order"`に変えても0.9227で，Tev1は購入への不満を返金の要求と読んでいる．
モデルの判断が人の感覚と合わないこともある．どれくらい正しく判断できるかは，Iteration 7で測る．

手順5では，同じことを尋ねる質問でも，文が変わると確率が変わった．
質問の文は，モデルへの入力の一部である．
どの文がよいかは，実際の問い合わせで試して決める．評価の仕方は，Iteration 7で扱う．

## 演習0-3：テストリストを書く

解答例のテストリストは[TESTLIST.md](../TESTLIST.md)である．

- `formatRefund`は，しきい値の上(0.86)・下(0.08)・ちょうど(0.5)の3つの確率と，丸めを試す．しきい値ちょうどは，`>=`と`>`を取り違えるとずれる境界である．要求の「0.5以上」から，`yes`になるべきである．
- 丸めは，判断エンジンが返す`0.8631`のような4桁の確率が，表示では2桁になることを確かめる．
- `run`の結合テストは，使い方の例に合わせて，件名と本文がそろっている場合と，足りない場合の2つにした．
- 偽の`fetch`は，SDKが送ろうとしたリクエストを受け取る．これを記録すると，「件名と本文を`state`に入れて送った」「`noul`の質問を送った」ことを確かめられる．
- 引数が足りない場合は，記録したリクエストが空であることで，「判断エンジンに問い合わせない」ことを確かめる．
- 確率の場合分けは単体テストで確かめているので，結合テストでは`yes`の1例だけにした．

## 演習0-4：設計書を書く

解答例の設計書は[../design/](../design/)にある．

| ファイル | 描いたもの |
| --- | --- |
| [01-context.md](../design/01-context.md) | サポート担当者・`triage`・判断エンジン(`System_Ext`)の関係 |
| [02-container.md](../design/02-container.md) | `triage`の実行ファイルと，システムの外にあるOllama(`Container_Ext`)，その間のHTTP |
| [03-component.md](../design/03-component.md) | `main`・`app`・`refund`とSDK(`Component_Ext`)の依存関係 |
| [04-code.md](../design/04-code.md) | `string[]`から`RunResult`までの型と関数の流れ，`RunResult`と`NoulQuestion`の型 |
| [05-sequence.md](../design/05-sequence.md) | 実行から表示までの呼び出しの順序と，引数が足りないときの分岐 |

- Componentの図で，接続先のURLを知っているのは`main`だけであることを説明に書いた．`app`は，渡されたクライアントを使うだけである．
- `refund`は，型`NoulQuestion`を使うためだけにSDKを`import type`する．型だけの依存も，モジュールどうしの依存であることに変わりはないので，矢印にした．
- シーケンス図では，判断エンジンの答え(`0.8631`)が`formatRefund`で`refund: yes (0.86)`になるまでを，具体的な値で描いた．
- テストリストの単体テストは`formatRefund`(型と関数の流れの最後の矢印)を，結合テストは`run`(流れ全体)を確かめる．

## 演習0-5：テスト駆動で実装する

テストリストの上から順に進めた場合の，各段階のテストとコードを示す．

### `formatRefund`：確率が0.5以上ならyesと表示する

```ts
// test/unit/refund.test.ts
import { describe, expect, test } from "vitest";
import { formatRefund } from "../../src/refund.ts";

describe("formatRefund", () => {
  test("確率が0.5以上ならyesと表示する", () => {
    expect(formatRefund(0.86)).toBe("refund: yes (0.86)");
  });
});
```

単体テストだけを実行すると，スタブの`throw`で失敗する(Red)．

```console
$ pnpm test --project unit
 FAIL  |unit| test/unit/refund.test.ts > formatRefund > 確率が0.5以上ならyesと表示する
Error: TODO: 確率が0.5以上ならyes，それ以外はnoとし，確率を小数第2位まで添える
 ❯ formatRefund src/refund.ts:5:9
```

仮実装で通す．

```ts
// src/refund.ts
export const formatRefund = (probability: number): string => {
  return "refund: yes (0.86)";
};
```

### `formatRefund`：確率が0.5未満ならnoと表示する

```ts
  test("確率が0.5未満ならnoと表示する", () => {
    expect(formatRefund(0.08)).toBe("refund: no (0.08)");
  });
```

仮実装はいつも同じ文字列を返すので，次のように失敗する．

```console
AssertionError: expected 'refund: yes (0.86)' to be 'refund: no (0.08)' // Object.is equality

Expected: "refund: no (0.08)"
Received: "refund: yes (0.86)"
```

仮実装では通らない例が出てきたので，一般的な実装に書き換える(三角測量)．

```ts
export const formatRefund = (probability: number): string => {
  const answer = probability >= 0.5 ? "yes" : "no";
  return `refund: ${answer} (${probability.toFixed(2)})`;
};
```

### `formatRefund`：確率がちょうど0.5ならyesと表示する

```ts
  test("確率がちょうど0.5ならyesと表示する", () => {
    expect(formatRefund(0.5)).toBe("refund: yes (0.50)");
  });
```

このテストは，書いた時点で通る．
前の段階で，要求どおり`>=`で比べる実装にしたからである．
テストを書いたら最初から通った，ということは，その振る舞いがすでにできているということである．
このテストは「0.5ちょうどはyes」という要求を表す例として残しておく．
`toFixed(2)`は，`0.5`を`"0.50"`のように，小数第2位までを必ず表示する．

### `formatRefund`：確率を小数第2位までに丸める

```ts
  test("確率を小数第2位までに丸める", () => {
    expect(formatRefund(0.8631)).toBe("refund: yes (0.86)");
  });
```

このテストも書いた時点で通る．`toFixed(2)`が丸めも行うからである．

### `run`：件名と本文を判断エンジンに送り，返金の判定を表示する

まず，`src/refund.ts`に質問を足す．

```ts
// src/refund.ts
import type { NoulQuestion } from "@typesafe-ai/sdk";

/** 返金を求めているかを尋ねる，はい・いいえの質問． */
export const refundQuestion: NoulQuestion = { type: "noul", instructions: "Is the customer asking for a refund?" };
```

結合テストでは，偽の`fetch`を渡した`TypeSafeClient`を作る．
偽の`fetch`は，決まった確率を答え，受け取ったリクエストの本文を配列に記録する．

```ts
// test/integration/app.test.ts
import { TypeSafeClient } from "@typesafe-ai/sdk";
import { describe, expect, test } from "vitest";
import { run } from "../../src/app.ts";

// 判断エンジンの代わりに，決まった答えを返すfetch．受け取ったリクエストの本文をrequestsに記録する．
const fakeFetch = (noul: number, requests: unknown[]) => async (_url: string, init?: RequestInit) => {
  requests.push(JSON.parse(String(init?.body)));
  return Response.json({
    model: "tev1:0.8b",
    answers: { refund: { type: "noul", noul } },
    usage: { input_tokens: 53, output_tokens: 0 },
  });
};

const clientWith = (noul: number, requests: unknown[] = []) =>
  new TypeSafeClient({ baseURL: "http://ollama.test", apiKey: "test", fetch: fakeFetch(noul, requests) });

describe("run", () => {
  test("件名と本文を判断エンジンに送り，返金の判定を表示する", async () => {
    const requests: unknown[] = [];

    const result = await run(["Refund not received", "Where is my refund?"], clientWith(0.8631, requests));

    expect(result).toEqual({ code: 0, output: "refund: yes (0.86)" });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      state: { subject: "Refund not received", body: "Where is my refund?" },
      questions: { refund: { type: "noul", instructions: "Is the customer asking for a refund?" } },
    });
  });
});
```

- リクエストの本文には，SDKが`model`も入れる．モデル名はこのテストで確かめたいことではないので，`toEqual`ではなく`toMatchObject`で，`state`と`questions`だけを確かめた．
- `fakeFetch`と`clientWith`は，確率と記録先を受け取る関数にした．次のテストでも使い回せる．

結合テストだけを実行すると，`run`のスタブの`throw`で失敗する(Red)．
単体テストで作った部品を組み合わせて実装する．

```ts
// src/app.ts
import type { TypeSafeClient } from "@typesafe-ai/sdk";
import { formatRefund, refundQuestion } from "./refund.ts";

export const run = async (args: string[], client: TypeSafeClient): Promise<RunResult> => {
  const [subject, body] = args;
  const result = await client.systemOne({
    state: { subject, body },
    questions: { refund: refundQuestion },
  });
  return { code: 0, output: formatRefund(result.answers.refund.noul) };
};
```

テストは通るが，型検査は失敗する．

```console
$ pnpm typecheck
src/app.ts(16,5): error TS2322: Type '{ subject: string | undefined; body: string | undefined; }' is not assignable to type 'EntryType'.
  Type '{ subject: string | undefined; body: string | undefined; }' is not assignable to type 'null'.
```

配列から分割代入で取り出した値は，配列が短ければ`undefined`になる．
このリポジトリの型検査は`noUncheckedIndexedAccess`を有効にしているので，`subject`と`body`の型は`string | undefined`になる．
SDKの`state`は`undefined`を含む値を受け付けないので，型が合わない．
これは，テストリストの次の項目「件名と本文がそろっていなければ使い方を表示する」で扱う場合である．

### `run`：件名と本文がそろっていなければ，判断エンジンへ送らずに使い方を表示する

```ts
  test("件名と本文がそろっていなければ，判断エンジンへ送らずに使い方を表示する", async () => {
    const requests: unknown[] = [];

    const result = await run(["Refund not received"], clientWith(0.8631, requests));

    expect(result).toEqual({ code: 2, output: 'usage: triage "<subject>" "<body>"' });
    expect(requests).toEqual([]);
  });
```

いまの`run`は，本文が`undefined`のまま問い合わせてしまうので，次のように失敗する．

```console
AssertionError: expected { code: +0, …(1) } to deeply equal { code: 2, …(1) }

- Expected
+ Received

  {
-   "code": 2,
-   "output": "usage: triage \"<subject>\" \"<body>\"",
+   "code": 0,
+   "output": "refund: yes (0.86)",
  }
```

問い合わせる前に，件名と本文がそろっているかを確かめる．

```ts
const usage = 'usage: triage "<subject>" "<body>"';

export const run = async (args: string[], client: TypeSafeClient): Promise<RunResult> => {
  const [subject, body] = args;
  if (subject === undefined || body === undefined) return { code: 2, output: usage };
  const result = await client.systemOne({
    state: { subject, body },
    questions: { refund: refundQuestion },
  });
  return { code: 0, output: formatRefund(result.answers.refund.noul) };
};
```

`if`で`undefined`の場合を先に返すと，その後ろでは`subject`と`body`の型が`string`に絞り込まれる．
テストと型検査の両方が通る．

```console
$ pnpm test
 Test Files  2 passed (2)
      Tests  6 passed (6)
```

最後に，本物の判断エンジンで実行する．

```console
$ pnpm start "Refund not received" "Where is my refund?"
refund: yes (0.81)
$ pnpm start "Login problem" "I cannot log in since yesterday."
refund: no (0.14)
$ pnpm start "Refund not received"
usage: triage "<subject>" "<body>"
```

最後の例では，`pnpm`が`[ELIFECYCLE] Command failed with exit code 2.`とも表示する．プログラムが終了コード2で終わったことを，pnpmが知らせている．

## 演習0-6：振り返る

1. テストリストの粒度は人によって違ってよい．たとえば確率が0や1のときを試す項目を足した人もいるだろう．しきい値の前後と，ちょうどの値を試していれば，比べ方の誤りは見つかる．
2. `>`で比べる誤りは，単体テストの「確率がちょうど0.5ならyesと表示する」で見つかる．結合テストは0.8631しか試していないので見つからない．境界の細かい場合分けは単体テストの役目である．
3. 偽の`fetch`では，本物の判断エンジンが「その問い合わせにどんな確率を返すか」は確かめられない．また，URLやAPIの形が本物と合っているかも，偽の`fetch`は確かめない．前者は`pnpm start`やcurlで実際に試して確かめる．後者は，SDKが本物のAPIに合わせて作られていることに頼っている．
4. URLを知っているのは`main`だけである．`run`は渡されたクライアントを使うだけなので，テストでは偽の`fetch`を持つクライアントを渡せた．接続先を変えるときも，`main`だけを変えればよい．この考え方は，Iteration 3と5で広げていく．
5. 解答例は設計書どおりに実装できた．型検査で見つかった`undefined`の扱いは，型と関数の流れの「件名か本文がない」の分岐として，設計の段階から描いてある．

## 演習0-7(発展)：迷っているときは「unsure」と表示する

テストリストに次の項目を足す．

- `formatRefund`：確率が0.4以上0.6未満ならunsureと表示する
- `formatRefund`：確率がちょうど0.4ならunsure，ちょうど0.6ならyesと表示する
- 既存の「確率がちょうど0.5ならyesと表示する」の期待値を`refund: unsure (0.50)`に変える(上の1つ目の項目にまとめてよい)

しきい値が2つになるので，条件演算子を2段にした．

```ts
export const formatRefund = (probability: number): string => {
  const answer = probability >= 0.6 ? "yes" : probability >= 0.4 ? "unsure" : "no";
  return `refund: ${answer} (${probability.toFixed(2)})`;
};
```

```console
$ pnpm start "Order" "My package arrived late and the box was crushed."
refund: unsure (0.43)
$ pnpm start "Refund not received" "Where is my refund?"
refund: yes (0.81)
```

確率が0.5に近いときは判断を保留する．この考え方は，Iteration 4で「担当部署の判定を人の確認へ回す機能」として作る．

解答例のパッケージでは，この実装とテストを`発展(演習0-7)`で始まるコメントとして書いている．
コメントを外して動かす方法は，リポジトリの[README](../../../../README.md#発展課題)にある．
