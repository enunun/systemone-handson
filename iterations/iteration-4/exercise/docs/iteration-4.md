# Iteration 4：迷っている問い合わせを人の確認に回す(演習)

## このIterationで作るもの

部署の判定に迷いがある問い合わせを，人の確認に回す．
部署の判定の確信度(`confidence`)がしきい値を下回ったら，部署の行の末尾に`-> needs review`を付ける．
しきい値は，既定では0.2で，`--min-confidence`で変えられる．

```console
$ pnpm start "Team plan" "We are 20 people and want to upgrade to the team plan. What does it cost?"
department: sales (0.44) -> needs review
urgency: somewhat urgent (1.0)
refund: no (0.07)
```

作りながら，確率と確信度の違い，しきい値の考え方，`util.parseArgs`でのオプションの解析を学ぶ．

## 進め方

演習4-1から順に進める．
詰まったら，`../solution/docs/iteration-4.md`の同じ番号の節を読む．
コマンドは，このパッケージのディレクトリ(`iterations/iteration-4/exercise`)で実行する．

## 演習4-1：引き継いだパッケージを確かめる

1. テストを実行して型を検査する．Iteration 3の18のテストがすべて通ることを確かめる．
2. 次の2つの問い合わせでプログラムを実行し，表示を比べる．部署の確率だけを見て，どちらの判定のほうが信用できると言えるか．

   ```sh
   pnpm start "Refund not received" "Where is my refund?"
   pnpm start "Team plan" "We are 20 people and want to upgrade to the team plan. What does it cost?"
   ```

## 演習4-2：確信度を調べる

[Iteration 4：確信度としきい値，引数の解析](../../../../docs/systemone/iteration-4.md)を読む．

読み終えたら，次を試す．

1. 演習4-1の2つの問い合わせを，curlで`department`の`choice`の質問だけにして送り，`probabilities`と`confidence`を読む．
2. 資料の式で，`Team plan`の`confidence`を手で(または`node`の対話モードで)計算し，答えと一致することを確かめる．`node`を引数なしで実行すると対話モードになり，`Math.log`などを試せる．
3. 次の問い合わせも送り，部署が正しく選ばれているか，`confidence`はいくつかを表にする．しきい値を0.2にすると，どれが人の確認に回るか．
   - `"Invoice"`・`"Please send me the invoice for September."`
   - `"Discount"`・`"Do you offer a discount for non-profit organizations?"`
   - `"Cancel"`・`"I want to cancel my subscription."`
   - `"Enterprise"`・`"We would like to talk to someone about an enterprise contract."`

## 演習4-3：テストリストを書く

次の要求を読み，[TESTLIST.md](../TESTLIST.md)にテストリストを書く．

### 要求

- 部署の判定の確信度が，しきい値を下回ったら，人の確認に回す．しきい値ちょうどなら回さない．
- 人の確認に回すときは，部署の行の末尾に`-> needs review`を付ける(確率の括弧との間は空白1つ)．
- しきい値は，`--min-confidence <0から1の数>`で指定する．指定しなければ0.2を使う．
- 次のときは，判断エンジンへ問い合わせずに，使い方(`usage: triage [--min-confidence <0-1>] "<subject>" "<body>"`)を表示し，終了コード2で終わる．
  - 件名か本文が足りない．
  - `--min-confidence`の値が，0から1の数でない．
  - 知らないオプションがある．

### 使い方の例

```console
$ pnpm start "Team plan" "We are 20 people and want to upgrade to the team plan. What does it cost?"
department: sales (0.44) -> needs review
urgency: somewhat urgent (1.0)
refund: no (0.07)
$ pnpm start --min-confidence 0.1 "Hello" "I have a question about my account."
department: support (0.59)
urgency: somewhat urgent (1.1)
refund: no (0.10)
$ pnpm start --min-confidence 2 "Hello" "Hi"
usage: triage [--min-confidence <0-1>] "<subject>" "<body>"
```

### 作るもの

