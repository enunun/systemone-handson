# triage-solution-iteration-8(解答例)

Iteration 8の演習用パッケージ([../exercise/](../exercise/))を完成させた状態の解答例．

```console
$ pnpm start serve --port 3000
listening on http://localhost:3000
```

```console
$ curl -s localhost:3000/triage -d '{"subject": "Discount", "body": "Do you offer a discount for non-profit organizations?"}'
{"department":"support","departmentProbability":0.5280386266197422,"departmentConfidence":0.08358112838899756,"needsReview":true,"urgency":0.8628479356656321,"refundProbability":0.16789652778882241}
```

## 見どころ

- [docs/iteration-8.md](docs/iteration-8.md)：演習の各手順の解説．
- [TESTLIST.md](TESTLIST.md)：テストリストの模範解答．
- [design/](design/)：設計書の模範解答．Componentの図で，入口側と出口側のアダプタを描き分けた．
- [src/adapters/http-api.ts](src/adapters/http-api.ts)：HTTP APIの入口側のアダプタ．
- [test/integration/http-api.test.ts](test/integration/http-api.test.ts)：サーバを実際に起動して`fetch`で確かめる結合テスト．

## ディレクトリ構成

```text
data/                             問い合わせのサンプルと，評価用のデータ
src/main.ts                       実行ファイルの入口(組み立ての場所)
src/app.ts                        コマンドライン(run，runBatch，runEval，runServe)
src/adapters/http-api.ts          HTTP API(createApi)
src/adapters/systemone-engine.ts  /v1/systemoneを話す判断エンジンにつなぐ
src/adapters/fake-engine.ts       決まった答えを返す
src/ports/decision-engine.ts      DecisionEngineと，質問・答えの型
src/triage.ts                     質問と，答えのまとめ
src/batch.ts                      まとめて振り分けるための部品
src/evaluate.ts                   精度を測る
src/format.ts                     表示
src/config.ts                     環境変数から設定を読む
test/unit/                        単体テスト
test/integration/                 結合テスト(app，batch，evaluate，http-api，serve)
TESTLIST.md                       テストリストの模範解答
design/                           設計書の模範解答
docs/iteration-8.md               演習の各手順の解説
```
