# System Oneの概念・API・ツール

各Iterationで新しく使う概念・API・ツールを，Iterationごとにまとめた資料．
演習の手順から，そのIterationの資料を読むように案内している．
あとから調べ直すときは，下の目次から探す．

| 資料 | 主な内容 |
| --- | --- |
| [Iteration 0：System One・SDK・Vitest](iteration-0.md) | System OneとLLMの違い，`/v1/systemone`，noulの質問，TypeSafeのSDK，TypeScriptをそのまま実行する，Vitest，通信を差し替えてテストする，終了コード |
| [Iteration 1：choiceの質問と確率の分布](iteration-1.md) | choiceの質問，確率の分布，選択肢の説明文，`ChoiceQuestion`・`ChoiceResponse`，`noUncheckedIndexedAccess`，複数の質問をまとめて送る，複数行の出力 |
| [Iteration 2：scoreの質問と，判断と表示の分離](iteration-2.md) | scoreの質問，期待値ともっとも確率の高い段階，段階の数と並び順，`ScoreQuestion`，`as const`とタプル，判断と表示を分ける，振る舞いを変えないリファクタリング |
| [Iteration 3：ポートとアダプタ](iteration-3.md) | 依存の向き，ポートとアダプタ，依存性の逆転，アプリの言葉で型を書く，条件型・マップ型・`const`型引数，判別可能なユニオンと`switch`，オブジェクトでインターフェースを実装する，テストダブル(stub・fake) |
| [Iteration 4：確信度としきい値，引数の解析](iteration-4.md) | 確率と確信度，確信度の計算式，しきい値で人の確認に回す，`util.parseArgs`，文字列を数にする(`Number`と`NaN`) |

テスト駆動開発とテストリストの書き方は[tdd.md](../tdd.md)に，設計書の書き方は[design.md](../design.md)にまとめている．
