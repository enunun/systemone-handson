# Iteration 6：ファイルの問い合わせをまとめて振り分ける(演習)

## このIterationで作るもの

`triage batch <ファイル>`で，ファイルに並んだ問い合わせをまとめて振り分け，部署ごとの件数と，人の確認に回した件数を1行で表示する．
ファイルは，1行に1件の問い合わせをJSONで書いたもの(JSON Lines)である．

```console
$ pnpm start batch data/tickets.jsonl
line 21: skipped (not a JSON object with subject and body)
billing: 4, support: 6, sales: 0, needs review: 11
```

作りながら，ファイルの読み込み，JSON Lines，サブコマンド，`Promise.all`と同時に送る数の制限を学ぶ．

## 進め方

演習6-1から順に進める．
詰まったら，`../solution/docs/iteration-6.md`の同じ番号の節を読む．
コマンドは，このパッケージのディレクトリ(`iterations/iteration-6/exercise`)で実行する．

## 演習6-1：引き継いだパッケージを確かめる

1. テストを実行して型を検査する．Iteration 5の32のテストがすべて通ることを確かめる．
2. `cp .env.example .env`で`.env`を作り，1件の問い合わせを振り分けられることを確かめる．
3. `data/tickets.jsonl`を開き，どんな問い合わせが並んでいるかを見る．読めない行が1つ混ざっている．

## 演習6-2：ファイルと並行処理を学ぶ

[Iteration 6：ファイル，JSON Lines，並行処理](../../../../docs/systemone/iteration-6.md)を読む．

読み終えたら，`node`の対話モードで次を試す．

1. `JSON.parse('{"subject": "A", "body": "a"}')`と`JSON.parse("not json")`を評価し，結果を比べる．
2. `JSON.parse('["A", "a"]')`と`JSON.parse('{"subject": 1}')`を評価する．どちらもJSONとしては読めるが，問い合わせとして使えるか．
3. `"a\n\nb\n".split("\n")`を評価する．空の行と，末尾の改行の後ろは，どうなるか．
4. 次を評価し，表示される時間を比べる．

   ```js
   const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
   let t = Date.now(); for (const ms of [300, 300, 300]) await wait(ms); Date.now() - t
   t = Date.now(); await Promise.all([300, 300, 300].map(wait)); Date.now() - t
   ```

## 演習6-3：テストリストを書く

次の要求を読み，[TESTLIST.md](../TESTLIST.md)にテストリストを書く．

### 要求

- `triage batch [--min-confidence <0-1>] <ファイル>`で，ファイルの問い合わせをまとめて振り分ける．これまでの`triage [--min-confidence <0-1>] "<件名>" "<本文>"`も使える．
- ファイルは，1行に1件，`subject`と`body`を持つJSONを書いたもの(JSON Lines)である．
  - 空の行は飛ばす．
  - JSONとして読めない行や，`subject`と`body`が文字列でない行は，`line 21: skipped (not a JSON object with subject and body)`のように行番号とともに知らせて飛ばす．行番号は1から数える．
- 判断エンジンには，同時に4件まで問い合わせる．
- 最後に，自動で振り分けた件数を部署ごとに，人の確認に回した件数を`needs review`として，`billing: 4, support: 6, sales: 0, needs review: 11`のように1行で表示する．部署は，billing・support・salesの順に並べ，0件の部署も表示する．人の確認に回したものは，部署の件数に含めない．
- ファイルが読めなければ，`cannot read <ファイル>: <理由>`と表示し，終了コード1で終わる．
- 引数の数が合わなければ，2行の使い方を表示し，終了コード2で終わる．

  ```text
  usage: triage [--min-confidence <0-1>] "<subject>" "<body>"
         triage batch [--min-confidence <0-1>] <file>
  ```

### 使い方の例

```console
$ pnpm start batch data/tickets.jsonl
line 21: skipped (not a JSON object with subject and body)
billing: 4, support: 6, sales: 0, needs review: 11
$ pnpm start batch --min-confidence 0.05 data/tickets.jsonl
line 21: skipped (not a JSON object with subject and body)
billing: 5, support: 9, sales: 3, needs review: 4
```

### 作るもの

