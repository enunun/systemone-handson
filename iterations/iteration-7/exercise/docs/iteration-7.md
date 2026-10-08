# Iteration 7：ラベル付きデータで精度を測る(演習)

## このIterationで作るもの

`triage eval <ファイル>`で，正解の部署が付いた問い合わせを振り分け，自動で振り分けた件数とその正解率，人の確認に回る割合を表示する．
続けて，正解の部署と判定した部署の件数の表(混同行列)を表示する．
`--sweep`を付けると，しきい値を0.1刻みで変えた評価を表で表示する．

```console
$ pnpm start eval data/labeled.jsonl
accuracy: 0.96 (auto-routed 26 / 30), review rate: 0.13

actual \ predicted   billing   support     sales
billing                   10         1         0
support                    0        11         0
sales                      0         2         6
```

作りながら，評価用のデータ，正解率，混同行列，しきい値と人の確認に回る割合の関係を学ぶ．

## 進め方

演習7-1から順に進める．
詰まったら，`../solution/docs/iteration-7.md`の同じ番号の節を読む．
コマンドは，このパッケージのディレクトリ(`iterations/iteration-7/exercise`)で実行する．

## 演習7-1：引き継いだパッケージを確かめる

1. テストを実行して型を検査する．Iteration 6の45のテストがすべて通ることを確かめる．
2. `.env`を作り，`pnpm start batch data/tickets.jsonl`を実行する．
3. `data/labeled.jsonl`を開き，部署ごとの件数を数える．

## 演習7-2：評価を学ぶ

[Iteration 7：評価と，しきい値の選び方](../../../../docs/systemone/iteration-7.md)を読む．

読み終えたら，次を考える．

1. `data/labeled.jsonl`から5件を選び，`pnpm start "件名" "本文"`を実行して振り分ける．正解の部署と同じだったか．確信度が低くて人の確認に回ったものはあるか．
2. しきい値を上げると，正解率と人の確認に回る割合はそれぞれどう変わると予想されるか．
3. 自動で振り分けたものが0件のとき，正解率はいくつにすべきか．

## 演習7-3：テストリストを書く

次の要求を読み，[TESTLIST.md](../TESTLIST.md)にテストリストを書く．

### 要求

- `triage eval [--min-confidence <0-1> | --sweep] <ファイル>`で，正解の部署が付いた問い合わせを評価する．
- ファイルは，1行に1件，`subject`・`body`と，正解の部署`department`(billing・support・salesのどれか)を持つJSONを書いたもの(JSON Lines)である．読めない行は，`line 4: skipped (not a JSON object with subject, body and a known department)`のように知らせて飛ばす．
- すべての問い合わせを振り分け(同時に4件まで)，部署の確信度がしきい値以上のものを「自動で振り分けたもの」とみなす．しきい値は`--min-confidence`で指定し，指定しなければ既定値(`defaultMinConfidence`)とする．
- 1行目に，`accuracy: 0.93 (auto-routed 27 / 30), review rate: 0.10`のように，正解率(自動で振り分けたもののうち部署が正解だった割合)・自動で振り分けた件数・全体の件数・人の確認に回る割合を表示する．割合は小数第2位まで表示する．自動で振り分けたものがなければ，正解率は`n/a`とする．
- 空の行を挟んで，混同行列を表示する．行が正解の部署，列が判定した部署で，人の確認に回るものも含めて数える．列は右にそろえる．
- `--sweep`を付けたときは，評価の1行と混同行列の代わりに，しきい値0.0〜1.0(0.1刻み)ごとの評価を表で表示する．
- `--sweep`と`--min-confidence`は一緒に使えない．`--sweep`は`eval`でだけ使える．どちらも使い方を表示する．使い方には`triage eval`の行を足す．
- `data/labeled.jsonl`の`--sweep`の表から，自動で振り分けたものの誤りを5%まで(正解率0.95以上)にするしきい値のうち，人の確認に回る割合がもっとも小さいものを選ぶ．選んだしきい値を，既定値にする．

### 使い方の例

```console
$ pnpm start eval --sweep data/labeled.jsonl
min-confidence  auto-routed  accuracy  review rate
0.0                      30      0.90         0.00
0.1                      29      0.90         0.03
0.2                      27      0.93         0.10
0.3                      26      0.96         0.13
…
1.0                       0       n/a         1.00
```

### 作るもの

