# Iteration 4：迷っている問い合わせを人の確認に回す(解説)

演習用の`docs/iteration-4.md`の各手順について，解答の例と考え方を説明する．

## 演習4-1：引き継いだパッケージを確かめる

Iteration 3の18のテストが通る．
2つの問い合わせの表示は次のとおりである．

```console
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.87)
urgency: somewhat urgent (1.2)
refund: yes (0.52)
$ pnpm start "Discount" "Do you offer a discount for non-profit organizations?"
department: support (0.53)
urgency: somewhat urgent (0.9)
refund: no (0.17)
```

部署の確率だけを見ると，0.87の`Refund not received`のほうが信用できそうに見える．
ただし，0.53が「3つのうちでは明らかに高い」のか「ほかとほとんど変わらない」のかは，確率1つからはわからない．
なお，非営利団体向けの割引の問い合わせなので，正しい部署はsalesである．

## 演習4-2：確信度を調べる

1. `Discount`の答えは，`probabilities`が`{"billing":0.1953,"support":0.5576,"sales":0.2471}`(小数第4位に丸めた)，`confidence`が0.0987である．supportがもっとも高いが，ほかの2つとの差は大きくない．
   `Refund not received`は，billingが0.9365，`confidence`が0.7838である．
   どちらも，`pnpm start`で見た確率とは少し違う．`triage`は部署・緊急度・返金の3つの質問をまとめて送るので，答えが`department`だけを尋ねたときと変わる([Iteration 1の資料](../../../../docs/systemone/iteration-1.md)の「1回の問い合わせで複数の質問に答えさせる」)．
2. `node`の対話モードで計算すると，0.0988になる．丸めた確率から計算したので，最後の桁がずれるが，答えとほぼ一致する．

   ```console
   > const p = [0.5576, 0.2471, 0.1953]
   undefined
   > 1 - (-p.reduce((s, x) => s + x * Math.log(x), 0)) / Math.log(3)
   0.09876699386297527
   ```

3. 結果は次のとおりである．しきい値0.2では，4つのうち1つが人の確認に回る．

   | 問い合わせ | 選ばれた部署 | 部署の確率 | `confidence` | 部署は正しいか | 0.2で人の確認に回るか |
   | --- | --- | --- | --- | --- | --- |
   | `Invoice` | billing | 0.9952 | 0.9702 | 正しい | 回らない |
   | `Students` | support | 0.557 | 0.0986 | 誤り(salesが正しい) | 回る |
   | `Cancel` | billing | 0.7158 | 0.437 | 正しい | 回らない |
   | `Enterprise` | sales | 0.922 | 0.7092 | 正しい | 回らない |

   誤って`support`とした`Students`は，確信度がもっとも低く，人の確認に回る．
   部署が正しい3つは，確信度が0.4以上あり，自動で振り分けられる．
   `Cancel`は，正しいが確信度は0.437と中くらいである．しきい値を0.5にすると，正しい`Cancel`も人の確認に回る．

## 演習4-3：テストリストを書く

解答例のテストリストは[TESTLIST.md](../TESTLIST.md)である．

- しきい値の判定は，`triage`の単体テストで，下回る場合・ちょうどの場合・既定値の場合を確かめる．fakeの答えの確信度は0.5なので，しきい値を0.6と0.5にして試した．
- 既定値のテストでは，確信度を0.19にした答えを使い，しきい値を渡さずに呼ぶ．既定値が0.2なら人の確認に回り，もっと低い値なら回らないので，0.2であることを確かめられる．
- 印の付け方は，`formatDepartment`の単体テストで確かめる．
- 結合テストでは，既定のしきい値での印，`--min-confidence`での変更，引数の誤りの3つを確かめる．0から1の数でない例は，数でない値(`abc`)・範囲の上(`1.5`)・範囲の下(`-0.1`)を1つのテストにまとめた．

## 演習4-4：設計書を更新する