| モジュール | 名前 | 型 | 役割 |
| --- | --- | --- | --- |
| `src/batch.ts` | `ParsedTickets` | `{ tickets: Ticket[]; errors: string[] }` | ファイルを読んだ結果． |
| `src/batch.ts` | `parseTickets` | `(text: string) => ParsedTickets` | JSON Linesの文字列から問い合わせを読む． |
| `src/batch.ts` | `mapWithConcurrency` | `<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>) => Promise<R[]>` | 同時に実行する数を制限して，すべての要素に関数を適用する．結果は元の順に並べる． |
| `src/batch.ts` | `batchConcurrency` | `number` | 同時に送る数(4)． |
| `src/batch.ts` | `Summary` | `{ departments: Record<string, number>; needsReview: number }` | 集計． |
| `src/batch.ts` | `summarize` | `(results: readonly Triage[]) => Summary` | 振り分けの結果を集計する． |
| `src/triage.ts` | `departmentNames` | `string[]` | 部署の名前．質問の選択肢の順． |
| `src/format.ts` | `formatSummary` | `(summary: Summary) => string` | 集計の1行． |
| `src/app.ts` | `run` | (変えない) | サブコマンドを読み，ファイルを読んで振り分ける． |

### 考えること

- `parseTickets`は文字列を受け取る．ファイルを読むのはどこにするとよいか．
- `mapWithConcurrency`の「同時に実行する数」は，どうすれば確かめられるか．判断エンジンを使わずに確かめる方法を考える．
- `summarize`で，人の確認に回したものはどう数えるか．
- 結合テストでは，ファイルをどこに作るか．

## 演習6-4：設計書を更新する

- Container：問い合わせのファイルを，データの置き場所として描き足す．
- Component：`batch`を足す．`app`・`format`・`triage`との依存の矢印を考える．
- Code：サブコマンドで分かれる流れと，ファイルの中身から集計の1行までの流れを足す．`ParsedTickets`と`Summary`を足す．
- シーケンス：`triage batch`の流れを，別の図として足す．同時に送るところは`par`で描く．

## 演習6-5：テスト駆動で実装する

- `test/unit/batch.test.ts`を作り，`parseTickets`・`mapWithConcurrency`・`summarize`をテスト駆動で作る．
- `mapWithConcurrency`のテストでは，決まった時間だけ待つ非同期の関数を渡す．実行中の数を数える変数を用意し，最大値を記録すると，同時に実行した数を確かめられる．
- `JSON.parse`の結果は`unknown`として受け取り，型ガードで確かめる．
- `format`に`formatSummary`を足す．
- `app`で，サブコマンドを読む．`parseArgs`の`positionals`の最初が`batch`かどうかで分ける．`Command`を，単体の問い合わせとファイルの2種類を持つユニオン型にすると，`run`で分けやすい．
- `test/integration/batch.test.ts`を作る．一時ディレクトリにファイルを書き，`run(["batch", ファイル], engine)`を呼ぶ．偽の`fetch`は，リクエストの件名によって答えを変えると，人の確認に回すものと回さないものを混ぜられる．
- 最後に，`data/tickets.jsonl`で実行し，使い方の例と同じ表示になることを確かめる．

## 演習6-6：振り返る

1. 自分の`TESTLIST.md`と，解答例の[TESTLIST.md](../../solution/TESTLIST.md)を比べる．
2. 演習6-2の4で，`Promise.all`を使うと速くなった．`triage batch`でも，同時に送る数を増やすと速くなるか．`batchConcurrency`を1にして，かかる時間を比べる(`time pnpm start batch data/tickets.jsonl`)．
3. `data/tickets.jsonl`の結果では，人の確認に回った件数が多かった．しきい値を変えると，集計はどう変わるか．
4. 設計書と実装を見比べる．違う形になったところがあれば，設計書を実装に合わせて直す．

## 演習6-7(発展)：同時に送る数を指定する

`triage batch`に`--concurrency <n>`を足し，同時に送る数を指定できるようにする．
1以上の整数でなければ，使い方を表示する．

```console
$ time node --env-file-if-exists=.env src/main.ts batch --concurrency 1 data/tickets.jsonl
line 21: skipped (not a JSON object with subject and body)
billing: 4, support: 6, sales: 0, needs review: 11

real    0m10.136s
user    0m0.213s
sys     0m0.075s
```

発展課題の解答の一例は，解答例のパッケージ(`../solution`)に`発展(演習6-7)`で始まるコメントとして書いてある．
解説は`../solution/docs/iteration-6.md`の演習6-7にある．

発展課題でも，テストリストを書いたあとに設計書を更新してから実装し，実装したら設計書と見比べる．
