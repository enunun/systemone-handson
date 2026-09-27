# Code：型と関数

モジュールの中の型と関数を示す．

## 型と関数の流れ

コマンドライン引数から表示する文字列までを，型の変換の流れで示す．

```mermaid
flowchart LR
  args(["string[]<br/>コマンドライン引数"]) -- "件名と本文を取り出す" --> state(["{ subject, body }<br/>問い合わせ"])
  state -- "client.systemOne<br/>(questions: { refund: refundQuestion })" --> result(["SystemOneResult"])
  result -- ".answers.refund.noul" --> probability(["number<br/>返金を求めている確率"])
  probability -- "formatRefund" --> output(["RunResult<br/>code: 0"])
  args -- "件名か本文がない" --> usage(["RunResult<br/>code: 2，使い方"])
```

- 確率が0.5以上なら`yes`，それ以外は`no`と表示する．確率は小数第2位までに丸める．

## 主な型

自分で定義した型と，使う外部の型を示す．

```mermaid
classDiagram
  class RunResult {
    <<interface>>
    code : number
    output : string
  }
  class NoulQuestion {
    <<interface・SDK>>
    type : "noul"
    instructions : EntryType
  }
  class NoulResponse {
    <<interface・SDK>>
    type : "noul"
    noul : number
  }
  class refundQuestion {
    <<定数>>
    type = "noul"
    instructions = "Is the customer asking for a refund?"
  }
  NoulQuestion <|.. refundQuestion
```

- `NoulQuestion`と`NoulResponse`は，SDK(`@typesafe-ai/sdk`)の型である．`NoulResponse`は，`result.answers.refund`の型である．
