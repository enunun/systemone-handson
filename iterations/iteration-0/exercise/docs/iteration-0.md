# Iteration 0：返金を求めているかを判定する(演習)

## このIterationで作るもの

問い合わせを振り分けるプログラム`triage`の最初の版を作る．
問い合わせの件名と本文を引数に渡すと，返金を求めているかを判断エンジンに尋ね，その確率とともに表示する．

```console
$ pnpm start "Refund not received" "Where is my refund?"
refund: yes (0.86)
```

作りながら，System Oneの考え方と`/v1/systemone`のAPI，TypeSafeのSDK，Vitestでのテストの書き方，mermaidでの設計書の書き方を学ぶ．
このハンズオンでは，Iterationを重ねるごとに，このプログラムに担当部署・緊急度の判定，人の確認への振り分け，まとめての処理，精度の評価，HTTP APIなどを足していく．

## 進め方

演習0-1から順に進める．
詰まったら，`../solution/docs/iteration-0.md`の同じ番号の節を読む．
コマンドは，特に断りがなければ，このパッケージのディレクトリ(`iterations/iteration-0/exercise`)で実行する．

## 演習0-1：パッケージを動かしてみる

このパッケージ(`triage-iteration-0`)の依存パッケージを入れ，テスト・型検査・実行ができることを確かめる．

1. リポジトリの直下で，依存パッケージを入れる．devcontainerを作ったときに一度実行されているので，すぐに終わる．

   ```sh
   pnpm install
   ```

2. このパッケージのディレクトリに移る．

   ```sh
   cd iterations/iteration-0/exercise
   ```

3. `src/app.ts`をVSCodeで開き，`TypeSafeClient`の上にマウスカーソルを置く．SDKの型の説明が表示されることを確かめる．
4. テストを実行する．テストはまだ1つもないので，`No test files found, exiting with code 0`と表示される．

   ```sh
   pnpm test
   ```

5. 型を検査する．何も表示されずに終われば，型の誤りはない．

   ```sh
   pnpm typecheck
   ```

6. プログラムを実行する．`pnpm start`の後ろに書いたものが，コマンドライン引数としてプログラムへ渡る．

   ```sh
   pnpm start "Refund not received" "Where is my refund?"
   ```

   `Error: TODO: 件名と本文を判断エンジンに送り，formatRefundで表示する文字列を作る`と表示されて止まる．
   メッセージの`at run (…)`の行から，どのファイルの何行目で止まったかを読み取る．

## 演習0-2：判断エンジンに問い合わせてみる

[Iteration 0：System One・SDK・Vitest](../../../../docs/systemone/iteration-0.md)を読む．
読みながら，curlで判断エンジンに問い合わせる例を試す．

読み終えたら，次を試す．

1. `curl -s http://laya:8080/healthz`で，判断エンジンの準備ができていることを確かめる．
2. 資料の最初のcurlの例を実行し，`refund`の確率を読む．
3. 本文を，返金を求めていない文(例：`"How do I change my password?"`)に変えて送り，確率がどう変わるかを見る．
4. 本文を，どちらとも取れる文(例：`"I am not happy with my purchase."`)に変えて送る．確率は0と1のどちらに近いか．
5. 質問の`instructions`を`"Does the customer want their money back?"`に変えて送り，2と比べる．同じことを尋ねる質問でも，文が変わると確率は変わるか．
6. `questions`を空にして送り，どんなエラーが返るかを見る．

## 演習0-3：テストリストを書く

[テスト駆動開発とテストリスト](../../../../docs/tdd.md)を読む．
次の要求を読み，[TESTLIST.md](../TESTLIST.md)にテストリストを書く．

### 要求

- コマンドライン引数に，問い合わせの件名と本文を，この順に渡す．
- 件名と本文を判断エンジンに送り，「顧客は返金を求めているか」を，はい・いいえの質問(`noul`)で尋ねる．
- 返金を求めている確率が0.5以上なら`yes`，それ以外は`no`とし，`refund: yes (0.86)`のように確率を小数第2位まで添えて表示する．
- 件名か本文が足りないときは，判断エンジンへ問い合わせずに，使い方(`usage: triage "<subject>" "<body>"`)を表示し，終了コード2で終わる．