| ファイル | 変更 | 理由 |
| --- | --- | --- |
| [01-context.md](../design/01-context.md) | `triage`の説明に，人の確認に回す印を足した | 外から見える振る舞いが増えた |
| [03-component.md](../design/03-component.md) | `app`の説明と，`app`→`triage`の矢印の説明に`TriageOptions`を足した | 渡すものが増えた |
| [04-code.md](../design/04-code.md) | 全体の流れに`parseCommand`と使い方の条件を，`triage`の中に`needsReview`の分岐を足した．`TriageOptions`と`needsReview`を足し，しきい値の決めごとを書いた | 新しい型と分岐 |
| [05-sequence.md](../design/05-sequence.md) | `parseCommand`と，`triage`にしきい値を渡すところを足した | 呼び出しが変わった |

`parseArgs`は`node:`の組み込みモジュールなので，Componentの図には描かない．

## 演習4-5：テスト駆動で実装する

### `triage`：確信度で人の確認に回す

```ts
  test("部署の確信度がしきい値を下回れば，人の確認に回す", async () => {
    const result = await triage(createFakeEngine(answers), ticket, { minConfidence: 0.6 });

    expect(result.needsReview).toBe(true);
  });
```

テストを実行すると，`needsReview`がないので失敗する．型検査も，引数の数と`needsReview`を指摘する．

```console
$ pnpm typecheck
test/unit/triage.test.ts(62,68): error TS2554: Expected 2 arguments, but got 3.
test/unit/triage.test.ts(64,19): error TS2339: Property 'needsReview' does not exist on type 'Triage'.
```

`TriageOptions`を足し，3つ目の引数を分割代入で受け取る．

```ts
export interface TriageOptions {
  /** 部署の判定の確信度がこれを下回ったら，人の確認に回す．0から1． */
  minConfidence?: number;
}

/** しきい値を指定しないときに使う，部署の判定の確信度のしきい値． */
export const defaultMinConfidence = 0.2;

export const triage = async (
  engine: DecisionEngine,
  ticket: Ticket,
  { minConfidence = defaultMinConfidence }: TriageOptions = {},
): Promise<Triage> => {
  // …
  return {
    department: answers.department.value,
    departmentProbability: answers.department.probability,
    needsReview: answers.department.confidence < minConfidence,
    urgency: answers.urgency.value,
    refundProbability: answers.refund.probability,
  };
};
```

`<`で比べるので，しきい値ちょうどは人の確認に回らない．
`triage`のテストは通るが，型検査は`formatTriage`のテストの`Triage`に`needsReview`がないことを指摘する．

### `formatDepartment`：人の確認に回すなら，末尾に印を付ける

```ts
  test("人の確認に回すなら，末尾に印を付ける", () => {
    expect(formatDepartment("sales", 0.4394, true)).toBe("department: sales (0.44) -> needs review");
  });
```

```console
AssertionError: expected 'department: sales (0.44)' to be 'department: sales (0.44) -> needs rev…' // Object.is equality
```

```ts
export const formatDepartment = (department: string, probability: number, needsReview: boolean): string =>
  `department: ${department} (${probability.toFixed(2)})${needsReview ? " -> needs review" : ""}`;
```

`formatTriage`は，`triage.needsReview`を`formatDepartment`に渡す．

### `run`：オプションを読む

結合テストでは，偽の`fetch`が返す部署の確信度を変えられるようにした．

```ts
const answersWith = (departmentConfidence: number) => ({
  department: {
    type: "choice",
    choice: "billing",
    confidence: departmentConfidence,
    probabilities: { billing: 0.7253, support: 0.1994, sales: 0.0753 },
  },
  // urgencyとrefundは，これまでと同じ
});
```

オプションのテストを書くと，いまの`run`は`--min-confidence`を件名として読んでしまうので失敗する．

```console
 FAIL  |integration| test/integration/app.test.ts > run > --min-confidenceで，しきい値を変える
AssertionError: expected 'department: billing (0.73)' to be 'department: billing (0.73) -> needs r…' // Object.is equality
```

引数の解析を`parseCommand`に分ける．
読めない引数は`undefined`にして，`run`で使い方の表示に変える．

