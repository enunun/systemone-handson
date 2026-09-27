# Iteration 2：緊急度を判定する．判断と表示を分ける(演習)

## このIterationで作るもの

問い合わせの緊急度を4段階で判定し，2行目に表示する．
段階は低い順にnot urgent・somewhat urgent・urgent・criticalで，判断エンジンが返す期待値にもっとも近い段階と，期待値を表示する．

```console
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.73)
urgency: somewhat urgent (1.4)
refund: yes (0.86)
```

判定の種類が3つになるので，先にモジュールを分け直す．
質問を組み立てて答えを取り出す`triage`と，結果を表示する`format`に分け，`app`は両者をつなぐだけにする．

作りながら，段階で評価する質問(`score`)と期待値，判断と表示を分ける設計，振る舞いを変えずに構造を変えるリファクタリングを学ぶ．

## 進め方

演習2-1から順に進める．
詰まったら，`../solution/docs/iteration-2.md`の同じ番号の節を読む．
コマンドは，このパッケージのディレクトリ(`iterations/iteration-2/exercise`)で実行する．

## 演習2-1：引き継いだパッケージを確かめる

1. テストを実行して型を検査する．Iteration 1の8つのテストがすべて通ることを確かめる．
2. プログラムを実行し，担当部署と返金の判定が表示されることを確かめる．

## 演習2-2：scoreの質問を試す

[Iteration 2：scoreの質問と，判断と表示の分離](../../../../docs/systemone/iteration-2.md)を読む．
読みながら，curlで`score`の質問を試す．

読み終えたら，次を試す．

1. 資料の緊急度の質問を送り，`probabilities`から`score`を手で計算して，答えの`score`と一致することを確かめる．
2. 本文を，緊急の問い合わせ(例：件名`"Production down"`，本文`"Since the last update the app crashes on login. Our whole company cannot work."`)に変えて送る．`score`はどう変わるか．
3. 1の答えで，もっとも確率の高い段階と，`score`を四捨五入した段階を比べる．
4. `criteria`を2段階(`["low", "high"]`)にして送り，`score`と`probabilities`の関係を見る．

## 演習2-3：テストリストを書く

このIterationは，2つの段階で進める．
先に振る舞いを変えずにモジュールを分け直し(リファクタリング)，そのあとで緊急度を足す．

### リファクタリング

次の形に分け直す．表示は変えない．

| モジュール | 名前 | 型 | 役割 |
| --- | --- | --- | --- |
| `src/triage.ts` | `Ticket` | `{ subject: string; body: string }` | 問い合わせ． |
| `src/triage.ts` | `Triage` | `{ department: string; departmentProbability: number; refundProbability: number }` | 振り分けの結果． |
| `src/triage.ts` | `triage` | `(client: TypeSafeClient, ticket: Ticket) => Promise<Triage>` | 質問を送り，答えを`Triage`にまとめる．部署と返金の質問は，このモジュールの中に移す． |
| `src/format.ts` | `formatDepartment` | `(department: string, probability: number) => string` | 部署の1行． |
| `src/format.ts` | `formatRefund` | (変えない) | 返金の1行． |
| `src/format.ts` | `formatTriage` | `(triage: Triage) => string` | 結果全体を1項目1行にする． |
| `src/app.ts` | `run` | (変えない) | 引数を読み，`triage`と`formatTriage`をつなぐ． |

`src/refund.ts`と`src/department.ts`は，中身を移したあとで消す．

### 要求

- 緊急度を，4段階(not urgent・somewhat urgent・urgent・critical)の`score`の質問で尋ねる．
- 3つの質問は，判断エンジンへの1回の問い合わせで尋ねる．
- 2行目に`urgency: somewhat urgent (1.4)`のように，期待値にもっとも近い段階の名前と，期待値を小数第1位まで表示する．期待値が段階のちょうど中間(0.5など)なら，上の段階にする．
- 1行目の部署と3行目の返金の表示は変えない．

### 使い方の例

```console
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.73)
urgency: somewhat urgent (1.4)
refund: yes (0.86)
$ pnpm start "Production down" "Since the last update the app crashes on login. Our whole company cannot work."
department: support (0.82)
urgency: urgent (2.4)
refund: no (0.05)
```

