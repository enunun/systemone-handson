# triage-iteration-3(演習用)

問い合わせを振り分けるプログラム`triage`を育てるハンズオンの，Iteration 3の演習用パッケージ．
Iteration 2の解答例と同じコード・テスト・設計書から始まる．

## このIterationで作るもの

振る舞いは変えずに，判断エンジンをアプリから切り離す．
アプリが判断を頼む窓口(ポート)`DecisionEngine`を定め，`triage`はこの型だけを使うようにする．
TypeSafeのSDKを使う部分と，テストで使う偽物を，それぞれアダプタとして作る．

```console
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.73)
urgency: somewhat urgent (1.4)
refund: yes (0.86)
```

作りながら，ポートとアダプタ，依存性の逆転，テストダブル(stub・fake)の使い分けを学ぶ．

## 進め方

1. [docs/iteration-3.md](docs/iteration-3.md)を読み，演習3-1から順に進める．
2. テストリストは[TESTLIST.md](TESTLIST.md)に書く．
3. 詰まったら，解答例[../solution/](../solution/)の同じ番号の解説(`../solution/docs/iteration-3.md`)を読む．

コマンドは，このパッケージのディレクトリで実行する．

## ディレクトリ構成

```text
src/main.ts          実行ファイルの入口(使うアダプタを作るように変える)
src/app.ts           引数を読み，triageとformatをつなぐ
src/triage.ts        質問と，答えのまとめ(ポートだけを使うように変える)
src/format.ts        表示
src/ports/           ポート(自分で作る)
src/adapters/        アダプタ(自分で作る)
test/unit/           単体テスト
test/integration/    結合テスト
TESTLIST.md          テストリスト(自分で書く)
design/              設計書(Iteration 2の解答例．自分で更新する)
docs/iteration-3.md  演習の手順
```

## 資料

- [Iteration 3：ポートとアダプタ](../../../docs/systemone/iteration-3.md)
- [テスト駆動開発とテストリスト](../../../docs/tdd.md)
- [設計書の書き方](../../../docs/design.md)