### 使い方の例

```console
$ pnpm start "Refund not received" "Where is my refund?"
refund: yes (0.86)
$ pnpm start "Login problem" "I cannot log in since yesterday."
refund: no (0.08)
$ pnpm start "Refund not received"
usage: triage "<subject>" "<body>"
```

### 作るもの

| モジュール | 名前 | 型 | 役割 |
| --- | --- | --- | --- |
| `src/refund.ts` | `refundQuestion` | `NoulQuestion` | 返金を求めているかを尋ねる質問．このモジュールに自分で足す． |
| `src/refund.ts` | `formatRefund` | `(probability: number) => string` | 確率を`refund: yes (0.86)`のような1行にする． |
| `src/app.ts` | `run` | `(args: string[], client: TypeSafeClient) => Promise<RunResult>` | 引数を読み，判断エンジンに問い合わせて，表示する文字列と終了コードを返す． |

`src/main.ts`は，判断エンジンのクライアントを作って`run`に渡し，返ってきた結果を表示する．
`main.ts`はすでにできているので，変更しなくてよい．

### 考えること

- `formatRefund`は単体テストで，`run`は結合テストで確かめる．
- `formatRefund`では，どんな確率を試せば「正しく動く」と言えるか．しきい値の0.5ちょうどは，どちらになるべきか．
- `run`の結合テストでは，判断エンジンの代わりに偽の`fetch`を使う([資料](../../../../docs/systemone/iteration-0.md)の「通信を差し替えてテストする」)．偽の`fetch`で，表示する文字列のほかに何を確かめられるか．
- 引数が足りないとき，「判断エンジンに問い合わせない」ことはどう確かめられるか．

## 演習0-4：設計書を書く

[設計書の書き方](../../../../docs/design.md)を読み，このパッケージの`design/`に設計書を書く．
`design/`には，5つのファイルが見出しだけの状態で置いてある．
演習0-3で書いたテストリストの振る舞いを，どんな部品で実現するかを図にする．

1. `01-context.md`：利用者・`triage`・判断エンジン(laya-server)の関係を`C4Context`の図で描く．
2. `02-container.md`：`triage`の実行ファイルと，laya-serverを`C4Container`の図で描く．laya-serverは，このシステムの外にあるものとして描く．
3. `03-component.md`：`src/`の3つのモジュール(`main`・`app`・`refund`)と，SDK(`@typesafe-ai/sdk`)と，その依存関係を`C4Component`の図で描く．型だけを`import`する依存も矢印にする．
4. `04-code.md`：次の2つを描く．
   - 型と関数の流れ：コマンドライン引数(`string[]`)から`RunResult`まで，どの型をどの関数で変換していくか．引数が足りないときの流れも描く．
   - 主な型：`RunResult`と，`refundQuestion`が使うSDKの型．
5. `05-sequence.md`：利用者が`triage`を実行してから，判断エンジンに問い合わせ，結果を表示するまでの順序を描く．引数が足りないときの流れも描く．

書き終えたら，次を確かめる．

- VSCodeのプレビュー(`Ctrl+Shift+V`)で，図が描かれること．
- リポジトリの直下で`node tools/mermaid/check.mjs iterations/iteration-0/exercise/design/*.md`を実行し，図の構文の誤りがないこと．
- テストリストの各項目が，図のどの関数を確かめる項目なのかを言えること．

## 演習0-5：テスト駆動で実装する

テストリストの項目を1つずつ選び，次のサイクルを回す．

1. その項目のテストを1つだけ書く．
2. テストを実行し，失敗すること(Red)を確かめる．失敗のメッセージが予想どおりかも読む．
3. テストを通すいちばん簡単なコードを書く．
4. テストを実行し，すべてのテストが通ること(Green)を確かめる．
5. `TESTLIST.md`の項目を`- [x]`にする．

