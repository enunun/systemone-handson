# triage-iteration-8(演習用)

問い合わせを振り分けるプログラム`triage`を育てるハンズオンの，Iteration 8の演習用パッケージ．
Iteration 7の解答例と同じコード・テスト・設計書から始まる．

## このIterationで作るもの

`triage serve`でHTTPサーバを起動し，振り分けをHTTP APIで公開する．
`POST /triage`に件名と本文のJSONを送ると，振り分けの結果をJSONで返す．

```console
$ pnpm start serve --port 3000
listening on http://localhost:3000
```

```console
$ curl -s localhost:3000/triage -d '{"subject": "Refund not received", "body": "Where is my refund?"}'
{"department":"billing","departmentProbability":0.7253,"departmentConfidence":0.318,"needsReview":false,"urgency":1.4061,"refundProbability":0.8631}
```

作りながら，`node:http`でのHTTPサーバ，入力の検証とステータスコード，入口側と出口側のアダプタ，HTTPサーバの結合テストを学ぶ．

## 進め方

1. [docs/iteration-8.md](docs/iteration-8.md)を読み，演習8-1から順に進める．
2. テストリストは[TESTLIST.md](TESTLIST.md)に書く．
3. 詰まったら，解答例[../solution/](../solution/)の同じ番号の解説(`../solution/docs/iteration-8.md`)を読む．

コマンドは，このパッケージのディレクトリで実行する．`.env`は`.env.example`から作る．

## ディレクトリ構成

```text
src/app.ts           引数を読む(serveサブコマンドを足す)
src/adapters/        アダプタ(HTTP APIを足す)
src/…                そのほかはIteration 7と同じ
test/unit/           単体テスト
test/integration/    結合テスト
TESTLIST.md          テストリスト(自分で書く)
design/              設計書(Iteration 7の解答例．自分で更新する)
docs/iteration-8.md  演習の手順
```

## 資料

- [Iteration 8：HTTP APIと，入口側のアダプタ](../../../docs/systemone/iteration-8.md)
- [テスト駆動開発とテストリスト](../../../docs/tdd.md)
- [設計書の書き方](../../../docs/design.md)
