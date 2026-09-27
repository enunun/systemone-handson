# Code：型と関数

モジュールの中の型と関数を示す．

## 型と関数の流れ

コマンドライン引数から表示する文字列までを，型の変換の流れで示す．

```mermaid
flowchart LR
  args(["string[]<br/>コマンドライン引数"]) -- "件名と本文を取り出す" --> ticket(["Ticket"])
  ticket -- "triage" --> result(["Triage"])
  result -- "formatTriage" --> output(["RunResult<br/>code: 0"])
  args -- "件名か本文がない" --> usage(["RunResult<br/>code: 2，使い方"])
```

`triage`の中では，アプリの質問を`DecisionEngine`に渡し，答えから`Triage`を作る．

```mermaid
flowchart LR
  ticket(["Ticket"]) -- "engine.decide<br/>(department, urgency, refund)" --> answers(["Answers"])
  answers -- ".department.value<br/>.department.probability" --> department(["department<br/>departmentProbability"])
  answers -- ".urgency.value" --> urgency(["urgency"])
  answers -- ".refund.probability" --> refund(["refundProbability"])
  department --> triage(["Triage"])
  urgency --> triage
  refund --> triage
```

`adapters/systemone-engine`は，アプリの質問と答えを，`/v1/systemone`の質問と答えに変換する．

```mermaid
flowchart LR
  q(["Question<br/>choice・scale・yesno"]) -- "toWire" --> wq(["SDKのQuestion<br/>choice・score・noul"])
  wq -- "client.systemOne" --> wa(["SDKの答え"])
  wa -- "fromWire" --> a(["Answer<br/>choice・scale・yesno"])
```

- `formatTriage`は，`Triage`の項目ごとに1行を作り，改行でつなぐ(Iteration 2と同じ)．
- 緊急度は，期待値を四捨五入した番号の段階の名前と，期待値を小数第1位まで表示する．返金は，確率が0.5以上なら`yes`とする．確率は小数第2位までに丸める．

## 主な型

ポート(`ports/decision-engine`)の型と，アプリの型を示す．

```mermaid
classDiagram
  class DecisionEngine {
    <<interface>>
    decide(state, questions) Promise~Answers~
  }
  class ChoiceQuestion {
    <<interface>>
    kind : "choice"
    prompt : string
    options : Record~string, string~
  }
  class ScaleQuestion {
    <<interface>>
    kind : "scale"
    prompt : string
    levels : string[]
  }
  class YesNoQuestion {
    <<interface>>
    kind : "yesno"
    prompt : string
  }
  class ChoiceAnswer {
    <<interface>>
    kind : "choice"
    value : string
    probability : number
    confidence : number
    probabilities : Record~string, number~
  }
  class ScaleAnswer {
    <<interface>>
    kind : "scale"
    value : number
    confidence : number
    probabilities : number[]
  }
  class YesNoAnswer {
    <<interface>>
    kind : "yesno"
    probability : number
  }
  class FakeEngine {
    <<interface>>
    calls : FakeEngineCall[]
  }
  class Triage {
    <<interface>>
    department : string
    departmentProbability : number
    urgency : number
    refundProbability : number
  }
  DecisionEngine <|-- FakeEngine
  DecisionEngine <|.. createSystemOneEngine : 作るオブジェクト
  ChoiceQuestion ..> ChoiceAnswer : AnswerFor
  ScaleQuestion ..> ScaleAnswer : AnswerFor
  YesNoQuestion ..> YesNoAnswer : AnswerFor
```

- `Answers<Q>`は，質問の名前ごとに，その質問の種類に対応する答え(`AnswerFor`)を持つ型である．
- `Ticket`・`RunResult`・`urgencyLevels`は，Iteration 2と同じである．
