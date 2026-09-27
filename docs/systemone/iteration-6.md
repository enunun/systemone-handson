# Iteration 6：ファイル，JSON Lines，並行処理

Iteration 6で初めて使う概念・APIを説明する．
コマンドの例は，devcontainerの中で実行した実際の結果である．

## JSON Lines

JSON Lines(JSONL)は，1行に1つのJSONを書く形式である．
ファイル全体を1つのJSONの配列にするのと比べて，次の利点がある．

- 1行ずつ読んで処理できる．大きなファイルでも，全体を読み込まずに扱える．
- 1行が壊れていても，ほかの行は読める．
- 末尾に行を足すだけで，データを追加できる．

```text
{"subject": "Refund not received", "body": "I cancelled two weeks ago and still have no refund."}
{"subject": "Login problem", "body": "I cannot log in since yesterday."}
```

文字列を行に分けるには`split("\n")`，1行を読むには`JSON.parse`を使う．
`JSON.parse`は，JSONとして読めない文字列を渡されると例外を投げる．

```ts
JSON.parse('{"subject": "A"}'); // { subject: "A" }
JSON.parse("not json"); // SyntaxError
```

`JSON.parse`の結果は，どんな形の値でもありうる．
型を`unknown`として受け取り，必要なプロパティがあるかを確かめてから使う．

```ts
const isGreeting = (value: unknown): value is { name: string } =>
  typeof value === "object" && value !== null && typeof (value as Record<string, unknown>).name === "string";
```

戻り値の型を`value is 型`と書いた関数を，型ガードと呼ぶ．
`if (isGreeting(value))`の中では，`value`の型が`{ name: string }`に絞り込まれる．

## ファイルを読む

`node:fs/promises`の`readFile`は，ファイルの中身を`Promise`で返す．
第2引数に`"utf8"`を渡すと，文字列として読む．

```ts
import { readFile } from "node:fs/promises";

const text = await readFile("data/tickets.jsonl", "utf8");
```

ファイルがなければ，`ENOENT`というコードを持つ例外を投げる．

```console
ENOENT: no such file or directory, open 'missing.jsonl'
```

ファイルは，プログラムの入口に近いところ(`app`)で読む．
ファイルの中身を解析する関数(`parseTickets`)は，文字列を受け取る形にすると，テストでファイルを作らずに済む．

## サブコマンド

1つのプログラムで複数の働きを持たせるときは，最初の位置引数で働きを選ぶことが多い(`git commit`・`git log`など)．
これをサブコマンドと呼ぶ．
`parseArgs`の`positionals`の最初の要素で分ける．

```ts
const { positionals } = parseArgs({ args, allowPositionals: true });
if (positionals[0] === "batch") {
  // triage batch <file>
}
```

## 並行して問い合わせる

`triage`は`Promise`を返す．
複数の問い合わせを1件ずつ`await`すると，前の答えが返るまで次を送らない．

`Promise.all`に`Promise`の配列を渡すと，すべてを並行して待ち，結果を同じ順の配列で返す．

```ts
const answers = await Promise.all(tickets.map((ticket) => triage(engine, ticket)));
```

ただし，ファイルに1000件あれば，1000件を一度に送ってしまう．
判断エンジンに負荷がかかりすぎたり，APIの利用制限(レート制限)に引っかかったりする．
そこで，同時に送る数に上限を設ける．

上限を設ける方法の1つは，上限の数だけ「作業者」を用意し，各作業者がまだ手の付いていない要素を1つずつ取って処理することである．

```ts
const worker = async (): Promise<void> => {
  while (next < items.length) {
    const index = next;
    next += 1;
    results[index] = await fn(items[index]);
  }
};
await Promise.all(Array.from({ length: limit }, worker));
```

JavaScriptは1つのスレッドで動くので，`next`を読んで増やす2行の間に，ほかの作業者が割り込むことはない．
`await`のところでだけ，ほかの作業者に処理が移る．

## 並行しても速くならないとき

laya-serverは，1つのCPUで1件ずつ推論する．
そのため，devcontainerの中では，同時に送る数を増やしても速くならない．
サンプルの21件を振り分けるのにかかった時間は，同時に送る数が1のときと4のときで，どちらも約10秒だった．

並行して送ると速くなるのは，待ち時間の多くが通信にある場合や，判断エンジンが複数の問い合わせを同時に処理できる場合である．
インターネットの向こうにある本家Jevでは，通信の待ち時間があるので，並行して送る効果が出やすい．
どちらの場合も，上限を設けておけば，判断エンジンに送りすぎることはない．

## テストで一時ファイルを使う

ファイルを読む処理の結合テストでは，テストの中で一時ディレクトリを作り，そこにファイルを書く．

```ts
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = await mkdtemp(path.join(tmpdir(), "triage-"));
await writeFile(path.join(dir, "tickets.jsonl"), '{"subject": "A", "body": "a"}');
// …テスト…
await rm(dir, { recursive: true, force: true });
```

Vitestの`beforeEach`・`afterEach`に，テストごとの準備と後片付けを書ける．