| モジュール | 名前 | 型 | 役割 |
| --- | --- | --- | --- |
| `src/triage.ts` | `TriageOptions` | `{ minConfidence?: number }` | 振り分けの設定． |
| `src/triage.ts` | `defaultMinConfidence` | `number` | しきい値の既定値(0.2)． |
| `src/triage.ts` | `Triage`の`needsReview` | `boolean` | 人の確認に回すか． |
| `src/triage.ts` | `triage` | `(engine, ticket, options?: TriageOptions) => Promise<Triage>` | 3つ目の引数を足す． |
| `src/format.ts` | `formatDepartment` | `(department: string, probability: number, needsReview: boolean) => string` | 3つ目の引数を足す． |
| `src/app.ts` | `run` | (変えない) | オプションを読み，`triage`に渡す． |

### 考えること

- しきい値の境界(ちょうど0.2など)の振る舞いは，どのテストで確かめるか．
- 「しきい値を指定しなければ0.2を使う」は，どう確かめられるか．
- `--min-confidence`の値が「0から1の数でない」とは，どんな値か．いくつの例を試せば安心できるか．
- `Triage`に項目を足すと，型検査はどこを指摘するか．

## 演習4-4：設計書を更新する

- Code：`triage`の中の流れに，確信度としきい値から`needsReview`を作る分岐を足す．プログラム全体の流れに，引数の解析と，使い方を表示する条件を足す．主な型に`TriageOptions`と`needsReview`を足す．図の下の決めごとに，しきい値の既定値と境界の扱いを書く．
- シーケンス：引数の解析と，しきい値の受け渡しを描き入れる．
- Component：`app`と`triage`の間の矢印の説明に，渡すものを足す．

## 演習4-5：テスト駆動で実装する

- `triage`は，3つ目の引数を省略できるようにする．引数の分割代入に既定値を書くと，省略したときと`minConfidence`だけを省略したときの両方に対応できる．

  ```ts
  const greet = (name: string, { greeting = "Hello" }: { greeting?: string } = {}) => `${greeting}, ${name}`;
  ```

- `fake-engine`の答えを，テストの中で少しだけ変えたいときは，スプレッド構文(`{ ...answers, department: { ...answers.department, confidence: 0.19 } }`)を使う．
- 結合テストでは，偽の`fetch`が返す部署の確信度を変えられるようにする．
- `parseArgs`の例外は`try`〜`catch`で受け止める．引数の解析は，`run`から別の関数に分けると読みやすい．
- 最後に，本物の判断エンジンで実行し，使い方の例と同じ表示になることを確かめる．

## 演習4-6：振り返る

1. 自分の`TESTLIST.md`と，解答例の[TESTLIST.md](../../solution/TESTLIST.md)を比べる．
2. 演習4-2の3の表で，しきい値0.2で人の確認に回った問い合わせのうち，部署が正しく選ばれていたものはいくつあったか．しきい値を下げると，どう変わるか．
3. しきい値は，`triage`の引数として渡した．`triage`の中で`process.argv`を読む形にしなかった理由は何か．
4. 設計書と実装を見比べる．違う形になったところがあれば，設計書を実装に合わせて直す．

## 演習4-7(発展)：確信度も表示する

`--show-confidence`を付けたときは，部署の行に確信度も表示する．

```console
$ pnpm start --show-confidence "Team plan" "We are 20 people and want to upgrade to the team plan. What does it cost?"
department: sales (0.44, confidence 0.02) -> needs review
urgency: somewhat urgent (1.0)
refund: no (0.07)
```

`Triage`に部署の確信度を足し，表示の関数に「確信度を表示するか」を渡す必要がある．
`parseArgs`で値をとらないオプションは，`type: "boolean"`で受け付ける．

発展課題の解答の一例は，`../solution/docs/iteration-4.md`の演習4-7にある．

発展課題でも，テストリストを書いたあとに設計書を更新してから実装し，実装したら設計書と見比べる．
