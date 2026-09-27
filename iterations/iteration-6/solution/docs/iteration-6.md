# Iteration 6：ファイルの問い合わせをまとめて振り分ける(解説)

演習用の`docs/iteration-6.md`の各手順について，解答の例と考え方を説明する．

## 演習6-1：引き継いだパッケージを確かめる

Iteration 5の32のテストが通る．
`data/tickets.jsonl`には22行あり，21行目が`this line is not JSON`である．

## 演習6-2：ファイルと並行処理を学ぶ

```console
> JSON.parse('{"subject": "A", "body": "a"}')
{ subject: 'A', body: 'a' }
> JSON.parse("not json")
Uncaught SyntaxError: Unexpected token 'o', "not json" is not valid JSON
> JSON.parse('["A", "a"]')
[ 'A', 'a' ]
> JSON.parse('{"subject": 1}')
{ subject: 1 }
> "a\n\nb\n".split("\n")
[ 'a', '', 'b', '' ]
```

2の2つは，JSONとしては読めるが，`subject`と`body`が文字列ではないので，問い合わせとしては使えない．
3では，空の行と，末尾の改行の後ろが，空文字列の要素になる．空の行を飛ばすと，末尾の改行も一緒に扱える．

```console
> let t = Date.now(); for (const ms of [300, 300, 300]) await wait(ms); Date.now() - t
903
> t = Date.now(); await Promise.all([300, 300, 300].map(wait)); Date.now() - t
301
```

1つずつ`await`すると，待ち時間が足し合わされる．
`Promise.all`では3つを並行して待つので，1つ分の時間で終わる．

## 演習6-3：テストリストを書く

解答例のテストリストは[TESTLIST.md](../TESTLIST.md)である．

- `parseTickets`は文字列を受け取るので，単体テストでファイルを作る必要はない．読めない行として，JSONでない行・フィールドを欠いた行・型が違う行・配列を書いた行を試した．
- `mapWithConcurrency`は，判断エンジンを使わずに，待つだけの関数でテストした．結果の順は，待ち時間をばらばらにして，先に終わったものが先に並ばないことで確かめる．同時に実行した数は，実行中の数の最大値で確かめる．
- `summarize`の例には，人の確認に回したものを2件混ぜ，部署の件数に含まれないことと，0件の部署が0として残ることを確かめる．
- 結合テストは，一時ディレクトリにファイルを書いて`run`を呼ぶ．ファイルが読めない場合と，引数が足りない場合も確かめる．
- 既存の結合テストのうち，使い方の文を比べているものは，2行の使い方に変える．

## 演習6-4：設計書を更新する

| ファイル | 変更 | 理由 |
| --- | --- | --- |
| [01-context.md](../design/01-context.md) | 利用者が渡すものに，問い合わせのファイルを足した | 使い方が増えた |
| [02-container.md](../design/02-container.md) | 問い合わせのファイル(`ContainerDb`)を足し，同時に4件まで送ることを書いた | データの置き場所が増えた |
| [03-component.md](../design/03-component.md) | `batch`を足した．ファイルを読むのは`app`であることを書いた | 新しいモジュール |
| [04-code.md](../design/04-code.md) | サブコマンドで分かれる流れと，`runBatch`の流れ，`ParsedTickets`・`Summary`を足した | 新しい型と関数 |
| [05-sequence.md](../design/05-sequence.md) | `triage batch`の図を足した | 新しい使い方 |

- `batch`は，`triage`の型(`Ticket`・`Triage`)と部署の名前を使うので，`triage`に依存する．`format`は，`Summary`の型を使うので`batch`に依存する．
- `batch`は`triage`関数を呼ばない．`mapWithConcurrency`は，どんな非同期の関数でも受け取れる汎用の部品にし，`triage`を呼ぶ関数は`app`で渡す．

## 演習6-5：テスト駆動で実装する

### `parseTickets`

```ts
const isTicket = (value: unknown): value is Ticket =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Record<string, unknown>).subject === "string" &&
  typeof (value as Record<string, unknown>).body === "string";

const parseLine = (line: string): Ticket | undefined => {
  try {
    const value: unknown = JSON.parse(line);
    return isTicket(value) ? { subject: value.subject, body: value.body } : undefined;
  } catch {
    return undefined;
  }
};

export const parseTickets = (text: string): ParsedTickets => {
  const tickets: Ticket[] = [];
  const errors: string[] = [];
  text.split("\n").forEach((line, index) => {
    if (line.trim() === "") return;
    const ticket = parseLine(line);
    if (ticket === undefined) errors.push(`line ${index + 1}: skipped (not a JSON object with subject and body)`);
    else tickets.push(ticket);
  });
  return { tickets, errors };
};
```

型ガードで確かめたあとも，`{ subject: value.subject, body: value.body }`と作り直した．
行に`subject`と`body`以外のプロパティがあっても，`Ticket`には入れない．

### `mapWithConcurrency`

```ts
  test("同時に実行する数を，指定した数までにする", async () => {
    let running = 0;
    let maxRunning = 0;

    await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4, async () => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
    });

    expect(maxRunning).toBe(4);
  });
```

`Promise.all(items.map(fn))`で書くと，すべてが同時に始まるので`maxRunning`は10になり，このテストで失敗する．
作業者を`limit`人用意する形にする．

```ts
export const mapWithConcurrency = async <T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = [];
  let next = 0;
  // limit個の作業者が，まだ手の付いていない要素を1つずつ取って処理する．
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};
```

結果は，終わった順ではなく，`index`の位置に入れるので，元の順に並ぶ．
`noUncheckedIndexedAccess`があるので，`items[index]`は`T | undefined`になる．`while`の条件で範囲内であることを確かめているので，`as T`とした．

