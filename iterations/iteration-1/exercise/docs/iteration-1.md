# Iteration 1：担当部署を判定する(演習)

## このIterationで作るもの

返金の判定に加えて，問い合わせを担当する部署を判定する．
部署はbilling(支払い)・support(製品のサポート)・sales(販売)の3つで，もっとも確からしい部署とその確率を1行目に表示する．

```console
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.73)
refund: yes (0.86)
```

作りながら，選択肢から1つを選ぶ質問(`choice`)と確率の分布，選択肢の説明文の役割，1回の問い合わせで複数の質問に答えさせる方法を学ぶ．

## 進め方

演習1-1から順に進める．
詰まったら，`../solution/docs/iteration-1.md`の同じ番号の節を読む．
コマンドは，このパッケージのディレクトリ(`iterations/iteration-1/exercise`)で実行する．

## 演習1-1：引き継いだパッケージを確かめる

このパッケージは，Iteration 0の解答例と同じコード・テスト・設計書から始まる．

1. このパッケージのディレクトリに移り，テストを実行して型を検査する．Iteration 0の6つのテストがすべて通ることを確かめる．
2. プログラムを実行し，返金の判定が表示されることを確かめる．

   ```sh
   pnpm start "Refund not received" "Where is my refund?"
   ```

3. `design/`の設計書を読み返す．このIterationでは，ここに担当部署の判定を描き足していく．

## 演習1-2：choiceの質問を試す

[Iteration 1：choiceの質問と確率の分布](../../../../docs/systemone/iteration-1.md)を読む．
読みながら，curlで`choice`の質問を試す．

読み終えたら，次を試す．

1. 資料の`department.json`を作り，`Refund not received`の問い合わせを送る．`probabilities`の合計がほぼ1になることを確かめる．
2. 本文を`"I cannot log in since yesterday."`に変えて送り，選ばれる部署と確率の分布を見る．
3. 選択肢の説明文をすべて`null`にして，1と2をもう一度送る．確率の分布はどう変わるか．
4. `refund`の`noul`の質問を`questions`に足し，2つの質問を1回で送る．それぞれの答えは，1つずつ送ったときと同じか．
5. どの部署とも言い切れない問い合わせ(例：件名`"Hello"`，本文`"I have a question about my account."`)を送る．確率の分布と`confidence`は，1のときと比べてどうか．

## 演習1-3：テストリストを書く

次の要求を読み，[TESTLIST.md](../TESTLIST.md)にテストリストを書く．

### 要求

- 担当部署を，billing・support・salesの3つから選ぶ質問(`choice`)で尋ねる．選択肢には，それぞれの部署が扱う内容の説明を付ける．
  - billing：payments, refunds, invoices and charges
  - support：product help, bugs and how-to questions
  - sales：new purchases, pricing and plan upgrades
- 担当部署と返金の2つの質問は，判断エンジンへの1回の問い合わせで尋ねる．
- 1行目に`department: billing (0.73)`のように，もっとも確からしい部署と，その部署の確率を小数第2位まで表示する．
- 2行目に，これまでどおり返金の判定を表示する．
- 件名か本文が足りないときの振る舞いは変えない．

### 使い方の例

```console
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.73)
refund: yes (0.86)
$ pnpm start "Login problem" "I cannot log in since yesterday."
department: support (0.84)
refund: no (0.08)
```

### 作るもの

| モジュール | 名前 | 型 | 役割 |
| --- | --- | --- | --- |
| `src/department.ts` | `departmentQuestion` | `ChoiceQuestion` | 担当部署を尋ねる質問． |
| `src/department.ts` | `formatDepartment` | `(answer: ChoiceResponse) => string` | 担当部署の答えを`department: billing (0.73)`のような1行にする． |
| `src/app.ts` | `run` | (変えない) | 2つの質問を送り，2行を表示する． |

### 考えること

- `formatDepartment`の単体テストでは，答えのオブジェクト(`ChoiceResponse`)を自分で作って渡す．どんな答えを試せば，「選ばれた部署の確率を表示している」と言えるか．
- 既存の結合テストのうち，期待値が変わるものはどれか．偽の`fetch`が返す答えも変える必要があるか．
- 「2つの質問を1回の問い合わせで尋ねる」ことは，どう確かめられるか．

## 演習1-4：設計書を更新する

演習1-3のテストリストの振る舞いを実現するために，設計書を更新する．

- Component：新しいモジュールと，その依存の矢印を足す．型だけを`import`する依存も矢印にする．
- Code：型と関数の流れに，担当部署の答えが表示の1行目になるまでの流れを足す．主な型に，SDKの`choice`の型と，新しい質問の定数を足す．
- シーケンス：送る質問と，返ってくる答えを書き換える．
- ContextとContainer：説明の文を，いまの`triage`に合わせる．

書き終えたら，リポジトリの直下でmermaidの図を検査する．

## 演習1-5：テスト駆動で実装する

テストリストの項目を1つずつRed→Greenにする．

- `test/unit/department.test.ts`を作る．答えのオブジェクトをテストの中で作るときは，末尾に`as const`を付けると，`type: "choice"`が`string`ではなく`"choice"`という型になり，`ChoiceResponse`として渡せる．
- 1つのファイルのテストだけを実行するには，`pnpm test`の後ろにファイルのパスを付ける．

  ```sh
  pnpm test test/unit/department.test.ts
  ```

- 選ばれた部署の確率は，`answer.probabilities`から`answer.choice`をキーにして取り出す．型検査で`undefined`の可能性を指摘されたら，資料の「SDKの型」を読む．
- 結合テストでは，偽の`fetch`が`department`と`refund`の両方の答えを返すようにする．
- 最後に，本物の判断エンジンで実行し，使い方の例と同じ表示になることを確かめる．

## 演習1-6：振り返る

1. 自分の`TESTLIST.md`と，解答例の[TESTLIST.md](../../solution/TESTLIST.md)を比べる．
2. `formatDepartment`が，選ばれた部署ではなく「確率の分布の最初の部署」の確率を表示する誤りがあったとする．どのテストで見つかるか．見つけるには，どんな答えを試す必要があるか．
3. 演習1-2の3で，説明文を`null`にすると確率が変わった．説明文は，コードの中では何にあたるか．説明文を変えたとき，テストで確かめられることと，確かめられないことは何か．
4. 設計書と実装を見比べる．違う形になったところがあれば，設計書を実装に合わせて直す．

## 演習1-7(発展)：2番目に確からしい部署も表示する

1行目の末尾に，2番目に確からしい部署とその確率を括弧で添える．

```console
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.73, next: support 0.20)
refund: yes (0.86)
```

確率の分布を，確率の大きい順に並べる必要がある．
`Object.entries`でキーと値の組の配列にし，`toSorted`で並べ替える．

発展課題の解答の一例は，解答例のパッケージ(`../solution`)に`発展(演習1-7)`で始まるコメントとして書いてある．
解説は`../solution/docs/iteration-1.md`の演習1-7にある．

発展課題でも，テストリストを書いたあとに設計書を更新してから実装し，実装したら設計書と見比べる．
