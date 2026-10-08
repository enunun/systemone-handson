# コースの計画

教材を作る人とエージェントのための計画である．学習者向けの説明は`README.md`と`docs/`にある．
教材は`build-handson`スキル(`enunun/system-development-skills`)の進め方で作る．各Iterationで作るものは`docs/ROADMAP.md`で決める．

## 対象と目標

- 学習者：TypeScriptを読み書きでき，大規模言語モデルのAPIを使ったことがあるWebエンジニア．TDDや設計書の経験は問わない．
- 目標：
  - System One(型の決まった答えを確率つきで返すモデル)と大規模言語モデルを使い分けられる．
  - 判断エンジンをポートとアダプタで切り離し，接続先を替えてもアプリのコードを変えずに済む設計ができる．
  - 確信度を使って，自動で処理するものと人に回すものを分けられる．
  - テストリストから始めるTDDと，設計書を実装に合わせて育てる進め方を身につける．
- 教材の言語：日本語(常体，読点は「，」，句点は「．」)．サンプルの問い合わせ文と，プログラムの出力は英語．
- 規模：Iteration 0から10までの11回．1回あたり30分から1時間．

## 題材

問い合わせを振り分けるコマンドラインプログラム`triage`．件名と本文から，担当部署(billing・support・sales)・緊急度(4段階)・返金の要否を判断する．
最終的な使い方は`docs/ROADMAP.md`の冒頭にある．