### 最初の単体テスト

1. `test/unit/refund.test.ts`を作る．テストリストの最初の項目が「`formatRefund`：確率が0.5以上ならyesと表示する」なら，次のように書く．

   ```ts
   import { describe, expect, test } from "vitest";
   import { formatRefund } from "../../src/refund.ts";

   describe("formatRefund", () => {
     test("確率が0.5以上ならyesと表示する", () => {
       expect(formatRefund(0.86)).toBe("refund: yes (0.86)");
     });
   });
   ```

2. 単体テストだけを実行する．

   ```sh
   pnpm test --project unit
   ```

   `×`の印と，`Error: TODO: …`のメッセージが表示される．
   これが最初のRedである．
3. `src/refund.ts`の`formatRefund`の`throw new Error("TODO: …")`を，テストが通る実装に書き換える．いまのテストは1つの確率しか試していないので，期待値の文字列を返すだけでも通る．
4. もう一度テストを実行し，Greenになったら，`TESTLIST.md`の項目に印を付ける．

### 残りの単体テスト

テストリストの残りの項目も，同じサイクルで1つずつ進める．

- 同じ関数のテストは，同じ`describe`の中に`test`を並べる．
- 数を小数第2位までの文字列にするには，`toFixed(2)`が使える．
- 仮実装(期待値をそのまま返す実装)で通したら，次のテストで一般的な実装に書き換える必要が出るかを考える．

### 結合テスト

1. `src/refund.ts`に`refundQuestion`を足す．型は`NoulQuestion`で，SDKから`import type`する．
2. `test/integration/app.test.ts`を作る．判断エンジンの代わりに偽の`fetch`を渡した`TypeSafeClient`を作り，`run`に渡す．
3. 結合テストだけを実行し，Redを確かめる．コマンドは単体テストのときの`unit`を`integration`に変えたものである．
4. `run`を実装する．`args`から件名と本文を取り出し，`client.systemOne`に`state`と`questions`を渡す．答えの確率を`formatRefund`に渡す．
5. 型も検査する．`args`から取り出した値の型は`string | undefined`になる．この点に注意する．

すべての項目に印が付いたら，パッケージのテストと型検査をまとめて実行し，すべて通ることを確かめる．
最後に，演習0-1と同じコマンドでプログラムを実行し，判断エンジンの答えが表示されることを確かめる．
演習0-2で試した文でも実行し，curlで見た確率と同じになることを確かめる．

## 演習0-6：振り返る

1. 自分の`TESTLIST.md`と，解答例の[TESTLIST.md](../../solution/TESTLIST.md)を比べる．自分にだけある項目，解答例にだけある項目はそれぞれどれか．それはなぜか．
2. `formatRefund`に「しきい値を`>`で比べている(0.5ちょうどが`no`になる)」という誤りがあったとする．単体テストと結合テストのどちらで見つかるか．
3. 結合テストで，本物の判断エンジンではなく偽の`fetch`を使った．偽の`fetch`では確かめられないことは何か．それはどうやって確かめるか．
4. 判断エンジンのURL(`http://laya:8080`)を知っているモジュールはどれか．`run`がURLを知らないことには，どんな利点があるか．
5. 設計書と実装を見比べる．実装してみて，設計書と違う形になったところはあるか．あれば，設計書を実装に合わせて直す．

## 演習0-7(発展)：迷っているときは「unsure」と表示する

確率が0.5に近いときは，モデルも迷っている．
確率が0.4以上0.6未満なら，`yes`・`no`の代わりに`unsure`と表示する．

```console
$ pnpm start "Order" "The product arrived broken."
refund: unsure (0.57)
```

1. テストリストに項目を足す．既存のテストのうち，期待値が変わるものも探して「〜に変える」という項目にする．
2. 1項目ずつRed→Greenを回す．

発展課題の解答の一例は，`../solution/docs/iteration-0.md`の演習0-7にある．

発展課題でも，テストリストを書いたあとに設計書を更新してから実装し，実装したら設計書と見比べる．
