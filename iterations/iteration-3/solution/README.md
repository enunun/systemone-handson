# triage-solution-iteration-3(解答例)

Iteration 3の演習用パッケージ([../exercise/](../exercise/))を完成させた状態の解答例．
表示はIteration 2と同じである．

```console
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.73)
urgency: somewhat urgent (1.4)
refund: yes (0.86)
```

## 見どころ

- [docs/iteration-3.md](docs/iteration-3.md)：演習の各手順の解説．
- [TESTLIST.md](TESTLIST.md)：テストリストの模範解答．
- [design/](design/)：設計書の模範解答．Componentの図で，依存の向きを確かめる．
- [src/ports/decision-engine.ts](src/ports/decision-engine.ts)：アプリが判断を頼む窓口と，質問・答えの型．
- [src/adapters/systemone-engine.ts](src/adapters/systemone-engine.ts)：SDKを使うアダプタ．
- [src/adapters/fake-engine.ts](src/adapters/fake-engine.ts)：決まった答えを返すアダプタ．

## ディレクトリ構成

```text
src/main.ts                       実行ファイルの入口(アダプタを作る)
src/app.ts                        引数を読み，triageとformatをつなぐ(run)
src/triage.ts                     質問と，答えのまとめ
src/format.ts                     表示
src/ports/decision-engine.ts      DecisionEngineと，質問・答えの型
src/adapters/systemone-engine.ts  createSystemOneEngine
src/adapters/fake-engine.ts       createFakeEngine
test/unit/                        単体テスト(adapters/，triage，format)
test/integration/                 結合テスト
TESTLIST.md                       テストリストの模範解答
design/                           設計書の模範解答
docs/iteration-3.md               演習の各手順の解説
advanced/                         発展課題(演習3-7)で新しく作るファイル(src/とtest/に写して使う)
```
