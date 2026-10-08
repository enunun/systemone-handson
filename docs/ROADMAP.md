# ロードマップ

このハンズオンでは，問い合わせを振り分けるコマンドラインプログラム`triage`を，Iteration 0から10までの11回に分けて少しずつ育てる．
`triage`は，問い合わせの文章を読んで，担当部署・緊急度・返金の要否を判断する．
判断はSystem One(文章を生成せず，型の決まった答えを確率つきで返すモデル)に任せる．
手元ではOllamaで動かすTev1を，本番ではTypeSafe AIのJevを使う想定で，接続先を替えてもアプリのコードが変わらない設計を身につける．

完成すると，次のように使える(判断エンジンはOllamaのTev1)．

```console
$ triage "Refund not received" "I cancelled two weeks ago and still have no refund."
department: billing (0.87)
urgency: urgent (1.6)
refund: yes (0.83)
$ triage "Discount" "Do you offer a discount for non-profit organizations?"
department: support (0.53) -> needs review
urgency: somewhat urgent (0.9)
refund: no (0.17)
$ triage batch data/tickets.jsonl
line 21: skipped (not a JSON object with subject and body)
billing: 5, support: 11, sales: 3, needs review: 2
$ triage eval data/labeled.jsonl
accuracy: 0.93 (auto-routed 27 / 30), review rate: 0.10

actual \ predicted   billing   support     sales
billing                   10         1         0
support                    0        11         0
sales                      0         2         6
$ triage serve --port 3000
listening on http://localhost:3000
```

```console
$ curl -s localhost:3000/triage -d '{"subject": "Refund not received", "body": "Where is my refund?"}'
{"department":"billing","departmentProbability":0.8736835530882852,"departmentConfidence":0.653906619759055,"needsReview":false,"urgency":1.2259161755022923,"refundProbability":0.5204658538893784}
```

`triage`は，各Iterationのパッケージのディレクトリで`pnpm start`として実行する(`pnpm start batch data/tickets.jsonl`など)．

## 進め方

どのIterationも，次の順に進める．

1. 演習用パッケージ(`iterations/iteration-N/exercise`)に移り，引き継いだテストがすべて通ることを確かめる．
2. 資料(`docs/iteration-N.md`)の「要求」を読み，単体テストと結合テストのテストリストを`TESTLIST.md`に書く．
3. テストリストの振る舞いを実現する型・関数・モジュールを決め，`design/`の設計書を更新する．
4. テストリストから1つずつ選び，テストを書いて失敗させ(Red)，実装して通す(Green)．必要ならテストが通ったまま整理する(Refactor)．
5. 設計書と実装を見比べ，ずれていれば設計書を直す．
6. 解答例(`iterations/iteration-N/solution`)のテストリスト・設計書・コードと見比べる．

仕様書は用意しない．要求を読んで自分で書いたテストリストと，そこから育てたテストが，そのIterationの仕様になる．
テストリストは「何ができればよいか」を，設計書は「それをどんな型・関数・モジュールで作るか」を表す．
テスト駆動開発(TDD)の進め方とテストリストの書き方は[tdd.md](tdd.md)で，設計書の書き方は[design.md](design.md)で説明する．

