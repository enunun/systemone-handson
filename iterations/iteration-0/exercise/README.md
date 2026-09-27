# triage-iteration-0(演習用)

問い合わせを振り分けるプログラム`triage`を育てるハンズオンの，Iteration 0の演習用パッケージ．

## このIterationで作るもの

問い合わせの件名と本文を受け取り，返金を求めているかを判断エンジンに尋ねて表示する，`triage`の最初の版．

```console
$ pnpm start "Refund not received" "Where is my refund?"
refund: yes (0.86)
```

作りながら，System Oneの考え方と`/v1/systemone`のAPI，TypeSafeのSDK，Vitestでのテストの書き方，mermaidでの設計書の書き方を学ぶ．

## 進め方

1. [docs/iteration-0.md](docs/iteration-0.md)を読み，演習0-1から順に進める．
2. テストリストは[TESTLIST.md](TESTLIST.md)に書く．
3. 詰まったら，解答例[../solution/](../solution/)の同じ番号の解説(`../solution/docs/iteration-0.md`)を読む．

コマンドは，このパッケージのディレクトリで実行する．

## ディレクトリ構成

```text
package.json         パッケージの定義(スクリプトと依存パッケージ)
vitest.config.ts     テストの設定(単体テストと結合テストを分ける)
src/main.ts          実行ファイルの入口(判断エンジンのクライアントを作り，結果を表示する)
src/app.ts           引数を読み，判断エンジンに問い合わせる(runを実装する)
src/refund.ts        返金の質問と判定の表示(refundQuestionを足し，formatRefundを実装する)
test/unit/           単体テスト(テストファイルを自分で作る)
test/integration/    結合テスト(テストファイルを自分で作る)
TESTLIST.md          テストリスト(自分で書く)
design/              設計書(C4モデルの4つの階層とシーケンス図．自分で書く)
docs/iteration-0.md  演習の手順
```

## 資料

- [Iteration 0：System One・SDK・Vitest](../../../docs/systemone/iteration-0.md)
- [テスト駆動開発とテストリスト](../../../docs/tdd.md)
- [設計書の書き方](../../../docs/design.md)