| モジュール | 名前 | 型 | 役割 |
| --- | --- | --- | --- |
| `src/triage.ts` | `Triage`の`departmentConfidence` | `number` | 部署の判定の確信度．しきい値を変えて評価し直すのに使う． |
| `src/evaluate.ts` | `LabeledTicket` | `Ticket`に`department: string`を足したもの | 正解の部署が付いた問い合わせ． |
| `src/evaluate.ts` | `LabeledResult` | `{ label: string; result: Triage }` | 正解の部署と，振り分けの結果の組． |
| `src/evaluate.ts` | `Evaluation` | `{ minConfidence; total; autoRouted; correct; accuracy: number \| undefined; reviewRate }` | あるしきい値での評価． |
| `src/evaluate.ts` | `ConfusionMatrix` | `Record<string, Record<string, number>>` | 混同行列． |
| `src/evaluate.ts` | `parseLabeledTickets` | `(text: string) => { tickets: LabeledTicket[]; errors: string[] }` | ファイルの中身を読む． |
| `src/evaluate.ts` | `evaluate` | `(results: readonly LabeledResult[], minConfidence: number) => Evaluation` | 評価する． |
| `src/triage.ts` | `defaultMinConfidence` | `number` | 選んだしきい値に変える． |
| `src/evaluate.ts` | `confusionMatrix` | `(results: readonly LabeledResult[]) => ConfusionMatrix` | 混同行列を作る． |
| `src/evaluate.ts` | `sweep` | `(results: readonly LabeledResult[]) => Evaluation[]` | しきい値0.0〜1.0で評価する． |
| `src/format.ts` | `formatEvaluation`・`formatConfusionMatrix`・`formatSweep` | | 表示する． |

### 考えること

- `parseLabeledTickets`は，Iteration 6の`parseTickets`とよく似る．重複をなくすには，何を共通にすればよいか(リファクタリング)．
- `evaluate`のテストでは，判断エンジンを使わずに`LabeledResult`を作る．確信度と正解・不正解の組み合わせを，どう選べば計算を確かめられるか．
- `Triage`に項目を足すと，既存のどのテストに影響するか．
- 結合テストでは，偽の`fetch`が件名によって違う部署と確信度を返すようにすると，評価の計算を確かめられる．

## 演習7-4：設計書を更新する

- Container：評価用のファイルを足す．
- Component：`evaluate`を足す．`batch`との共通部分をどう描くかを考える．
- Code：`eval`の流れと，`LabeledTicket`・`Evaluation`・`ConfusionMatrix`を足す．自動で振り分けたとみなす条件と，正解率の決めごとを図の下に書く．しきい値の既定値も，選んだ値に直す．
- シーケンス：`triage eval`が`triage batch`とどこが同じで，どこが違うかを書く．

## 演習7-5：テスト駆動で実装する

- まず，JSON Linesの読み方を共通にするリファクタリングを行う．`parseTickets`のテストが通ったままであることを確かめる．
- `Triage`に`departmentConfidence`を足し，型検査が指摘するテストを直す．
- `test/unit/evaluate.test.ts`を作り，`evaluate`・`confusionMatrix`・`sweep`をテスト駆動で作る．割り算の結果を比べるときは，期待値も`2 / 3`のように割り算で書く．そうすれば，丸めの誤差を考えなくて済む．
- 表の列は，`padStart`・`padEnd`でそろえる．期待する表を自分で書くときは，空白の数を数え間違えやすい．表示したものを目で見て，列がそろっていることを確かめてから期待値にする．
- `app`に`eval`サブコマンドを足し，`test/integration/evaluate.test.ts`を作る．
- 最後に，`data/labeled.jsonl`で実行し，`--sweep`の表からしきい値を選ぶ．既定値のテストの期待値を先に直してRedを確かめてから，`defaultMinConfidence`を変える．

## 演習7-6：振り返る

1. 自分の`TESTLIST.md`と，解答例の[TESTLIST.md](../../solution/TESTLIST.md)を比べる．
2. 選んだしきい値はいくつか．そのとき人の確認に回るのは何%か．Iteration 4で仮に決めた0.2では，何が足りなかったか．
3. 混同行列から，どの部署の問い合わせを取り違えやすいかを読み取る．取り違えを減らすには，何を変えるとよいか．変えたら，もう一度評価する．
4. 本家Jevに切り替えるなら，切り替えの前後で何を比べるか．
5. 設計書と実装を見比べる．違う形になったところがあれば，設計書を実装に合わせて直す．

## 演習7-7(発展)：部署ごとの再現率を表示する

混同行列の右に，正解の部署ごとの再現率(その部署の問い合わせのうち，正しくその部署と判定した割合)を表示する．

```console
$ pnpm start eval data/labeled.jsonl
accuracy: 0.96 (auto-routed 26 / 30), review rate: 0.13

actual \ predicted   billing   support     sales    recall
billing                   10         1         0      0.91
support                    0        11         0      1.00
sales                      0         2         6      0.75
```

発展課題の解答の一例は，解答例のパッケージ(`../solution`)に`発展(演習7-7)`で始まるコメントとして書いてある．
解説は`../solution/docs/iteration-7.md`の演習7-7にある．

発展課題でも，テストリストを書いたあとに設計書を更新してから実装し，実装したら設計書と見比べる．
