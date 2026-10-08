# triage-iteration-5(演習用)

問い合わせを振り分けるプログラム`triage`を育てるハンズオンの，Iteration 5の演習用パッケージ．
Iteration 4の解答例と同じコード・テスト・設計書から始まる．

## このIterationで作るもの

判断エンジンの接続先(URL・モデル名・APIキー)を，コードではなく環境変数で指定する．
`.env`を書き換えるだけで，Ollamaから本家Jevへ切り替えられるようになる．

```console
$ cp .env.example .env
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.87)
urgency: somewhat urgent (1.2)
refund: yes (0.52)
```

作りながら，環境変数による設定，組み立ての場所(composition root)，`node --env-file`，OllamaとJevの違いを学ぶ．

## 進め方

1. [docs/iteration-5.md](docs/iteration-5.md)を読み，演習5-1から順に進める．
2. テストリストは[TESTLIST.md](TESTLIST.md)に書く．
3. 詰まったら，解答例[../solution/](../solution/)の同じ番号の解説(`../solution/docs/iteration-5.md`)を読む．

コマンドは，このパッケージのディレクトリで実行する．

## ディレクトリ構成

```text
src/main.ts          実行ファイルの入口(設定からアダプタを組み立てるように変える)
src/app.ts           引数を読み，triageとformatをつなぐ
src/triage.ts        質問と，答えのまとめ
src/format.ts        表示
src/ports/           ポート
src/adapters/        アダプタ
test/unit/           単体テスト
test/integration/    結合テスト
TESTLIST.md          テストリスト(自分で書く)
design/              設計書(Iteration 4の解答例．自分で更新する)
docs/iteration-5.md  演習の手順
```

## 資料

- [Iteration 5：環境変数による設定と，Jevへの切り替え](../../../docs/systemone/iteration-5.md)
- [テスト駆動開発とテストリスト](../../../docs/tdd.md)
- [設計書の書き方](../../../docs/design.md)
