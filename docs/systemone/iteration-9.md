# Iteration 9：評価の記録と指標

Iteration 9で初めて使う評価の考え方・指標・APIを説明する．
コマンドの例は，devcontainerの中で実行した実際の結果である．

## 調整用と確かめ用のデータを分ける

Iteration 7では，30件の評価用データで正解率を測った．
その結果を見て質問の文や選択肢の説明文を直すと，そのデータで測った正解率は上がる．
ただし，上がった分には，「その30件にたまたま合う直し方」をした分も含まれる．
同じデータで直して同じデータで測ると，初めて見る問い合わせでの正解率より高く出やすい．

そこで，評価用のデータを2つに分ける．

| ファイル | 使い方 |
| --- | --- |
| `data/dev.jsonl`(調整用) | 何度でも測り，誤りを読んで，質問の文を直す手がかりにする． |
| `data/test.jsonl`(確かめ用) | 直し終えたあとに，一度だけ測る．誤りを読んで直すことには使わない． |

確かめ用のデータで測った結果を見てさらに直すと，確かめ用のデータも調整用になってしまう．
確かめ用のデータは，「初めて見る問い合わせでどれくらい当たるか」の見積もりとして取っておく．

どちらのデータも，1行に1件の問い合わせに，3つの正解を付ける．

```json
{"subject": "Double charge", "body": "My card was charged twice for the same order.", "department": "billing", "refund": true, "urgency": 2}
```

- `department`：正解の部署．
- `refund`：返金を求めているなら`true`，求めていないなら`false`．
- `urgency`：緊急度の段階の番号(0がnot urgent，3がcritical)．

正解を付けるのは人である．どちらとも取れる問い合わせでは，人によって正解が分かれる．
迷った問い合わせは，正解を付けた理由をチームで話し合って決めておく．

## 評価の記録を残す

評価では，問い合わせを1件ずつ判断エンジンに尋ねる．`tev1:0.8b`なら1件1秒ほどでも，件数やモデルの大きさが増えると時間がかかる．
1件ごとの結果を記録しておけば，あとから別の指標を計算したり，しきい値を変えたりするときに，判断エンジンに尋ね直さなくて済む．

記録はJSON Linesで，1行に1件，正解(`ticket`)・振り分けの結果(`result`)・かかった時間(`elapsedMs`)を書く．

```json
{"ticket":{"subject":"Double charge","body":"My card was charged twice for the same order.","department":"billing","refund":true,"urgency":2},"result":{"department":"billing","departmentProbability":0.9900701878814934,"departmentConfidence":0.9488280825445914,"needsReview":false,"urgency":1.1704582100640382,"refundProbability":0.14255612527951264},"elapsedMs":978}
```

この問い合わせでは，部署は正しいが，緊急度は正解の2に対して1.17，返金の確率は正解の「はい」に対して0.14だった．

記録は，同じモデル・同じ質問で測った結果の写しである．
モデルや質問の文を変えたら，記録を取り直す．

## 部署ごとの適合率と再現率

正解率は全体を1つの数にまとめたものなので，どの部署で誤っているかはわからない．
部署ごとに，次の2つを求める．

- 適合率(precision)：その部署と判定したもののうち，正解もその部署だった割合．「supportに回したものは，本当にsupportの問い合わせだったか」．
- 再現率(recall)：正解がその部署のもののうち，その部署と判定できた割合．「supportの問い合わせを，取りこぼさずにsupportへ回せたか」．

Iteration 7の混同行列で考える．

```text
actual \ predicted   billing   support     sales
billing                   10         1         0
support                    0        11         0
sales                      0         2         6
```

- supportの再現率は，support行の11件のうち11件なので1.00である．
- supportの適合率は，support列の14件(1 + 11 + 2)のうち11件なので0.79である．supportと判定した中に，billingとsalesの問い合わせが3件混ざっている．
- salesの再現率は，sales行の8件のうち6件なので0.75である．salesの問い合わせの4件に1件を取りこぼしている．

適合率が低い部署には，ほかの部署の問い合わせが流れ込んでいる．再現率が低い部署の問い合わせは，ほかの部署へ流れ出ている．
どちらを重く見るかは，誤りの影響で決める．たとえば，salesの問い合わせをsupportに回すと，商談を逃すおそれがある．
ある部署と判定したものが1件もなければ，適合率は求められない(割る数が0になる)．このハンズオンでは`n/a`と表示する．

## 確率を評価する：Brierスコア

返金の答えは，確率(0から1)である．0.5で区切って「はい・いいえ」にすれば，正解率を求められる．
ただし，正解率は0.51と0.99を区別しない．確率そのものがどれくらい正しいかは，Brierスコアで測る．

