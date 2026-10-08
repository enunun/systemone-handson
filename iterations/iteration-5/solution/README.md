# triage-solution-iteration-5(解答例)

Iteration 5の演習用パッケージ([../exercise/](../exercise/))を完成させた状態の解答例．

```console
$ cp .env.example .env
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.87)
urgency: somewhat urgent (1.2)
refund: yes (0.52)
$ DECISION_ENGINE=fake pnpm start "Refund not received" "Where is my refund?"
department: support (1.00)
urgency: not urgent (0.0)
refund: no (0.00)
```

本家Jevを使うときは，`.env`の`SYSTEMONE_BASE_URL`・`SYSTEMONE_MODEL`・`SYSTEMONE_API_KEY`を書き換える．コードは変えない．

## 見どころ

- [docs/iteration-5.md](docs/iteration-5.md)：演習の各手順の解説．
- [TESTLIST.md](TESTLIST.md)：テストリストの模範解答．
- [design/](design/)：設計書の模範解答．ContextとContainerに，本家Jevと`.env`を描いた．
- [src/config.ts](src/config.ts)：環境変数から設定を読む`loadConfig`．
- [src/main.ts](src/main.ts)：設定からアダプタを組み立てる，組み立ての場所．
- [.env.example](.env.example)：`.env`の見本．

## ディレクトリ構成

```text
.env.example                      .envの見本
src/main.ts                       実行ファイルの入口(組み立ての場所)
src/config.ts                     環境変数から設定を読む(Config，ConfigResult，loadConfig)
src/app.ts                        引数を読み，triageとformatをつなぐ
src/triage.ts                     質問と，答えのまとめ
src/format.ts                     表示
src/ports/decision-engine.ts      DecisionEngineと，質問・答えの型
src/adapters/systemone-engine.ts  createSystemOneEngine
src/adapters/fake-engine.ts       createFakeEngine
test/unit/                        単体テスト
test/integration/                 結合テスト
TESTLIST.md                       テストリストの模範解答
design/                           設計書の模範解答
docs/iteration-5.md               演習の各手順の解説
```
