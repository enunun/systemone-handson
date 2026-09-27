# systemone-handson

System One(文章を生成せず，型の決まった答えを確率つきで返すモデル)を使うプログラムを，テスト駆動開発と設計書で育てるハンズオン教材．
TypeScriptを読み書きでき，大規模言語モデルのAPIを使ったことがあれば，System OneやTDDの予備知識は要らない．

## このハンズオンで作るもの

問い合わせを振り分けるコマンドラインプログラム`triage`を，Iteration 0から8までの9回に分けて少しずつ育てる．
最初は「返金を求めているか」を判定するだけのプログラムから始め，担当部署・緊急度の判定，人の確認への振り分け，まとめての処理，精度の評価，HTTP APIを足していく．
完成すると，次のように使える(確率などの数値は例である)．

```console
$ triage "Refund not received" "I cancelled two weeks ago and still have no refund."
department: billing (0.94)
urgency: urgent (2.1)
refund: yes (0.93)
$ triage batch data/tickets.jsonl
billing: 12, support: 8, sales: 3, needs review: 4
$ triage serve --port 3000
listening on http://localhost:3000
```

判断は，TypeSafe AIのJevと同じHTTP APIを持つサーバに任せる．
学習中は，OSSのモデル[Laya](https://github.com/NandhaKishorM/laya)を手元のCPUで動かすサーバ(`infra/laya-server`)を使う．
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
| 5 | 接続先を環境変数で選ぶ | 環境変数による設定，組み立ての場所，Jevへの切り替え |
| 6 | ファイルの問い合わせをまとめて振り分ける | ファイルの読み込み，JSON Lines，サブコマンド，同時に送る数の制限 |
| 7 | ラベル付きデータで精度を測る | 評価，混同行列，しきい値と人の確認に回る割合の関係 |
| 8 | 振り分けをHTTP APIで公開する | `node:http`，入口側のアダプタ |

各Iterationの目的と内容は[docs/ROADMAP.md](docs/ROADMAP.md)にまとめている．

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
infra/laya-server/ 判断を下すサーバ(完成品．演習では手を加えない)
tools/             設計書のmermaidの図の検査と，Componentの図と実装の照合
```

## 開発環境

VSCodeの[Dev Containers](https://containers.dev/)で開発する．

1. VSCodeに拡張機能「Dev Containers」(`ms-vscode-remote.remote-containers`)を入れる．
2. Dockerを起動した状態で，このリポジトリをVSCodeで開く．
3. コマンドパレットから「Dev Containers: Reopen in Container」を実行する．

開発用のコンテナと並んで，判断を下すサーバ(`laya`)のコンテナが起動する．
開発用のコンテナからは，`http://laya:8080`で呼べる．
`laya`は，初回の起動時にモデル(約1.7GB)をHugging Faceからダウンロードし，Dockerのボリュームに保存する．
ダウンロードと読み込みが終わるまでは，問い合わせに503を返す．
準備ができたかは，開発用のコンテナで次のコマンドを実行して確かめる．

```sh
curl http://laya:8080/healthz
```

`{"status":"ok"}`と表示されれば準備ができている．
LayaはCPUで動く．3つの質問への回答は0.5秒ほどで返り，メモリは2GBほど使う．

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
- Laya(モデルの重み)：Apache 2.0(Convai Innovations)
- `@receptron/laya`，`@typesafe-ai/sdk`：MIT
