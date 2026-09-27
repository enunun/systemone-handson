# systemone-handson

System One(型付きの判断だけを返すモデル)を使ったアプリを，ノートPCで作ってからクラウドへ出すまでのハンズオン．
ローカルではOSSの[Laya](https://github.com/NandhaKishorM/laya)を，本番ではTypeSafe AIの[Jev](https://typesafe.ai)を使い，アプリのコードを変えずに切り替える．

## 構成

```text
┌─────────────── packages/triage(アプリ) ───────────────┐
│ domain/   問い合わせの振り分け(部署・緊急度・返金の要否)      │
│ ports/    DecisionEngine：アプリが判断を頼む窓口              │
│ adapters/ systemone-http：/v1/systemoneを話すサーバにつなぐ   │
│           fake：決まった答えを返す(テスト用)                  │
└──────────────────────┬──────────────────────────┘
                       │ POST /v1/systemone(TypeSafe Jevと同じAPI)
         ┌─────────────┴─────────────┐
         ▼                           ▼
packages/laya-server          api.typesafe.ai
(ローカル：Laya，CPUで動く)      (本番：Jev)
```

モデルの違いは，2か所で吸収する．

- `packages/laya-server`は，LayaをJevと同じHTTP API(`POST /v1/systemone`)で公開する．Jevとの細かな違い(`instructions`にnullを許すか，回答の余分なフィールドなど)は，このサーバが変換する．
- アプリは自前の`DecisionEngine`だけに依存する．Jevの型や通信方式は`adapters/systemone-http.ts`に閉じ込めてある．将来，別のモデルに替えるときはアダプタを1つ足す．

接続先は`.env`の3つの変数で決まる．

| 変数 | ローカル(Laya) | 本番(Jev) |
| --- | --- | --- |
| `SYSTEMONE_BASE_URL` | `http://laya:8080` | `https://api.typesafe.ai` |
| `SYSTEMONE_MODEL` | `laya` | `jev-latest` |
| `SYSTEMONE_API_KEY` | 任意(例：`local`) | TypeSafeのAPIキー |

## 動かし方

### devcontainerを使う場合

1. VSCodeで「Reopen in Container」を実行する．
   アプリのコンテナと`laya`コンテナ(laya-server)が起動し，`mise run setup`が`.env`を作る．
2. `laya`コンテナは，初回の起動時にモデル(約1.7GB)をHugging Faceからダウンロードする．終わるまでは503を返す．
3. 問い合わせを振り分ける．

```sh
mise run triage "Refund not received" "I cancelled but got no refund."
```

### devcontainerを使わない場合

Node.js(`mise.toml`の版)とpnpmがあれば動く．Layaの推論はApple SiliconのCPUで1回あたり約140ms(`@receptron/laya`の公表値)で，メモリは2GBほど使う．

```sh
pnpm install
mise run laya   # 別のターミナルで，laya-serverを起動する
cp .env.example .env   # SYSTEMONE_BASE_URLをhttp://localhost:8080に書き換える
mise run triage "Refund not received" "I cancelled but got no refund."
```

モデルを使わずに試すときは，`DECISION_ENGINE=fake`をつける．

## 開発

```sh
mise run check   # リント，型検査，単体テスト
```

単体テストはモデルを読み込まない．laya-serverは差し替えたエンジンで，アプリは`fake`アダプタと通信の差し替えで検証する．

## ハンズオンの流れ(予定)

1. 環境構築：devcontainerとlaya-serverを起動し，最初の判断を出す．
2. ポートとアダプタ：`DecisionEngine`と`systemone-http`アダプタを読む．
3. 問い合わせの振り分け：質問(choice・score・noul)を組み立て，答えを解釈する．
4. 迷いへの対処：確信度が低いものを人の確認に回す．
5. Jevへの切り替え：`.env`を書き換えて本家Jevにつなぎ，クラウドへデプロイする．

## ライセンスについて

- このリポジトリ：MIT
- Laya(モデルの重み)：Apache 2.0(Convai Innovations)
- `@receptron/laya`，`@typesafe-ai/sdk`：MIT
- Jevは有償のAPIである．商用利用の条件は，リリース前にTypeSafe AIの利用規約で確かめる．
