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
- 規模：Iteration 0から8までの9回．1回あたり30分から1時間．

## 題材

問い合わせを振り分けるコマンドラインプログラム`triage`．件名と本文から，担当部署(billing・support・sales)・緊急度(4段階)・返金の要否を判断する．
最終的な使い方は`docs/ROADMAP.md`の冒頭にある．

判断は，TypeSafe Jevと同じHTTP API(`POST /v1/systemone`)を持つサーバに任せる．
学習中は`infra/laya-server`(OSSのLayaをCPUで動かす)を使う．本家Jevへの切り替えはIteration 5で説明し，Jevの実行はしない．クラウドへのデプロイは扱わない．

## 設計書

各パッケージの`design/`に，次の5つをmermaidで書く．書き方は`docs/design.md`で説明する．

| ファイル | 図 | 示すもの |
| --- | --- | --- |
| `01-context.md` | C4Context | 利用者，triage，判断エンジン(laya-server，Iteration 5からJev)，Iteration 8からAPIの利用者 |
| `02-container.md` | C4Container | triageの実行ファイル，laya-server，Iteration 6からファイル，Iteration 8からHTTP API |
| `03-component.md` | C4Component | `src/`のモジュールと，その依存(`import`)．外部のパッケージは`Component_Ext`で描く |
| `04-code.md` | flowchart・classDiagram | 型と関数の流れ，主な型 |
| `05-sequence.md` | sequenceDiagram | 入口から判断エンジンまでの呼び出しの順序 |

- 名前は実装の名前と一致させる．Componentの`Component`・`Component_Ext`の名前は，`src/`からの相対パス(拡張子なし)か，パッケージ名にする．
- Componentの矢印(`Rel`)は，実装の`import`と一致させる．`tools/check-component.mjs`が照合する．
- Iteration 0の演習では，5つのファイルに見出しと，描くものを説明するコメントだけを置く．

## 開発環境

- Dev Container：`.devcontainer/`．mise公式のイメージに，`mise.toml`の版のNode・pnpm・rtk・lefthookを入れる．`compose.yml`で`laya`サービス(laya-server)も起動し，アプリからは`http://laya:8080`で呼ぶ．VSCodeの拡張は`bierner.markdown-mermaid`など．
- 言語とツール：TypeScript(ビルドせず，Nodeの型の除去で実行する)，`tsc`(型検査のみ)，Vitest(テスト)，oxlint(リント)，oxfmt(整形)．
- 文書の検査：textlint，markdownlint，mermaidの構文検査(`tools/mermaid`)，Componentの照合(`tools/check-component.mjs`)．
- 検証のコマンド：`mise run check`(整形の検査・リント・型検査・すべてのパッケージのテスト)．

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
infra/laya-server/               Jev互換のAPIでLayaを公開するサーバ(完成品として配る)
tools/                           mermaidの検査，Componentの照合
```

- `pnpm-workspace.yaml`は，`infra/*`・`tools/*`・`iterations/*/*`をすべて含む．学習者がパッケージを登録する作業はない．
- パッケージの中身：`README.md`，`TESTLIST.md`，`design/`，`docs/iteration-N.md`，`package.json`，`tsconfig.json`，`vitest.config.ts`，`src/`，`test/unit/`，`test/integration/`．
- 相対importには`.ts`を付ける(Nodeの型の除去で実行するため)．

### テスト

- Vitestの`projects`で`unit`と`integration`を分ける．`vitest.config.ts`は各パッケージに置く．
- 単体テスト(`test/unit/`)：1つのモジュールの関数を単独で呼ぶ．Iteration 3からは判断エンジンをfakeに差し替える．
- 結合テスト(`test/integration/`)：`app`の`run`を呼ぶ．判断エンジンの通信は，SDKの`fetch`オプションに偽の関数を渡して差し替える．
- テストファイルは機能(モジュール)ごとに1つで，Iterationの名前を付けない．
- どのテストもlaya-serverやモデルを使わない．

### コマンド(パッケージのディレクトリで実行する)

| 目的 | コマンド | 初出 |
| --- | --- | --- |
| 依存の導入 | `pnpm install`(リポジトリの直下) | 0 |
| すべてのテスト | `pnpm test` | 0 |
| 単体テストだけ | `pnpm test --project unit` | 0 |
| 1つのファイルのテスト | `pnpm test <ファイル>` | 1 |
| 型検査 | `pnpm typecheck` | 0 |
| 実行 | `pnpm start "<件名>" "<本文>"` | 0 |
| 判断エンジンに直接問い合わせる | `curl http://laya:8080/v1/systemone ...` | 0 |

初出のIterationではコマンドを全部書き，それ以降は「単体テストだけを実行する」のように，することだけを書く．

### 学習者が行う作業

- Iteration 0：`pnpm install`，テストの実行(すべて・単体テスト・結合テスト)，型検査，実行，curlでの問い合わせ．
- Iteration 3：モジュールをディレクトリ(`ports/`，`adapters/`)に分ける．
- Iteration 5：`.env`の作成．
- それ以降の作業はROADMAPの各Iterationに書く．

### Iterationごとの解説

`docs/systemone/iteration-N.md`に，そのIterationで初めて使うものを解説する．System Oneの概念，SDKやNodeのAPI，Vitestの使い方，設計の考え方を含む．目次は`docs/systemone/README.md`．

## Iteration 0の演習の形

- `src/refund.ts`：`formatRefund`のスタブ(本体は`throw new Error("TODO: …")`)．`refundQuestion`は学習者が足す．
- `src/app.ts`：`run`のスタブと，型`RunResult`．型検査は通る．
- `src/main.ts`：完成品(`run`を呼んで結果を表示する)．
- SDK(`@typesafe-ai/sdk`)は，`package.json`の依存に入れておく(`main.ts`が使う)．
- `test/unit/`・`test/integration/`：空(`.gitkeep`)．`vitest.config.ts`に`passWithNoTests`を付ける．
- `design/`：5つのファイルに見出しと，描くものを説明するコメントだけを置く．
- `TESTLIST.md`：単体テストと結合テストの見出しだけ．

## 落とし穴

- 環境によっては，Nodeの組み込みの`fetch`がプロキシの環境変数を読まない．プロキシ越しにlaya-serverがモデルを取得するときは，`NODE_USE_ENV_PROXY=1`を付ける(Node 22.21以降)．
- onnxruntime-nodeのインストール時スクリプトはGPU用のバイナリを取得するだけで，CPUでは不要である．`pnpm-workspace.yaml`の`allowBuilds`で止めている．
- Layaの確信度(`confidence`)は，1から答えの分布の正規化エントロピーを引いた値である．確率とは尺度が違い，低く出やすい(例：3択で，もっとも確からしい選択肢の確率が0.45のとき，確信度は0.03)．Iteration 4のしきい値は，この尺度に合わせて決める．
- Layaの推論は，3問のリクエストで約0.55秒かかる(クラウドの開発環境のCPUで測った値)．