```text
Brierスコア = (確率 − 正解)² の平均(正解は，はいなら1，いいえなら0)
```

`node`の対話モードで，1件分を計算してみる．

```console
> (0.9 - 1) ** 2
0.009999999999999995
> (0.9 - 0) ** 2
0.81
> (0.5 - 1) ** 2
0.25
```

- 正解に近い確率を出せば，0に近くなる．
- 自信を持って外すと(0.9と答えて正解がいいえ)，大きくなる．
- いつも0.5と答えると，0.25になる．Brierスコアが0.25より大きければ，迷ったまま答えるよりも悪い．

Brierスコアは，0に近いほどよい．

## 段階を評価する：平均絶対誤差

緊急度の答えは，段階の番号の期待値(0から3)である．
正解の段階との差の絶対値を平均したものを，平均絶対誤差(mean absolute error)という．

```text
平均絶対誤差 = |期待値 − 正解の段階| の平均
```

期待値1.2で正解が2なら，その問い合わせの誤差は0.8である．
平均絶対誤差が0.8なら，「平均して1段階近くずれる」と読める．
段階を四捨五入して正解率を求めると，1段階ずれたものと3段階ずれたものを同じ「誤り」として数えてしまう．
平均絶対誤差は，ずれの大きさを区別する．

## 所要時間：中央値とパーセンタイル

所要時間は，平均だけを見ると，たまに遅い1件に引っ張られる．

```console
> const times = [700, 650, 720, 690, 5000]
undefined
> times.reduce((sum, t) => sum + t, 0) / times.length
1552
```

4件は0.7秒前後なのに，平均は1.5秒になる．
そこで，値を小さい順に並べ，ある割合の位置にある値を使う．これをパーセンタイルという．

```console
> const sorted = times.toSorted((a, b) => a - b)
undefined
> sorted
[ 650, 690, 700, 720, 5000 ]
> sorted[Math.ceil(0.5 * sorted.length) - 1]
700
> sorted[Math.ceil(0.95 * sorted.length) - 1]
5000
```

- 50パーセンタイル(中央値)：半分の問い合わせは，これより速く終わる．ふだんの速さを表す．
- 95パーセンタイル(p95)：20件に1件は，これより遅い．待たされる人がどれくらい待つかを表す．

ここでは，「p%の位置」を`Math.ceil(p / 100 × 件数)`番目(1から数える)とした．この求め方を最近順位法という．
パーセンタイルの求め方にはいくつか流儀があり，件数が少ないと値が少し変わる．比べるときは，同じ求め方にそろえる．
`toSorted`は，元の配列を変えずに，並べ替えた新しい配列を返す(Iteration 1の発展課題で使った)．

### 所要時間の測り方

時間は，`performance.now()`の差で測る．`performance.now()`は，プログラムが始まってからの時間をミリ秒(小数を含む)で返す．

```ts
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const start = performance.now();
await wait(200);
console.log(Math.round(performance.now() - start));
```

```console
$ node timer.ts
201
```

`Date.now()`でも差は求められるが，`performance.now()`は時計の調整(時刻合わせ)の影響を受けないので，時間を測るのに向いている．

測り方そのものが結果を変えることにも気を付ける．
Iteration 6では，判断エンジンに同時に4件まで送った．Ollamaは1件ずつ推論するので，同時に送ると，残りの3件は順番を待つ．
`triage eval`を同時に4件送る形のまま時間を測ると，`tev1:0.8b`の中央値は約13秒になった．1件ずつ送ると，約0.7秒である．
順番待ちの時間を含めずに1件の推論の時間を測るため，`triage eval`は1件ずつ送る．

## ファイルに書く：`writeFile`と`mkdir`

`node:fs/promises`の`writeFile(ファイル名, 文字列)`は，ファイルを作って(あれば上書きして)文字列を書く．
書く先のディレクトリがなければ，失敗する．
`mkdir(ディレクトリ, { recursive: true })`は，途中のディレクトリもまとめて作る．すでにあっても失敗しない．
ファイル名からディレクトリの部分を取り出すには，`node:path`の`path.dirname`を使う．

```ts
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const file = "out/records.jsonl";
try {
  await writeFile(file, "{}\n");
} catch (error) {
  console.log(String(error));
}
await mkdir(path.dirname(file), { recursive: true });
await mkdir(path.dirname(file), { recursive: true });
await writeFile(file, "{}\n");
console.log("wrote", file);
```

```console
$ node write.ts
Error: ENOENT: no such file or directory, open 'out/records.jsonl'
wrote out/records.jsonl
```

2回目の`mkdir`も失敗しない．
記録のディレクトリ(`results/`)は，Gitに入れない．記録は，測った人の環境で取り直せるからである．
