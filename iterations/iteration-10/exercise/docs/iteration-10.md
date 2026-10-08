# Iteration 10：2つの設定を比べ，確信度の較正を確かめる(演習)

## このIterationで作るもの

Iteration 9で作った評価の記録を使って，質問の文やモデルを替えた結果を比べる．
`triage compare`は，同じデータで取った2つの記録の指標を並べ，部署の判定が食い違った問い合わせを表示する．

```console
$ pnpm start compare results/test-before.jsonl results/test-after.jsonl
A: results/test-before.jsonl
B: results/test-after.jsonl

metric                             A       B
accuracy                        0.79    0.93
review rate                     0.03    0.03
refund accuracy                 1.00    1.00
refund brier score             0.011   0.011
urgency mean absolute error     0.77    0.79
latency median (ms)             2806    2824
latency p95 (ms)                3067    3234

department differs: 3
subject                 actual    A         B
Price increase          billing   sales     billing
Enterprise demo         sales     support   sales
Startup program         sales     support   sales
only A correct: 0, only B correct: 3
```

`triage report --calibration`は，確信度の区間ごとに，実際の正解率を表示する．

作りながら，同じデータでの比べ方，片方だけが正解した件数の読み方，調整用のデータで測った精度が高く出る理由，確信度の較正，精度と速さの引き換え，タイムアウトの設定を学ぶ．
最後に，部署の選択肢の説明文を調整用のデータで直し，確かめ用のデータで一度だけ確かめる．モデルを`tev1:4b`に替えた結果とも比べる．

## 進め方

演習10-1から順に進める．
詰まったら，`../solution/docs/iteration-10.md`の同じ番号の節を読む．
コマンドは，このパッケージのディレクトリ(`iterations/iteration-10/exercise`)で実行する．

## 演習10-1：引き継いだパッケージを確かめる

1. テストを実行して型を検査する．Iteration 9の91のテストがすべて通ることを確かめる．
2. `.env`を作り，比べる前の記録を2つ取る．`test`の結果はIteration 9で見たものと同じなので，表示は読み飛ばしてよい．

   ```sh
   pnpm start eval --out results/dev-before.jsonl data/dev.jsonl
   pnpm start eval --out results/test-before.jsonl data/test.jsonl
   ```

## 演習10-2：比べ方と較正を学ぶ

[Iteration 10：比べ方と，確信度の較正](../../../../docs/systemone/iteration-10.md)を読む．

読み終えたら，次を試す．

1. 片方だけが正解した件数が「0件と5件」のとき，差がなくてもそうなる確率を`node`の対話モードで求める．「2件と7件」ではどうか(ヒント：食い違った9件のうち，2件以下が片方に転ぶ確率を足し合わせる)．
2. 資料の較正の表で，確信度0.2〜0.4の区間の正解率が0.80になったのはなぜか．確信度が0.3の問い合わせは，人の確認に回すべきか．
3. `curl -s http://ollama:11434/v1/models`で，いま使えるモデルを確かめる．

## 演習10-3：テストリストを書く

次の要求を読み，[TESTLIST.md](../TESTLIST.md)にテストリストを書く．

### 要求

- `triage compare [--min-confidence <0-1>] <記録A> <記録B>`で，同じデータで取った2つの評価の記録を比べる．判断エンジンには尋ねない．表示は「このIterationで作るもの」の例のとおりである．
  - 1・2行目に，2つのファイル名を`A: …`・`B: …`として表示する．
  - 空の行のあとに，`triage report`と同じ指標を，AとBで並べた表を表示する．部署の正解率は，`--min-confidence`のしきい値(なければ0.2)で求める．所要時間はミリ秒の整数とする．
  - 空の行のあとに，部署の判定がAとBで違う問い合わせの件数と，その件名・正解の部署・Aの判定・Bの判定を表示する．食い違いがなければ，表の見出しは表示しない．
  - 最後に，Aだけが部署を正解した件数と，Bだけが正解した件数を表示する．
  - 2つの記録は，同じ位置の問い合わせどうしで突き合わせる．件数か，同じ位置の件名と本文が違えば，`the records are not from the same tickets`を表示して終了コード1で終わる．