### `summarize`と`formatSummary`

```ts
export const summarize = (results: readonly Triage[]): Summary => {
  const departments: Record<string, number> = Object.fromEntries(departmentNames.map((name) => [name, 0]));
  let needsReview = 0;
  for (const result of results) {
    if (result.needsReview) needsReview += 1;
    else departments[result.department] = (departments[result.department] ?? 0) + 1;
  }
  return { departments, needsReview };
};
```

部署の名前は，`triage.ts`の`departmentNames`(`Object.keys(departmentQuestion.options)`)から作る．
0件の部署も表示でき，部署の並び順も質問の選択肢の順にそろう．

### `run batch`

結合テストでは，リクエストの件名によって答えを変える偽の`fetch`を使った．
件名が`Team plan`のときだけ，確信度を0.02にする．

実装する前は，`batch`が件名として読まれるので，すべてのテストが失敗する．

```console
     × ファイルの問い合わせを振り分け，部署ごとの件数と人の確認に回した件数を表示する 56ms
     × 読めない行は，行番号とともに知らせて飛ばす 4ms
     × --min-confidenceで，しきい値を変える 7ms
     × ファイルが読めなければ，終了コード1で知らせる 3ms
     × ファイルを指定しなければ，使い方を表示する 2ms
```

`Command`を2種類のユニオン型にし，`positionals`の最初で分ける．

```ts
type Command =
  | { kind: "single"; subject: string; body: string; options: TriageOptions }
  | { kind: "batch"; file: string; options: TriageOptions };
```

```ts
  const positionals = parsed.positionals;
  if (positionals[0] === "batch") {
    const [, file, ...rest] = positionals;
    return file !== undefined && rest.length === 0 ? { kind: "batch", file, options } : undefined;
  }
  const [subject, body, ...rest] = positionals;
  if (subject === undefined || body === undefined || rest.length > 0) return undefined;
  return { kind: "single", subject, body, options };
```

引数が多すぎる場合(`rest.length > 0`)も，使い方を表示するようにした．
ファイルを読んで振り分ける処理は，`runBatch`に分けた．

```ts
const runBatch = async (file: string, options: TriageOptions, engine: DecisionEngine): Promise<RunResult> => {
  let text;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    return { code: 1, output: `cannot read ${file}: ${error instanceof Error ? error.message : String(error)}` };
  }
  const { tickets, errors } = parseTickets(text);
  const results = await mapWithConcurrency(tickets, batchConcurrency, (ticket) => triage(engine, ticket, options));
  return { code: 0, output: [...errors, formatSummary(summarize(results))].join("\n") };
};
```

すべてのテストが通る．

```console
$ pnpm test
 Test Files  8 passed (8)
      Tests  45 passed (45)
```

本物の判断エンジンで実行する．

```console
$ pnpm start batch data/tickets.jsonl
line 21: skipped (not a JSON object with subject and body)
billing: 4, support: 6, sales: 0, needs review: 11
$ pnpm start batch --min-confidence 0.05 data/tickets.jsonl
line 21: skipped (not a JSON object with subject and body)
billing: 5, support: 9, sales: 3, needs review: 4
$ pnpm start batch
usage: triage [--min-confidence <0-1>] "<subject>" "<body>"
       triage batch [--min-confidence <0-1>] <file>
```

## 演習6-6：振り返る

1. `mapWithConcurrency`のテストを書かなかった場合は，`Promise.all`をそのまま使って，同時に送る数の制限が抜けていないかを確かめる．
2. devcontainerの中のlaya-serverでは，同時に送る数が1のときと4のときで，どちらも約10秒かかる．laya-serverは1つのCPUで1件ずつ推論するからである．制限の目的は，速さではなく，判断エンジンへ送りすぎないことである．
3. しきい値0.05では，人の確認に回る件数は11件から4件に減り，salesにも3件が振り分けられた．どちらのしきい値がよいかは，振り分けた結果が正しいかどうかを見ないと決められない．それを測るのが，Iteration 7である．
4. 解答例は設計書どおりに実装できた．`mapWithConcurrency`を汎用の部品にしたので，`batch`から`triage`関数への依存はない．

## 演習6-7(発展)：同時に送る数を指定する

テストリストに次の項目を足す．

- `run batch`：`--concurrency`で，同時に送る数を変える
- `run batch`：`--concurrency`が1以上の整数でなければ，使い方を表示する
- 使い方の文に`[--concurrency <n>]`を足す

`Command`の`batch`に`concurrency`を足し，`parseCommand`で読む．

```ts
    const [, file, ...rest] = positionals;
    const concurrency = Number(parsed.values.concurrency ?? batchConcurrency);
    if (!Number.isInteger(concurrency) || concurrency < 1) return undefined;
    return file !== undefined && rest.length === 0 ? { kind: "batch", file, options, concurrency } : undefined;
```

```console
$ time node --env-file-if-exists=.env src/main.ts batch --concurrency 1 data/tickets.jsonl
line 21: skipped (not a JSON object with subject and body)
billing: 4, support: 6, sales: 0, needs review: 11

real    0m10.136s
user    0m0.213s
sys     0m0.075s
$ time node --env-file-if-exists=.env src/main.ts batch --concurrency 4 data/tickets.jsonl
line 21: skipped (not a JSON object with subject and body)
billing: 4, support: 6, sales: 0, needs review: 11

real    0m10.225s
user    0m0.219s
sys     0m0.063s
```

`--concurrency`が同時に送る数を変えることは，テストでは`mapWithConcurrency`のテストで確かめている．
結合テストでは，同時に送った数を偽の`fetch`の中で数えると確かめられる．