判断は，TypeSafe Jevと同じHTTP API(`POST /v1/systemone`)を持つサーバに任せる．
学習中は[Ollama](https://ollama.com/)で，System Oneのモデル`tev1:0.8b`(Together AIのTev1の0.8B版)をCPUで動かす．Ollamaは0.35から`/v1/systemone`を持つ．本家Jevへの切り替えはIteration 5で説明し，Jevの実行はしない．クラウドへのデプロイは扱わない．

## 設計書

各パッケージの`design/`に，次の5つをmermaidで書く．書き方は`docs/design.md`で説明する．

| ファイル | 図 | 示すもの |
| --- | --- | --- |
| `01-context.md` | C4Context | 利用者，triage，判断エンジン(Ollama，Iteration 5からJev)，Iteration 8からAPIの利用者 |
| `02-container.md` | C4Container | triageの実行ファイル，Ollama，Iteration 6からファイル，Iteration 8からHTTP API，Iteration 9から評価の記録 |
| `03-component.md` | C4Component | `src/`のモジュールと，その依存(`import`)．外部のパッケージは`Component_Ext`で描く |
| `04-code.md` | flowchart・classDiagram | 型と関数の流れ，主な型 |
| `05-sequence.md` | sequenceDiagram | 入口から判断エンジンまでの呼び出しの順序 |

- 名前は実装の名前と一致させる．Componentの`Component`・`Component_Ext`の名前は，`src/`からの相対パス(拡張子なし)か，パッケージ名にする．
- Componentの矢印(`Rel`)は，実装の`import`と一致させる．`tools/check-component.mjs`が照合する．
- Iteration 0の演習では，5つのファイルに見出しと，描くものを説明するコメントだけを置く．

## 開発環境

- Dev Container：`.devcontainer/`．mise公式のイメージに，`mise.toml`の版のNode・pnpm・rtk・lefthookを入れる．`compose.yml`で`ollama`サービス(公式のイメージ`ollama/ollama`)も起動し，アプリからは`http://ollama:11434`で呼ぶ．`ollama`サービスは，起動時に`tev1:0.8b`がなければダウンロードする．VSCodeの拡張は`bierner.markdown-mermaid`など．
- 言語とツール：TypeScript(ビルドせず，Nodeの型の除去で実行する)，`tsc`(型検査のみ)，Vitest(テスト)，oxlint(リント)，oxfmt(整形)．
- 文書の検査：textlint，markdownlint，mermaidの構文検査(`tools/mermaid`)，Componentの照合(`tools/check-component.mjs`)．
- 検証のコマンド：`mise run check`(整形の検査・リント・型検査・すべてのパッケージのテスト・発展課題の検査)．

### リポジトリの構成

```text
COURSE.md                        この計画
README.md                        学習者向けの概要とIterationの一覧
docs/ROADMAP.md                  各Iterationの要求・学ぶこと・設計書の更新
docs/tdd.md                      TDDとテストリストの書き方
docs/design.md                   設計書の書き方
docs/systemone/iteration-N.md    Iteration Nで初めて使う概念・API・ツールの解説
iterations/iteration-N/
  exercise/                      演習用パッケージ(triage-iteration-N)
  solution/                      解答例パッケージ(triage-solution-iteration-N)
tools/                           mermaidの検査，Componentの照合，発展課題の検査
```

- `pnpm-workspace.yaml`は，`tools/*`・`iterations/*/*`をすべて含む．学習者がパッケージを登録する作業はない．
- パッケージの中身：`README.md`，`TESTLIST.md`，`design/`，`docs/iteration-N.md`，`package.json`，`tsconfig.json`，`vitest.config.ts`，`src/`，`test/unit/`，`test/integration/`．解答例には，発展課題で新しく作るファイルを置く`advanced/`を加えることがある．
- 相対importには`.ts`を付ける(Nodeの型の除去で実行するため)．
- 演習で使うデータのファイル(`data/`)は，それを初めて使うIterationの演習用パッケージに，解答例と同じものを置く．

### テスト

- Vitestの`projects`で`unit`と`integration`を分ける．`vitest.config.ts`は各パッケージに置く．
- 単体テスト(`test/unit/`)：1つのモジュールの関数を単独で呼ぶ．Iteration 3からは判断エンジンをfakeに差し替える．
- 結合テスト(`test/integration/`)：`app`の`run`を呼ぶ．判断エンジンの通信は，SDKの`fetch`オプションに偽の関数を渡して差し替える．
- テストファイルは機能(モジュール)ごとに1つで，Iterationの名前を付けない．
- どのテストもOllamaやモデルを使わない．

### コマンド(パッケージのディレクトリで実行する)

| 目的 | コマンド | 初出 |
| --- | --- | --- |
| 依存の導入 | `pnpm install`(リポジトリの直下) | 0 |
| すべてのテスト | `pnpm test` | 0 |
| 単体テストだけ | `pnpm test --project unit` | 0 |
| 1つのファイルのテスト | `pnpm test <ファイル>` | 1 |
| 型検査 | `pnpm typecheck` | 0 |
| 実行 | `pnpm start "<件名>" "<本文>"` | 0 |
| 判断エンジンに直接問い合わせる | `curl http://ollama:11434/v1/systemone ...` | 0 |

初出のIterationではコマンドを全部書き，それ以降は「単体テストだけを実行する」のように，することだけを書く．

### 学習者が行う作業

- Iteration 0：`pnpm install`，テストの実行(すべて・単体テスト・結合テスト)，型検査，実行，curlでの問い合わせ．
- Iteration 1：1つのファイルのテストだけを実行する．
- Iteration 3：モジュールをディレクトリ(`ports/`，`adapters/`)に分ける．
- Iteration 5：`.env.example`から`.env`を作る．
- Iteration 6・7：`data/`のファイルでサブコマンドを実行する．`time`で実行時間を測る．
- Iteration 8：サーバを起動し，別のターミナルからcurlでリクエストを送る．
- Iteration 9：評価を記録し，記録から指標を表示する．
- Iteration 10：部署の説明文を変えて記録を取り直し，比べる．`tev1:4b`を取得して(`curl http://ollama:11434/api/pull -d '{"model": "tev1:4b"}'`)，`.env`でモデルとタイムアウトを替える．4Bを動かせない環境では，配布する記録を使う．

### Iterationごとの解説

`docs/systemone/iteration-N.md`に，そのIterationで初めて使うものを解説する．System Oneの概念，SDKやNodeのAPI，Vitestの使い方，設計の考え方を含む．目次は`docs/systemone/README.md`．

### 発展課題

- 各Iterationの演習N-7は発展課題とし，見出しに「(発展)」を付ける．
- 解答例は，発展課題を除いた形で動かす．発展課題の実装とテストは，解答例の`src/`・`test/`に，`// 発展(演習N-7)：説明`から`// 発展(演習N-7)ここまで`までのコメントで書く．中のコードは，行の頭に`//`と空白1つを付ける．
- 既存の行を置き換えるときは，終わりの印を`// 発展(演習N-7)ここまで．次のK行の代わりに使う`にし，置き換える行をその直後に置く．
- 発展課題で新しく作るファイルは，解答例の`advanced/`に，パッケージの直下からと同じ相対パスで置く(例：`advanced/src/adapters/timing-engine.ts`)．
- 次のIterationの演習用パッケージは，発展課題のコメントを除いた解答例と同じにする．解答例の設計書は，発展課題を除いた実装に合わせる．
- 解答例の`TESTLIST.md`の最後に「発展課題(演習N-7)」の節を置き，発展課題のテストの項目を書く．解説の演習N-7にも同じ項目を書く．
- 発展課題の出力を教材に載せるときは，発展課題を入れた版で実行する．`KEEP_ADVANCED=1 node tools/check-advanced.mjs iterations/iteration-N`で，その版が`iterations/iteration-N/.solution-advanced`に残る．
- `tools/check-advanced.mjs`(`pnpm test`から実行する)は，発展課題を入れた版が型検査とテストを通ることと，演習用パッケージが前のIterationの解答例から発展課題を除いたものと同じことを確かめる．

## Iteration 0の演習の形

- `src/refund.ts`：`formatRefund`のスタブ(本体は`throw new Error("TODO: …")`)．`refundQuestion`は学習者が足す．
- `src/app.ts`：`run`のスタブと，型`RunResult`．型検査は通る．
- `src/main.ts`：完成品(`run`を呼んで結果を表示する)．
- SDK(`@typesafe-ai/sdk`)は，`package.json`の依存に入れておく(`main.ts`が使う)．
- `test/unit/`・`test/integration/`：空(`.gitkeep`)．`vitest.config.ts`に`passWithNoTests`を付ける．
- `design/`：5つのファイルに見出しと，描くものを説明するコメントだけを置く．
- `TESTLIST.md`：単体テストと結合テストの見出しだけ．

## 落とし穴

- Ollamaの`/v1/systemone`は，リクエストの`model`を必須とする．curlの例には`"model": "tev1:0.8b"`を書く．SDKは`defaultModel`を`model`として送る．
- Ollamaの確信度(`confidence`)は，1から答えの分布の正規化エントロピー(自然対数)を引いた値である．確率とは尺度が違い，低く出やすい(例：3択で，もっとも確からしい選択肢の確率が0.56のとき，確信度は0.10)．Iteration 4のしきい値は，この尺度に合わせて決める．
- Tev1の答えは，一緒に尋ねる質問によって変わる(例：返金の質問だけなら0.81，部署の質問と一緒なら0.61)．curlで1つの質問だけを送った値と，`triage`の出力の値は一致しない．教材の値を比べるときは，同じ質問の組み合わせで送る．
- Tev1の0.8B版の推論は，3問のリクエストで約0.85秒かかる(クラウドの開発環境の4コアのCPUで測った値)．メモリは約1GB使う．
- Ollamaは1件ずつ推論するので，同時に送る数を増やしてもほとんど速くならない(Iteration 6で21件が，1件ずつで約19秒，4件ずつで約17秒)．教材では，同時に送る数の制限を「判断エンジンに送りすぎないため」と説明する．
- Ollamaは，`OLLAMA_HOST`を0.0.0.0にしないで起動すると，`Host`ヘッダが`localhost`などでないリクエストに403を返す．公式のイメージは0.0.0.0で待ち受けるので，devcontainerでは`http://ollama:11434`で呼べる．
- 表の期待値を空白の数まで手で書くと，数え間違えやすい．実装の出力で列がそろっていることを確かめてから期待値にする．
- `tev1:4b`は，3問のリクエストで1件あたり約14秒かかり(4コアのCPU)，SDKの既定のタイムアウト(10秒)を超える．メモリは約5GB使う．`tev1:0.8b`と同時に読み込むとメモリが足りなくなり，Ollamaは推論のプロセスを止めて500を返す．devcontainerでは`OLLAMA_MAX_LOADED_MODELS=1`にして，モデルを1つずつ読み込む．
- 所要時間は，同じ環境でもCPUの割り当てによって3倍ほど変わる(`tev1:0.8b`の3問で0.85秒から3秒)．教材に載せる所要時間は，同じ記録から作る．
- 同じ問い合わせと同じ質問には，Ollamaは同じ確率を返す．教材の出力を作り直すときは，同じ問い合わせを使う．
- Vitestは，テストが1つもないテストファイルを失敗にする．発展課題で新しく作るテストファイルは，全体をコメントにできないので，`advanced/`に置く．