- `triage report --calibration <記録>`で，指標のあとに空の行を挟んで，確信度の区間ごとの表を表示する．
  - 区間は，部署の確信度を0から1まで0.2刻みに分けた5つである．区間は下端を含み，上端を含まない．確信度1は最後の区間に入れる．
  - 区間ごとに，件数・確信度の平均・正解率を表示する．記録のない区間の平均と正解率は`n/a`とする．

  ```text
  confidence  tickets  mean confidence  accuracy
  0.0-0.2           1             0.07      0.00
  0.2-0.4           5             0.29      0.80
  ```

- `--calibration`は`report`でだけ使える．使い方の`triage report`の行に`[--calibration]`を足し，`triage compare [--min-confidence <0-1>] <file A> <file B>`の行を足す．
- 環境変数`SYSTEMONE_TIMEOUT_MS`で，判断エンジンへの1回の問い合わせを待つ時間(ミリ秒)を指定できる．省略できる．正の整数でなければ，`SYSTEMONE_TIMEOUT_MS must be a positive integer: abc`のように表示して終了コード1で終わる．`.env.example`に，コメントで書き方を足す．
- 部署の選択肢の説明文を，`data/dev.jsonl`の誤りを読んで直す．直したら`data/test.jsonl`で一度だけ確かめる．

### 作るもの

| モジュール | 名前 | 型 | 役割 |
| --- | --- | --- | --- |
| `src/compare.ts` | `compareRecords` | `(a: readonly EvalRecord[], b: readonly EvalRecord[]) => { ok: true; comparison: Comparison } \| { ok: false; message: string }` | 2つの記録を突き合わせる． |
| `src/compare.ts` | `Comparison` | `{ differences: Difference[]; onlyA: number; onlyB: number }` | 食い違った問い合わせと，片方だけが正解した件数． |
| `src/metrics.ts` | `calibration` | `(results: readonly LabeledResult[], binCount?: number) => CalibrationBin[]` | 確信度の区間ごとの件数・平均・正解率． |
| `src/format.ts` | `formatComparison` | `(files: { a: string; b: string }, a: Report, b: Report, comparison: Comparison) => string` | 比較を表示する文字列にする． |
| `src/format.ts` | `formatCalibration` | `(bins: readonly CalibrationBin[]) => string` | 区間ごとの表にする． |
| `src/config.ts` | `Config`の`timeoutMs` | `number \| undefined` | 問い合わせを待つ時間． |
| `src/main.ts` | (変える) | | `timeoutMs`があれば，`TypeSafeClient`の`timeout`に渡す． |
| `src/triage.ts` | 部署の質問 | (変える) | 選択肢の説明文を直す． |

### 考えること

- `compareRecords`のテストに入れる問い合わせを考える．両方正解・A正解とB誤り・B正解とA誤り・両方誤りで判定は別・両方誤りで判定は同じ，のどれがあれば，すべての数え方を確かめられるか．
- 区間の境目(0.2ちょうど，1ちょうど)は，どの区間に入るか．どう確かめるか．
- `compare`の結合テストでは，判定の違う2つの記録をどうやって作るか．
- 説明文を直すと，既存のテストのどれの期待値が変わるか．

## 演習10-4：設計書を更新する

- Container：`.env`の説明に，問い合わせを待つ時間を足す．評価の記録を`triage compare`も読むことを書く．
- Component：`compare`を足す．2つの記録の指標は，どのモジュールが求めるかを考える．
- Code：`report --calibration`と`runCompare`の流れを足す．`SYSTEMONE_TIMEOUT_MS`の扱いを，設定の決めごとに足す．主な型に`CalibrationBin`・`Comparison`を足す．
- シーケンス：`triage compare`の図を足す．

## 演習10-5：テスト駆動で実装する

