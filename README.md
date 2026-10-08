# systemone-handson

System One(文章を生成せず，型の決まった答えを確率つきで返すモデル)を使うプログラムを，テスト駆動開発と設計書で育てるハンズオン教材．
TypeScriptを読み書きでき，大規模言語モデルのAPIを使ったことがあれば，System OneやTDDの予備知識は要らない．

## このハンズオンで作るもの

問い合わせを振り分けるコマンドラインプログラム`triage`を，Iteration 0から10までの11回に分けて少しずつ育てる．
最初は「返金を求めているか」を判定するだけのプログラムから始め，担当部署・緊急度の判定，人の確認への振り分け，まとめての処理，精度の評価，HTTP APIを足していく．
完成すると，次のように使える．

```console
$ triage "Refund not received" "I cancelled two weeks ago and still have no refund."
department: billing (0.86)
urgency: urgent (1.5)
refund: yes (0.81)
$ triage batch data/tickets.jsonl
line 21: skipped (not a JSON object with subject and body)
billing: 5, support: 11, sales: 4, needs review: 1
$ triage serve --port 3000
listening on http://localhost:3000
```

判断は，TypeSafe AIのJevと同じHTTP APIを持つサーバに任せる．
学習中は，[Ollama](https://ollama.com/)で，System OneのモデルTev1の0.8B版([`tev1:0.8b`](https://ollama.com/library/tev1))を手元のCPUで動かす．
作りながら，System Oneの質問の種類(yes/no・選択・段階評価)，確率と確信度，ポートとアダプタによる判断エンジンの切り離し，評価の仕方を学ぶ．
あわせて，テストリストと設計書を書いてから実装する進め方を身に付ける．

## 進め方

どの機能も，テスト駆動開発(TDD)で作り，設計と実装のループを回す．
各Iterationの資料には仕様書がなく，「要求」と使い方の例だけが書いてある．
要求を読んで単体テストと結合テストのテストリストを自分で書き，それを実現する型・関数・モジュールを設計書に描いてから，1項目ずつテストを書いて失敗させ(Red)，実装して通す(Green)．
設計書は，[C4モデル](https://c4model.com/)の4つの階層(Context・Container・Component・Code)とシーケンス図をmermaidで書き，Iterationを重ねながら同じ設計書を育てる．

各Iterationは，次の順に進める．

1. 演習用パッケージ(`iterations/iteration-N/exercise`)の`docs/iteration-N.md`を読み，演習を順に進める．新しい概念やAPIは，[docs/systemone/](docs/systemone/)のそのIterationの資料で学ぶ．
2. テストリストを`TESTLIST.md`に書く．
3. 設計書(`design/`)を更新する．書き方は[docs/design.md](docs/design.md)にまとめている．
4. TDDで実装する．pnpmのコマンドも自分で実行する．実装したら，設計書と見比べてずれを直す．
5. 詰まったとき，書き終えたときは，解答例パッケージ(`iterations/iteration-N/solution`)と，その`docs/iteration-N.md`(各手順の解説)を読む．

各Iterationの演習用パッケージは，1つ前のIterationの解答例のコードと設計書から始まる．
前のIterationを書き終えていなくても，次のIterationに進める．

| Iteration | 作る機能 | 学ぶこと |
| --- | --- | --- |
| [0](iterations/iteration-0/exercise/) | 返金を求めているかを判定する | System One，noul(はい・いいえ)，TypeSafeのSDK，Vitest，pnpm |
| [1](iterations/iteration-1/exercise/) | 担当部署を判定する | choice(選択)，確率の分布，選択肢の説明文，1回の問い合わせで複数の質問 |
| [2](iterations/iteration-2/exercise/) | 緊急度を判定する．判断と表示を分ける | score(段階評価)，期待値，判断と表示の分離 |
| [3](iterations/iteration-3/exercise/) | 判断エンジンをアプリから切り離す | ポートとアダプタ，依存性の逆転，テストダブル |
| [4](iterations/iteration-4/exercise/) | 迷っている問い合わせを人の確認に回す | 確信度，しきい値，コマンドラインのオプション |
| [5](iterations/iteration-5/exercise/) | 接続先を環境変数で選ぶ | 環境変数による設定，組み立ての場所，Jevへの切り替え |
| [6](iterations/iteration-6/exercise/) | ファイルの問い合わせをまとめて振り分ける | ファイルの読み込み，JSON Lines，サブコマンド，同時に送る数の制限 |
| [7](iterations/iteration-7/exercise/) | ラベル付きデータで精度を測る | 評価，混同行列，しきい値と人の確認に回る割合の関係 |
| [8](iterations/iteration-8/exercise/) | 振り分けをHTTP APIで公開する | `node:http`，入口側のアダプタ |
| [9](iterations/iteration-9/exercise/) | 評価の記録を残し，指標で読む | 調整用と確かめ用のデータ，適合率・再現率，Brierスコア |
| [10](iterations/iteration-10/exercise/) | 2つの設定を比べ，確信度の較正を確かめる | 対応のある比較，確信度の較正，精度と速さの引き換え |

各Iterationの目的と内容は[docs/ROADMAP.md](docs/ROADMAP.md)にまとめている．

### 発展課題

各Iterationの最後の演習(演習N-7)は，発展課題である．
解答例のパッケージは，発展課題を除いた形で動く．
発展課題の実装とテストは，次のように`発展(演習N-7)`の印で囲んだコメントとして書いてある．

```ts
  // 発展(演習0-7)：確率が0.4以上0.6未満ならunsureと表示する
  // const answer = probability >= 0.6 ? "yes" : probability >= 0.4 ? "unsure" : "no";
  // 発展(演習0-7)ここまで．次の1行の代わりに使う
  const answer = probability >= 0.5 ? "yes" : "no";
```

発展課題を動かすときは，印の間の行の頭にある`//`と空白1つを外し，印の2行を消す．
終わりの印に「次のN行の代わりに使う」とあれば，そのすぐ後のN行も消す．
発展課題で新しく作るファイルは，解答例の`advanced/`の下に置いてある．
`advanced/src/adapters/timing-engine.ts`を`src/adapters/timing-engine.ts`に写すように，`advanced/`を除いたパスに写すと使える．

次のIterationの演習用パッケージは，発展課題を除いた解答例から始まる．
解答例の設計書も，発展課題を除いた実装に合わせてある．

## 構成

Iterationごとに，演習用(exercise)と解答例(solution)の2つのpnpmパッケージを置く．
すべてのパッケージは，リポジトリ直下の`pnpm-workspace.yaml`で1つのワークスペースにまとめてある．

```text
iterations/iteration-N/
  exercise/        演習用パッケージ(triage-iteration-N)．ここに実装とテストを書き足していく．
    docs/iteration-N.md  演習の手順
    TESTLIST.md          テストリスト(自分で書く)
    design/              設計書(自分で書き，育てる)
  solution/        解答例パッケージ(triage-solution-iteration-N)．詰まったときや，書き終えたあとの答え合わせに使う．
    docs/iteration-N.md  演習の各手順の解説
    TESTLIST.md          テストリストの模範解答
    design/              設計書の模範解答
docs/
  ROADMAP.md       各Iterationの目的と内容
  tdd.md           テスト駆動開発とテストリストの書き方
  design.md        設計書の書き方(C4モデルとmermaid)
  systemone/       Iterationごとの，System Oneの概念・API・ツールの資料
tools/             設計書のmermaidの図の検査と，Componentの図と実装の照合
```

## 開発環境

VSCodeの[Dev Containers](https://containers.dev/)で開発する．

1. VSCodeに拡張機能「Dev Containers」(`ms-vscode-remote.remote-containers`)を入れる．
2. Dockerを起動した状態で，このリポジトリをVSCodeで開く．
3. コマンドパレットから「Dev Containers: Reopen in Container」を実行する．

開発用のコンテナと並んで，判断を下すサーバ(`ollama`)のコンテナが起動する．
開発用のコンテナからは，`http://ollama:11434`で呼べる．
`ollama`は，初回の起動時にモデル`tev1:0.8b`(約800MB)をダウンロードし，Dockerのボリュームに保存する．
ダウンロードの進み具合は，`ollama`コンテナのログに出る．
準備ができたかは，開発用のコンテナで次のコマンドを実行して確かめる．

```sh
curl http://ollama:11434/v1/models
```

一覧に`tev1:0.8b`があれば準備ができている．
Tev1の0.8B版はCPUで動く．3つの質問への回答は1秒ほどで返り，メモリは1GBほど使う．

コンテナには次のツールが入っている．版はすべて`mise.toml`で決めている．

| ツール | 版 | 用途 |
| --- | --- | --- |
| Node.js | 26.10.0 | TypeScriptをそのまま実行する(型の除去) |
| pnpm | 12.6.0 | パッケージの管理 |
| TypeScript | 6 | 型検査 |
| Vitest | 5 | テスト |
| oxlint・oxfmt | 1.85・0.70 | リントと整形 |

VSCodeには，mermaidのプレビュー(`bierner.markdown-mermaid`)，oxc(`oxc.oxc-vscode`)，Vitest(`vitest.explorer`)の拡張が入る．

## コマンド

コマンドはリポジトリ直下で実行する．

```sh
mise run test    # すべてのパッケージのテストを実行する
mise run fmt     # コードと設定ファイルを整形する
mise run lint    # 整形の検査，リント，mermaidの図とComponentの照合，型検査を実行する
mise run check   # lintとtestをまとめて実行する(教材を直したときの確認用)
```

1つのパッケージを扱うときは，そのパッケージのディレクトリでpnpmを使う．
使い方は，各Iterationの資料で初めて使うときに説明する．

コミット時には，[lefthook](https://lefthook.dev/)がステージしたファイルに，整形の検査・リント・mermaidの図の検査をかける．

## ライセンス

- このリポジトリ：MIT
- Tev1(モデルの重み)：Apache 2.0(Together AI)
- Ollama，`@typesafe-ai/sdk`：MIT
