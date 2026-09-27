# Iteration 1：担当部署を判定する(解説)

演習用の`docs/iteration-1.md`の各手順について，解答の例と考え方を説明する．

## 演習1-1：引き継いだパッケージを確かめる

テストは，Iteration 0の単体テスト4つと結合テスト2つが通る．

```console
$ pnpm test
 Test Files  2 passed (2)
      Tests  6 passed (6)
```

プログラムを実行すると，Iteration 0と同じく`refund: yes (0.86)`だけが表示される．

## 演習1-2：choiceの質問を試す

同じ3つの選択肢で，説明文の有無を変えて送った結果は次のとおりである．

| 問い合わせ | 説明文 | 選ばれた部署 | `probabilities` | `confidence` |
| --- | --- | --- | --- | --- |
| `Refund not received`・`Where is my refund?` | あり | billing | billing 0.7253，support 0.1994，sales 0.0753 | 0.318 |
| 同上 | なし | billing | billing 0.5122，support 0.3877，sales 0.1001 | 0.144 |
| `Login problem`・`I cannot log in since yesterday.` | あり | support | billing 0.0745，support 0.8427，sales 0.0828 | 0.5048 |
| 同上 | なし | support | billing 0.0447，support 0.9103，sales 0.045 | 0.6686 |
| `Hello`・`I have a question about my account.` | あり | support | billing 0.2407，support 0.5877，sales 0.1717 | 0.1283 |

- 返金の問い合わせでは，説明文を外すと`billing`の確率が下がった．「refunds」が`billing`の説明にあることが手がかりになっていた．
- ログインの問い合わせでは，説明文を外しても`support`が選ばれ，確率はむしろ上がった．説明文は，いつも確率を上げるものではない．ラベルの名前だけで十分に伝わる場合もある．
- 手順4では，`department`と`refund`のどちらにも，1つずつ送ったときと同じ答えが返る．
- 手順5の`Hello`は，確率が分散し，`confidence`も低い．どの部署とも言い切れない問い合わせでは，こうなる．Iteration 4では，この`confidence`を使って人の確認に回す．

## 演習1-3：テストリストを書く

解答例のテストリストは[TESTLIST.md](../TESTLIST.md)である．

- `formatDepartment`は，選ばれた部署が異なる2つの答え(billingとsupport)を試す．1つだけだと，「billingの確率を表示する」「分布の最初の値を表示する」のような誤りと区別できない．
- 2つ目の例では，選ばれた部署(support)を，分布の最初(billing)ではない位置にした．
- 結合テストの「返金の判定を表示する」は，期待する出力が2行になり，送るリクエストに部署の質問が入るので，「担当部署と返金の判定を表示する」に書き換えた．
- 「1回の問い合わせで尋ねる」ことは，記録したリクエストが1つで，その`questions`に2つの質問があることで確かめる．
- 使い方の表示は変わらないので，その結合テストは変えない．

## 演習1-4：設計書を更新する

Iteration 0からの変更は次のとおりである．

| ファイル | 変更 | 理由 |
| --- | --- | --- |
| [01-context.md](../design/01-context.md) | `triage`の説明に担当部署を足した | システムが判定するものが増えた |
| [02-container.md](../design/02-container.md) | 説明と，2つの質問を同じリクエストで送る決めごとを足した | 通信の回数は変わらないことを示す |
| [03-component.md](../design/03-component.md) | `department`と，`app`・SDKとの矢印を足した | 新しいモジュール |
| [04-code.md](../design/04-code.md) | 担当部署の答えが1行目になる流れと，`ChoiceQuestion`・`ChoiceResponse`・`departmentQuestion`を足した | 新しい型と関数 |
| [05-sequence.md](../design/05-sequence.md) | 送る質問と返る答え，`formatDepartment`の呼び出しを足した | 問い合わせの中身が変わった |

`department`は`refund`と同じ形(質問の定数と，表示の関数)にした．
質問の種類ごとにモジュールを分けると，どの判定をどのファイルで扱うかがわかりやすい．

## 演習1-5：テスト駆動で実装する