- `compareRecords`の突き合わせは，配列の添字で行う．`a.every((record, i) => …b[i]…)`で，同じ位置の件名と本文を確かめる．
- `calibration`では，確信度に区間の数を掛けて`Math.floor`すると，区間の番号になる．確信度1のときに番号が区間の数にならないように気を付ける．
- `formatComparison`の列は，Iteration 7と同じく`padStart`・`padEnd`でそろえる．
- `compare`の結合テストでは，件名ごとに答えを変える偽の`fetch`を2つ用意し，それぞれで`run(["eval", "--out", …])`を実行して記録を作る．
- `SYSTEMONE_TIMEOUT_MS`は，空の値なら省略したものとして扱う．`TypeSafeClient`に渡すときは，資料の「省略できる設定をオブジェクトに入れる」の書き方を使う．
- 実装できたら，次の順に比べる．
  1. `dev`の誤りを一覧にする．

     ```console
     $ node -e 'for (const line of require("node:fs").readFileSync("results/dev-before.jsonl", "utf8").trim().split("\n")) { const { ticket, result } = JSON.parse(line); if (result.department !== ticket.department) console.log(ticket.subject, ticket.department, "->", result.department); }'
     Payment method billing -> support
     Demo sales -> support
     Trial sales -> support
     ```

  2. 誤りの問い合わせの本文を`data/dev.jsonl`で読み，部署の選択肢の説明文を直す．テストの期待値を先に直し，Redを確かめてから`src/triage.ts`を直す．
  3. `pnpm start eval --out results/dev-after.jsonl data/dev.jsonl`で記録を取り，`pnpm start compare results/dev-before.jsonl results/dev-after.jsonl`で比べる．よくならなければ2に戻る．
  4. 直し終えたら，`test`で一度だけ確かめる．`pnpm start eval --out results/test-after.jsonl data/test.jsonl`と`pnpm start compare results/test-before.jsonl results/test-after.jsonl`を実行する．
  5. `curl -s http://ollama:11434/api/pull -d '{"model": "tev1:4b", "stream": false}'`で`tev1:4b`を取得する．`.env`の`SYSTEMONE_MODEL`を`tev1:4b`に，`SYSTEMONE_TIMEOUT_MS`を`120000`にして，`pnpm start eval --out results/test-4b.jsonl data/test.jsonl`で記録を取る．1件に15秒ほどかかる．`tev1:4b`を動かせない環境では，配布した記録`data/records/test-tev1-4b.jsonl`を使う．
  6. `pnpm start compare results/test-after.jsonl results/test-4b.jsonl`で比べ，`pnpm start report --calibration`で2つの記録の較正の表を見る．
  7. `.env`を`tev1:0.8b`に戻す．

## 演習10-6：振り返る

1. 自分の`TESTLIST.md`と，解答例の[TESTLIST.md](../../solution/TESTLIST.md)を比べる．
2. 説明文を直したあとの部署の正解率は，`dev`と`test`でいくつか．どちらを，新しい問い合わせでの正解率の見積もりとして報告するか．
3. 説明文を直す前と後の`test`の比較で，片方だけが正解した件数から，直したことに効果があったと言えるか．演習10-2の1の考え方で確かめる．
4. 直した`tev1:0.8b`と`tev1:4b`の比較から，どちらを使うか．精度・確率の質・速さ・必要なメモリのそれぞれについて，記録の数字を根拠に答える．
5. 2つのモデルの較正の表を比べる．しきい値0.2は，どちらのモデルでも妥当か．
6. 設計書と実装を見比べる．違う形になったところがあれば，設計書を実装に合わせて直す．

## 演習10-7(発展)：期待較正誤差を表示する

`report --calibration`の表の下に，期待較正誤差(expected calibration error)を表示する．
期待較正誤差は，区間ごとの「確信度の平均と正解率の差の絶対値」を，その区間の件数の割合で重み付けして足したものである．
0に近いほど，確信度と正解率が一致している．記録がなければ`n/a`とする．

```console
$ pnpm start report --calibration results/test-after.jsonl
…
confidence  tickets  mean confidence  accuracy
0.0-0.2           1             0.07      0.00
0.2-0.4           5             0.29      0.80
0.4-0.6           3             0.52      0.67
0.6-0.8           6             0.72      1.00
0.8-1.0          15             0.95      1.00
expected calibration error: 0.182
```

発展課題の解答の一例は，解答例のパッケージ(`../solution`)に`発展(演習10-7)`で始まるコメントとして書いてある．
解説は`../solution/docs/iteration-10.md`の演習10-7にある．

発展課題でも，テストリストを書いたあとに設計書を更新してから実装し，実装したら設計書と見比べる．