```ts
const parseCommand = (args: string[]): Command | undefined => {
  let parsed;
  try {
    parsed = parseArgs({ args, options: { "min-confidence": { type: "string" } }, allowPositionals: true });
  } catch {
    // 知らないオプションや，値のないオプションがあった．
    return undefined;
  }
  const [subject, body] = parsed.positionals;
  if (subject === undefined || body === undefined) return undefined;
  const value = parsed.values["min-confidence"];
  if (value === undefined) return { subject, body, options: {} };
  const minConfidence = Number(value);
  if (!(minConfidence >= 0 && minConfidence <= 1)) return undefined;
  return { subject, body, options: { minConfidence } };
};

export const run = async (args: string[], engine: DecisionEngine): Promise<RunResult> => {
  const command = parseCommand(args);
  if (command === undefined) return { code: 2, output: usage };
  const result = await triage(engine, { subject: command.subject, body: command.body }, command.options);
  return { code: 0, output: formatTriage(result) };
};
```

`!(minConfidence >= 0 && minConfidence <= 1)`は，`abc`から作った`NaN`も範囲外として扱う．
すべてのテストが通る．

```console
$ pnpm test
 Test Files  5 passed (5)
      Tests  26 passed (26)
```

本物の判断エンジンで実行する．

```console
$ pnpm start "Discount" "Do you offer a discount for non-profit organizations?"
department: support (0.53) -> needs review
urgency: somewhat urgent (0.9)
refund: no (0.17)
$ pnpm start "Plan" "What is the difference between your plans?"
department: support (0.61) -> needs review
urgency: somewhat urgent (0.8)
refund: no (0.08)
$ pnpm start --min-confidence 0.1 "Plan" "What is the difference between your plans?"
department: support (0.61)
urgency: somewhat urgent (0.8)
refund: no (0.08)
$ pnpm start --min-confidence 2 "Hello" "Hi"
usage: triage [--min-confidence <0-1>] "<subject>" "<body>"
```

## 演習4-6：振り返る

1. 境界ちょうどの項目がなかった場合は，`<`と`<=`を取り違えても通ってしまわないかを確かめる．
2. 人の確認に回ったのは`Students`の1つで，その部署は誤っていた．しきい値を0.05に下げると，`Students`(0.0986)も自動で振り分けられ，誤った部署のまま処理される．逆に0.5に上げると，正しい`Cancel`(0.437)も人の確認に回る．ただし，4つの例だけで決めるのは危うい．Iteration 7で，もっと多くの問い合わせを使って測る．
3. `triage`が`process.argv`を読むと，テストのたびにプロセスの引数を書き換える必要がある．また，Iteration 6や8のように，コマンドライン以外から`triage`を使うときにも困る．設定は，入口(`app`)で読んで引数として渡す．
4. 解答例は設計書どおりに実装できた．引数の解析は，`run`の中に書くと長くなるので，設計の段階から`parseCommand`として分けて描いた．

## 演習4-7(発展)：確信度も表示する

テストリストに次の項目を足す．

- `triage`：部署の判定の確信度を取り出す
- `formatDepartment`：確信度を渡されたら，確率の後ろに表示する
- `formatTriage`：`showConfidence`が真なら，部署の行に確信度を表示する
- `run`：`--show-confidence`を付けると，部署の行に確信度を表示する
- 既存のテストのうち，`Triage`を作っているものに`departmentConfidence`を足す

`formatDepartment`は，確信度を省略できる4つ目の引数で受け取る．

```ts
export const formatDepartment = (
  department: string,
  probability: number,
  needsReview: boolean,
  confidence?: number,
): string => {
  const detail = confidence === undefined ? "" : `, confidence ${confidence.toFixed(2)}`;
  return `department: ${department} (${probability.toFixed(2)}${detail})${needsReview ? " -> needs review" : ""}`;
};
```

`parseCommand`では，`"show-confidence": { type: "boolean" }`を`options`に足し，`parsed.values["show-confidence"] ?? false`で読む．

```console
$ pnpm start --show-confidence "Discount" "Do you offer a discount for non-profit organizations?"
department: support (0.53, confidence 0.08) -> needs review
urgency: somewhat urgent (0.9)
refund: no (0.17)
$ pnpm start --show-confidence "Refund not received" "Where is my refund?"
department: billing (0.87, confidence 0.65)
urgency: somewhat urgent (1.2)
refund: yes (0.52)
```

解答例のパッケージでは，この実装とテストを`発展(演習4-7)`で始まるコメントとして書いている．
コメントを外して動かす方法は，リポジトリの[README](../../../../README.md#発展課題)にある．