### `formatDepartment`：選ばれた部署と，その確率を表示する

```ts
// test/unit/department.test.ts
import { describe, expect, test } from "vitest";
import { formatDepartment } from "../../src/department.ts";

describe("formatDepartment", () => {
  test("選ばれた部署と，その確率を表示する", () => {
    const answer = {
      type: "choice",
      choice: "billing",
      confidence: 0.32,
      probabilities: { billing: 0.7253, support: 0.1994, sales: 0.0753 },
    } as const;
    expect(formatDepartment(answer)).toBe("department: billing (0.73)");
  });
});
```

`src/department.ts`に`throw new Error("TODO")`だけの`formatDepartment`を作ってから実行し，Redを確かめる．

```console
 FAIL  |unit| test/unit/department.test.ts > formatDepartment > 選ばれた部署と，その確率を表示する
Error: TODO
 ❯ formatDepartment src/department.ts:7:9
```

仮実装で通す．

```ts
export const formatDepartment = (answer: ChoiceResponse): string => {
  return "department: billing (0.73)";
};
```

### `formatDepartment`：確率の分布から，選ばれた部署の確率を取り出す

```ts
  test("確率の分布から，選ばれた部署の確率を取り出す", () => {
    const answer = {
      type: "choice",
      choice: "support",
      confidence: 0.5,
      probabilities: { billing: 0.0745, support: 0.8427, sales: 0.0828 },
    } as const;
    expect(formatDepartment(answer)).toBe("department: support (0.84)");
  });
```

```console
AssertionError: expected 'department: billing (0.73)' to be 'department: support (0.84)' // Object.is equality

Expected: "department: support (0.84)"
Received: "department: billing (0.73)"
```

一般的な実装に書き換える．

```ts
export const formatDepartment = (answer: ChoiceResponse): string => {
  const probability = answer.probabilities[answer.choice];
  return `department: ${answer.choice} (${probability.toFixed(2)})`;
};
```

テストは通るが，型検査は失敗する．

```console
$ pnpm typecheck
src/department.ts(8,43): error TS18048: 'probability' is possibly 'undefined'.
```

`answer.choice`は必ず`probabilities`のキーのどれかなので，`undefined`になることはない．
しかし型の上ではそれを表せないので，`?? 0`で`number`にする．
コメントで，0になる場合がないことを残しておく．

```ts
export const formatDepartment = (answer: ChoiceResponse): string => {
  // 選ばれた部署は必ずprobabilitiesのキーにあるが，型の上では見つからない場合もありうるので0とする．
  const probability = answer.probabilities[answer.choice] ?? 0;
  return `department: ${answer.choice} (${probability.toFixed(2)})`;
};
```

### `run`：担当部署と返金の判定を表示する

結合テストの偽の`fetch`が，2つの質問の答えを返すようにする．
答えは，演習1-2で実際に返ってきたものを使った．

```ts
// test/integration/app.test.ts
const answers = {
  department: {
    type: "choice",
    choice: "billing",
    confidence: 0.32,
    probabilities: { billing: 0.7253, support: 0.1994, sales: 0.0753 },
  },
  refund: { type: "noul", noul: 0.8631 },
};

const fakeFetch = (requests: unknown[]) => async (_url: string, init?: RequestInit) => {
  requests.push(JSON.parse(String(init?.body)));
  return Response.json({ model: "laya", answers, usage: { input_tokens: 120, output_tokens: 0 } });
};
```

Iteration 0では確率を引数にとっていたが，答えが2つになったので，決まった答えを返す形にした．
期待値を書き換える．

```ts
  test("件名と本文を判断エンジンに送り，担当部署と返金の判定を表示する", async () => {
    const requests: unknown[] = [];

    const result = await run(["Refund not received", "Where is my refund?"], clientWith(requests));

    expect(result).toEqual({ code: 0, output: "department: billing (0.73)\nrefund: yes (0.86)" });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      state: { subject: "Refund not received", body: "Where is my refund?" },
      questions: {
        department: { type: "choice", instructions: "Which team should handle this ticket?" },
        refund: { type: "noul", instructions: "Is the customer asking for a refund?" },
      },
    });
  });
```

