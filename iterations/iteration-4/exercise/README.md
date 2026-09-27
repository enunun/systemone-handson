# triage-iteration-4(演習用)

問い合わせを振り分けるプログラム`triage`を育てるハンズオンの，Iteration 4の演習用パッケージ．
Iteration 3の解答例と同じコード・テスト・設計書から始まる．

## このIterationで作るもの

部署の判定の確信度がしきい値を下回ったら，部署の行に`-> needs review`を付け，人の確認に回す．
しきい値は`--min-confidence`で変えられる．

```console
$ pnpm start "Team plan" "We are 20 people and want to upgrade to the team plan. What does it cost?"
department: sales (0.44) -> needs review
urgency: somewhat urgent (1.0)
refund: no (0.07)
```

作りながら，確率と確信度の違い，しきい値の考え方，`util.parseArgs`でのオプションの解析を学ぶ．

## 進め方

1. [docs/iteration-4.md](docs/iteration-4.md)を読み，演習4-1から順に進める．
2. テストリストは[TESTLIST.md](TESTLIST.md)に書く．
3. 詰まったら，解答例[../solution/](../solution/)の同じ番号の解説(`../solution/docs/iteration-4.md`)を読む．

コマンドは，このパッケージのディレクトリで実行する．

## ディレクトリ構成

```text
src/main.ts          実行ファイルの入口(変更しない)
src/app.ts           引数を読み，triageとformatをつなぐ(オプションを読む)
src/triage.ts        質問と，答えのまとめ(しきい値で人の確認に回す)
src/format.ts        表示(部署の行に印を付ける)
src/ports/           ポート
src/adapters/        アダプタ
test/unit/           単体テスト
test/integration/    結合テスト
TESTLIST.md          テストリスト(自分で書く)
design/              設計書(Iteration 3の解答例．自分で更新する)
docs/iteration-4.md  演習の手順
```

## 資料

- [Iteration 4：確信度としきい値，引数の解析](../../../docs/systemone/iteration-4.md)
- [テスト駆動開発とテストリスト](../../../docs/tdd.md)
- [設計書の書き方](../../../docs/design.md)