設計書は，[C4モデル](https://c4model.com/)の4つの階層(Context・Container・Component・Code)と，判断エンジンとのやりとりを表すシーケンス図を，mermaidで書く．Iteration 0から10まで同じ設計書を育てる．

各Iterationの演習用パッケージは，1つ前のIterationの解答例のコードと設計書から始まる．
前のIterationを自分で書き終えていなくても，次のIterationに進める．

判断を下すサーバには，[Ollama](https://ollama.com/)とSystem Oneのモデル`tev1:0.8b`を使う．devcontainerを開くと，`http://ollama:11434`で起動する．

## テストの分け方

どのパッケージも，テストを2種類に分ける．

| テスト | 置き場所 | 確かめること |
| --- | --- | --- |
| 単体テスト | `test/unit/` | 1つのモジュールの関数を，単独で呼んで確かめる．Iteration 3からは，判断エンジンを偽物(fake)に差し替えて確かめる． |
| 結合テスト | `test/integration/` | プログラムの入口(`run`)を呼び，複数のモジュールを組み合わせた振る舞いを確かめる．判断エンジンとの通信は，SDKに偽の`fetch`を渡して差し替える． |

モデルを読み込むテストはない．どのテストも，Ollamaを起動せずに実行できる．

## Iterationの一覧

| Iteration | 作る機能 | 学ぶこと |
| --- | --- | --- |
| 0 | 返金を求めているかを判定する | System One，noul(はい・いいえ)，TypeSafeのSDK，Vitest，pnpm |
| 1 | 担当部署を判定する | choice(選択)，確率の分布，選択肢の説明文，1回の問い合わせで複数の質問 |
| 2 | 緊急度を判定する．判断と表示を分ける | score(段階評価)，期待値，判断と表示の分離 |
| 3 | 判断エンジンをアプリから切り離す | ポートとアダプタ，依存性の逆転，テストダブル(fakeとstub) |
| 4 | 迷っている問い合わせを人の確認に回す | 確信度，しきい値，コマンドラインのオプション(`parseArgs`) |
| 5 | 接続先を環境変数で選ぶ | 環境変数による設定，組み立ての場所(composition root)，Jevへの切り替え |
| 6 | ファイルの問い合わせをまとめて振り分ける | ファイルの読み込み，JSON Lines，サブコマンド，同時に送る数の制限 |
| 7 | ラベル付きデータで精度を測る | 評価，混同行列，しきい値と人の確認に回る割合の関係 |
| 8 | 振り分けをHTTP APIで公開する | `node:http`，入口側のアダプタ，CLIとAPIで同じ判断を共有する |
| 9 | 評価の記録を残し，指標で読む | 調整用と確かめ用のデータ，適合率・再現率，Brierスコア，平均絶対誤差，パーセンタイル |
| 10 | 2つの設定を比べ，確信度の較正を確かめる | 対応のある比較，調整用のデータの過大評価，確信度の較正，精度と速さの引き換え |

## Iteration 0：返金を求めているかを判定する

- 要求：件名と本文を引数に渡すと，返金を求めているかを判定し，確率とともに表示する．確率が0.5以上なら`yes`とする．
- 使い方：`triage "Refund not received" "Where is my refund?"`で`refund: yes (0.86)`と表示する．
- モジュール：`refund`(`refundQuestion`，`formatRefund`)，`app`(`run`)，`main`(プログラムの入口)．
- 設計書で更新するもの：5つの設計書を初めて書く．Contextは利用者・triage・Ollama，Containerはtriageの実行ファイルとOllama，Componentは3つのモジュール，Codeは型と関数の流れ，シーケンス図は`run`からOllamaへの1回の問い合わせ．
- 学ぶこと：System Oneと大規模言語モデルの違い，noulの質問と答え，TypeSafeのSDK(`TypeSafeClient`，`systemOne`)，Vitest，TDDの1周．
- 学習者が行う作業：`pnpm install`，テストの実行(すべて・単体テスト・結合テスト)，型検査，実行，curlでOllamaに直接問い合わせる．

## Iteration 1：担当部署を判定する

- 要求：担当部署(billing・support・sales)を判定し，もっとも確からしい部署とその確率を表示する．返金の判定と同じ1回の問い合わせで尋ねる．
- 使い方：1行目に`department: billing (0.73)`を表示し，2行目に返金の判定を表示する．
- モジュール：`department`(`departmentQuestion`，`formatDepartment`)を足す．`app`の`run`は，2つの質問をまとめて送る．
- 設計書で更新するもの：Componentに`department`を足す．Codeにchoiceの答えの流れを足す．シーケンス図の問い合わせに質問を足す．
- 学ぶこと：choiceの質問と答え，確率の分布，選択肢の説明文による結果の違い，1回の問い合わせで複数の質問に答えさせる理由．
- 既存のテストへの影響：結合テストの期待する出力に，部署の行が増える．

## Iteration 2：緊急度を判定する．判断と表示を分ける

- 要求：緊急度を4段階(not urgent・somewhat urgent・urgent・critical)で判定し，もっとも近い段階の名前と期待値を表示する．
- 使い方：2行目に`urgency: somewhat urgent (1.4)`のように表示する．
- リファクタリング：質問の組み立てと答えの解釈を`triage`(`triage`，型`Ticket`・`Triage`)に，表示を`format`(`formatTriage`，`formatDepartment`，`formatUrgency`，`formatRefund`)にまとめる．`refund`と`department`は，この2つに移す．`app`は両者をつなぐだけにする．
- モジュール：緊急度の質問を`triage`に，`formatUrgency`を`format`に足す．
- 設計書で更新するもの：Componentを`triage`・`format`を中心に描き直す．Codeに型`Triage`を足す．
- 学ぶこと：scoreの質問と答え，期待値と段階の対応，判断と表示を分ける理由．
- 既存のテストへの影響：部署・返金の単体テストを，`triage`と`format`のテストに移す．

## Iteration 3：判断エンジンをアプリから切り離す

- 要求：振る舞いは変えない．
- リファクタリング：アプリが判断を頼む窓口`DecisionEngine`(ポート)を定め，`triage`はこの型だけに依存させる．TypeSafeのSDKを使うアダプタ(`systemone-engine`)と，決まった答えを返すアダプタ(`fake-engine`)を作る．
- 設計書で更新するもの：Componentに，ポートと2つのアダプタを描き，`triage`からSDKへの依存がなくなったことを示す．シーケンス図にアダプタを挟む．
- 学ぶこと：ポートとアダプタ，依存性の逆転，テストダブル(fakeとstub)の使い分け．
- 既存のテストへの影響：`triage`の単体テストで，偽の`fetch`をfakeに置き換える．

## Iteration 4：迷っている問い合わせを人の確認に回す

- 要求：部署の判定の確信度がしきい値(既定0.2)を下回ったら，部署の行の末尾に`-> needs review`を付ける．しきい値は`--min-confidence`で変えられる．0から1の数でなければ，使い方を表示する．
- 使い方：`triage --min-confidence 0.1 "Plan" "What is the difference between your plans?"`
- モジュール：`triage`の結果に`needsReview`を足し，`triage`がしきい値を受け取る．`format`の部署の行に印を付ける．`app`で引数を解析する．
- 設計書で更新するもの：Codeに，確信度としきい値による分岐を足す．
- 学ぶこと：確率と確信度の違い，しきい値の決め方，`util.parseArgs`．

## Iteration 5：接続先を環境変数で選ぶ

- 要求：接続先のURL・モデル名・APIキーを，環境変数`SYSTEMONE_BASE_URL`・`SYSTEMONE_MODEL`・`SYSTEMONE_API_KEY`で指定する．`DECISION_ENGINE=fake`ならfakeを使う．必要な値がないときは，何が足りないかを表示して終了する．
- 使い方：`.env`を書き換えるだけで，Ollamaから本家Jevに切り替わる．
- モジュール：`config`(`loadConfig`)を足す．`main`で，設定からアダプタを選んで組み立てる．
- 設計書で更新するもの：ContextとContainerにJevを足す．Componentに`config`を足す．
- 学ぶこと：環境変数による設定，組み立ての場所(composition root)，`node --env-file`，OllamaとJevの違い(モデル名，認証，料金)．

## Iteration 6：ファイルの問い合わせをまとめて振り分ける

- 要求：`triage batch <ファイル>`で，JSON Lines形式のファイルに並んだ問い合わせを振り分け，部署ごとの件数と，人の確認に回した件数を表示する．読めない行は，行番号とともに知らせて飛ばす．同時に送る問い合わせは4件までにする．
- 使い方：`triage batch data/tickets.jsonl`で`billing: 5, support: 11, sales: 3, needs review: 2`．
- モジュール：`batch`(`parseTickets`，`mapWithConcurrency`，`summarize`)を足す．`format`に`formatSummary`を，`triage`に`departmentNames`を足す．`app`をサブコマンドに対応させ，ファイルを読む．
- 設計書で更新するもの：Containerにファイルを足す．Componentに`batch`を足す．シーケンス図に，複数の問い合わせを並行して送る流れを足す．
- 学ぶこと：`node:fs/promises`，JSON Linesと型ガード，サブコマンド，`Promise.all`と同時に送る数の制限，テストでの一時ファイル．

## Iteration 7：ラベル付きデータで精度を測る

- 要求：`triage eval <ファイル>`で，正解の部署が付いた問い合わせを振り分け，自動で振り分けた件数とその正解率，人の確認に回した割合を表示する．`--sweep`を付けると，しきい値を0.1刻みで変えた結果を表で表示する．
- 使い方：`triage eval data/labeled.jsonl`で`accuracy: 0.93 (auto-routed 27 / 30), review rate: 0.10`と混同行列を表示する．
- モジュール：`evaluate`(`parseLabeledTickets`，`evaluate`，`confusionMatrix`，`sweep`)を足す．`triage`の結果に部署の確信度を足す．
- リファクタリング：JSON Linesの読み方を`batch`の`parseJsonLines`にまとめ，`parseTickets`と`parseLabeledTickets`で使う．
- 設計書で更新するもの：Componentに`evaluate`を足す．Codeに評価の流れを足す．
- 学ぶこと：評価用データ，正解率，混同行列，しきい値と「人の確認に回る割合」の関係，Jevへ替える前に精度を測る意味．

## Iteration 8：振り分けをHTTP APIで公開する

- 要求：`triage serve --port <番号>`でHTTPサーバを起動する．`POST /triage`に件名と本文のJSONを送ると，振り分けの結果をJSONで返す．入力が誤っていれば400を返す．
- 使い方：冒頭の`triage serve`と`curl`の例．
- モジュール：`adapters/http-api`(`createApi`)を足す．`app`に`serve`サブコマンドを足す．CLIとHTTP APIは，同じ`triage`を使う．
- 設計書で更新するもの：ContextにAPIの利用者を，ContainerにHTTP APIを足す．Componentで，入口側のアダプタ(CLI・HTTP API)と出口側のアダプタ(判断エンジン)を描き分ける．シーケンス図にHTTPのリクエストからの流れを足す．
- 学ぶこと：`node:http`，入力の検証，入口側と出口側のアダプタ，HTTPサーバの結合テスト．

## Iteration 9：評価の記録を残し，指標で読む

- 要求：評価用のデータに，返金の要否(`refund`)と緊急度の段階(`urgency`，0〜3)の正解を足す．データは2つに分け(各30件)，質問の調整には`data/dev.jsonl`を，調整した結果の確認には`data/test.jsonl`を使う．`triage eval --out <ファイル>`で，1件ごとの振り分けの結果と所要時間をJSON Linesで記録する．`triage report <記録>`は，記録だけを読んで指標を表示する．指標は，部署の正解率と人の確認に回る割合，部署ごとの適合率と再現率，返金の正解率とBrierスコア，緊急度の平均絶対誤差，所要時間の中央値と95パーセンタイルである．
- 使い方：`triage eval --out results/dev.jsonl data/dev.jsonl`のあとに`triage report results/dev.jsonl`．
- モジュール：`records`(`EvalRecord`，`formatRecords`，`parseRecords`)と`metrics`(`precisionRecall`，`refundMetrics`，`meanAbsoluteError`，`percentile`)を足す．`evaluate`の正解付きの問い合わせに`refund`と`urgency`を足す．`format`に`formatReport`を足す．`app`に`eval`の`--out`と`report`サブコマンドを足す．`data/labeled.jsonl`は`data/dev.jsonl`に置き換える．
- 設計書で更新するもの：Containerに評価用のデータと記録のファイルを足す．Componentに`records`と`metrics`を足す．Codeに，記録から指標を作る流れを足す．シーケンス図に，記録を書き出す流れと，記録だけを読む`report`の流れを足す．
- 学ぶこと：調整用と確かめ用のデータを分ける理由，評価の記録を残して指標を計算し直す，適合率と再現率，確率の評価(Brierスコア)，段階の評価(平均絶対誤差)，パーセンタイル，`node:fs/promises`の`writeFile`と`mkdir`，`performance.now`．

## Iteration 10：2つの設定を比べ，確信度の較正を確かめる

- 要求：`triage compare [--min-confidence <0-1>] <記録A> <記録B>`で，同じデータの2つの記録の指標を並べて表示し，部署の判定が食い違った問い合わせと，片方だけが正解した件数を表示する．`triage report --calibration <記録>`で，部署の確信度を0.2刻みの区間に分け，区間ごとの件数・確信度の平均・正解率を表示する．環境変数`SYSTEMONE_TIMEOUT_MS`で，判断エンジンへの1回の問い合わせを待つ時間を指定できる．部署の選択肢の説明文を`data/dev.jsonl`で調整し，`data/test.jsonl`で一度だけ確かめる．
- 使い方：`triage compare results/test-before.jsonl results/test-after.jsonl`，`triage report --calibration results/test-after.jsonl`．モデルを`tev1:4b`に替えた記録とも比べる．
- モジュール：`compare`(`compareRecords`)と，`metrics`に`calibration`を足す．`format`に`formatComparison`と`formatCalibration`を足す．`config`に`timeoutMs`を足し，`main`でSDKに渡す．`triage`の部署の説明文を変える．
- 設計書で更新するもの：Componentに`compare`を足す．Codeに比較と較正の流れを足す．
- 学ぶこと：同じデータでの比較(対応のある比較)，食い違った問い合わせを読む，件数が少ないときの差の読み方，調整用のデータで測った精度が高く出る理由，確信度の較正，精度と速さの引き換え，タイムアウトの設定，モデルの取得(`/api/pull`)．
