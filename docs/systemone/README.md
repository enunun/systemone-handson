# System Oneの概念・API・ツール

各Iterationで新しく使う概念・API・ツールを，Iterationごとにまとめた資料．
演習の手順から，そのIterationの資料を読むように案内している．
あとから調べ直すときは，下の目次から探す．

| 資料 | 主な内容 |
| --- | --- |
| [Iteration 0：System One・SDK・Vitest](iteration-0.md) | System OneとLLMの違い，`/v1/systemone`，noulの質問，TypeSafeのSDK，TypeScriptをそのまま実行する，Vitest，通信を差し替えてテストする，終了コード |
| [Iteration 1：choiceの質問と確率の分布](iteration-1.md) | choiceの質問，確率の分布，選択肢の説明文，`ChoiceQuestion`・`ChoiceResponse`，`noUncheckedIndexedAccess`，複数の質問をまとめて送る，複数行の出力 |

テスト駆動開発とテストリストの書き方は[tdd.md](../tdd.md)に，設計書の書き方は[design.md](../design.md)にまとめている．
