# Container：コンテナ

`triage`を構成する，別々に動くものとデータの置き場所を示す．

```mermaid
C4Container
  title triageのコンテナ
  Person(user, "サポート担当者", "問い合わせを振り分ける人")
  System_Boundary(system, "triage") {
    Container(cli, "triage", "Node.jsのプログラム(TypeScript)", "引数を読み，判断エンジンに問い合わせて，振り分けの結果を標準出力に表示する")
    Container(api, "triage serve", "Node.jsのHTTPサーバ(同じプログラム)", "POST /triageで問い合わせを受け付け，振り分けの結果をJSONで返す")
    ContainerDb(env, ".env", "環境変数の定義", "判断エンジンの種類・URL・モデル名・APIキー")
    ContainerDb(tickets, "問い合わせのファイル", "JSON Lines", "1行に1件，subjectとbodyを持つJSON")
    ContainerDb(labeled, "評価用のファイル", "JSON Lines", "問い合わせに，正解の部署(department)を加えたJSON")
  }
  Container_Ext(laya, "laya-server", "Node.js，Laya", "http://laya:8080．POST /v1/systemoneで質問に答える")
  Container_Ext(jev, "TypeSafe Jev", "Web API", "https://api.typesafe.ai．POST /v1/systemoneで質問に答える")
  Rel(user, cli, "件名と本文を引数で渡す")
  System_Ext(client, "問い合わせを受け付けるシステム", "問い合わせフォームやチャットなど")
  Rel(client, api, "POST /triage", "HTTP，JSON")
  Rel(api, env, "起動時に読む")
  Rel(api, laya, "POST /v1/systemone", "HTTP，JSON")
  Rel(api, jev, "POST /v1/systemone", "HTTPS，JSON")
  Rel(cli, env, "起動時に読む", "node --env-file-if-exists")
  Rel(cli, tickets, "triage batchで読む")
  Rel(cli, labeled, "triage evalで読む")
  Rel(cli, laya, "POST /v1/systemone", "HTTP，JSON")
  Rel(cli, jev, "POST /v1/systemone", "HTTPS，JSON")
```

- 1件の問い合わせにつき，判断エンジンに1回だけ問い合わせる．3つの質問は，同じリクエストで送る．
- `triage batch`と`triage eval`は，ファイルの問い合わせを同時に4件まで判断エンジンに送る．
- シェルで設定した環境変数は，`.env`の値より優先される．
- `.env`はGitに入れない．見本は`.env.example`にある．
- `triage serve`は，`triage`と同じプログラムを，HTTPサーバとして起動したものである．ポートは`--port`で指定する(既定3000)．