```console
AssertionError: expected { code: +0, …(1) } to deeply equal { code: +0, …(1) }

- Expected
+ Received

  {
    "code": 0,
-   "output": "department: billing (0.73)
- refund: yes (0.86)",
+   "output": "refund: yes (0.86)",
  }
```

`src/department.ts`に質問を足し，`run`で2つの質問を送る．

```ts
// src/department.ts
export const departmentQuestion: ChoiceQuestion = {
  type: "choice",
  instructions: "Which team should handle this ticket?",
  criteria: {
    billing: "payments, refunds, invoices and charges",
    support: "product help, bugs and how-to questions",
    sales: "new purchases, pricing and plan upgrades",
  },
};
```

```ts
// src/app.ts
export const run = async (args: string[], client: TypeSafeClient): Promise<RunResult> => {
  const [subject, body] = args;
  if (subject === undefined || body === undefined) return { code: 2, output: usage };
  const result = await client.systemOne({
    state: { subject, body },
    questions: { department: departmentQuestion, refund: refundQuestion },
  });
  const lines = [formatDepartment(result.answers.department), formatRefund(result.answers.refund.noul)];
  return { code: 0, output: lines.join("\n") };
};
```

すべてのテストが通る．

```console
$ pnpm test
 Test Files  3 passed (3)
      Tests  8 passed (8)
```

本物の判断エンジンで実行する．

```console
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.73)
refund: yes (0.86)
$ pnpm start "Login problem" "I cannot log in since yesterday."
department: support (0.84)
refund: no (0.08)
$ pnpm start "Team plan" "We are 20 people and want to upgrade to the team plan. What does it cost?"
department: sales (0.44)
refund: no (0.07)
```

## 演習1-6：振り返る

1. 部署の例を1つしか書かなかった場合は，仮実装のまま通っていないかを確かめる．選ばれた部署の異なる例が2つあれば，仮実装は通らない．
2. 「分布の最初の部署の確率」を表示する誤りは，2つ目の単体テスト(supportが選ばれ，最初はbilling)で見つかる．最初の例だけでは，選ばれた部署がたまたま分布の最初なので見つからない．
3. 説明文は，`departmentQuestion`の`criteria`の値である．テストでは「説明文を付けた質問を送った」ことは確かめられるが，「その説明文でモデルが正しく判断する」ことは確かめられない．判断の質は，実際の問い合わせで試して確かめる．その仕組みは，Iteration 7で作る．
4. 解答例は設計書どおりに実装できた．`?? 0`は，図には描かず，Codeの図の下の決めごとにも書いていない．表示の結果が変わる分岐ではないからである．

## 演習1-7(発展)：2番目に確からしい部署も表示する

テストリストに次の項目を足す．

- `formatDepartment`：2番目に確からしい部署とその確率を添える
- 既存の`formatDepartment`の2つのテストの期待値を，`next: …`付きに変える
- 結合テストの期待値の1行目を，`next: …`付きに変える

```ts
export const formatDepartment = (answer: ChoiceResponse): string => {
  const probability = answer.probabilities[answer.choice] ?? 0;
  const ranked = Object.entries(answer.probabilities).toSorted(([, a], [, b]) => b - a);
  const next = ranked[1];
  const suffix = next === undefined ? "" : `, next: ${next[0]} ${next[1].toFixed(2)}`;
  return `department: ${answer.choice} (${probability.toFixed(2)}${suffix})`;
};
```

```console
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.73, next: support 0.20)
refund: yes (0.86)
$ pnpm start "Hello" "I have a question about my account."
department: support (0.59, next: billing 0.24)
refund: no (0.10)
```

`toSorted`は，元の配列を変えずに，並べ替えた新しい配列を返す．
比べる関数が負の値を返すと前に，正の値を返すと後ろに並ぶので，`b - a`で確率の大きい順になる．

解答例のパッケージでは，この実装とテストを`発展(演習1-7)`で始まるコメントとして書いている．
コメントを外して動かす方法は，リポジトリの[README](../../../../README.md#発展課題)にある．