### 緊急度のために足すもの

| モジュール | 名前 | 型 | 役割 |
| --- | --- | --- | --- |
| `src/triage.ts` | `urgencyLevels` | 段階の名前の配列(`as const`) | 質問の`criteria`と表示の両方で使う． |
| `src/triage.ts` | `Triage`の`urgency` | `number` | 緊急度の期待値． |
| `src/format.ts` | `formatUrgency` | `(score: number) => string` | 緊急度の1行． |

### 考えること

- リファクタリングでは，既存のテストをどこへ移すか．シグネチャが変わる関数のテストは，入力をどう書き換えるか．期待する表示は変わるか．
- `triage`の単体テストでは，判断エンジンの代わりに偽の`fetch`を使う．Iteration 1の結合テストで確かめていた「質問を1回で送る」ことは，どちらのテストで確かめるのがよいか．
- `formatUrgency`の境界はどこか．期待値の最小値と最大値のときは，どの段階になるべきか．

## 演習2-4：設計書を更新する

- Component：`refund`と`department`を消し，`triage`と`format`を足す．`format`がどのモジュールに依存するかを考える．
- Code：型と関数の流れを，`Ticket`→`Triage`→表示する文字列の流れに描き直す．`triage`の中と`formatTriage`の中の流れは，別の図に分けてよい．主な型に`Ticket`・`Triage`・`urgencyLevels`を足す．
- シーケンス：`app`と判断エンジンの間に，`triage`と`format`を描き入れる．
- ContextとContainer：説明の文を，いまの`triage`に合わせる．

## 演習2-5：テスト駆動で実装する

### モジュールを分け直す

1. `src/triage.ts`と`src/format.ts`を作り，関数と質問を移す．1つ移すたびにテストを実行し，すべて通ることを確かめる．
2. `test/unit/refund.test.ts`と`test/unit/department.test.ts`のテストを，`test/unit/format.test.ts`と`test/unit/triage.test.ts`に移す．
3. `app`の`run`を，`triage`と`formatTriage`を呼ぶだけにする．
4. 使わなくなったファイルを消し，テストと型検査がすべて通ることを確かめる．

### 緊急度

テストリストの項目を1つずつRed→Greenにする．

- `formatUrgency`の段階の名前は，`urgencyLevels`から番号で取り出す．小数を最も近い整数にするには`Math.round`，小数第1位までの文字列にするには`toFixed(1)`が使える．
- `Triage`に`urgency`を足すと，型検査が`Triage`を作っている場所を教えてくれる．テストの中のオブジェクトも直す．
- 結合テストの偽の`fetch`が緊急度の答えを返さないと，`triage`で何が起きるか．失敗のメッセージを読んでから直す．
- 最後に，本物の判断エンジンで実行し，使い方の例と同じ表示になることを確かめる．

## 演習2-6：振り返る

1. 自分の`TESTLIST.md`と，解答例の[TESTLIST.md](../../solution/TESTLIST.md)を比べる．
2. `format`のテストと，Iteration 1の`department`のテストを比べる．テストの入力を作る手間はどう変わったか．
3. 質問の文(`instructions`)を変えるとき，どのファイルを変えるか．表示の書式を変えるときはどうか．
4. 演習2-2の3では，もっとも確率の高い段階と表示する段階が食い違った．サポート担当者にとって，どちらを表示するほうが役に立つか．
5. 設計書と実装を見比べる．違う形になったところがあれば，設計書を実装に合わせて直す．

## 演習2-7(発展)：もっとも確率の高い段階も表示する

緊急度の行に，もっとも確率の高い段階を添える．

```console
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.73)
urgency: somewhat urgent (1.4, most likely: urgent)
refund: yes (0.86)
```

`Triage`に，もっとも確率の高い段階の番号を足す必要がある．
`triage`で答えの`probabilities`から求め，`format`では番号を段階の名前にする．

発展課題の解答の一例は，`../solution/docs/iteration-2.md`の演習2-7にある．

発展課題でも，テストリストを書いたあとに設計書を更新してから実装し，実装したら設計書と見比べる．
