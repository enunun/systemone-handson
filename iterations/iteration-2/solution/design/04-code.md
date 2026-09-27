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

`triage`の中では，3つの質問を1回で送り，答えから`Triage`を作る．

```mermaid
flowchart LR
  ticket(["Ticket"]) -- "client.systemOne<br/>(questions: { department, urgency, refund })" --> answers(["SystemOneResult"])
  answers -- ".department.choice<br/>.department.probabilities" --> department(["department<br/>departmentProbability"])
  answers -- ".urgency.score" --> urgency(["urgency"])
  answers -- ".refund.noul" --> refund(["refundProbability"])
  department --> triage(["Triage"])
  urgency --> triage
  refund --> triage
```

`formatTriage`は，`Triage`の項目ごとに1行を作り，改行でつなぐ．

```mermaid
flowchart LR
  triage(["Triage"]) -- "formatDepartment" --> l1(["department: billing (0.73)"])
  triage -- "formatUrgency" --> l2(["urgency: somewhat urgent (1.4)"])
  triage -- "formatRefund" --> l3(["refund: yes (0.86)"])
  l1 -- "改行でつなぐ" --> out(["string"])
  l2 -- "改行でつなぐ" --> out
  l3 -- "改行でつなぐ" --> out
```

- 担当部署は，もっとも確からしい部署と，その部署の確率を表示する．
- 緊急度は，期待値(`score`)を四捨五入した番号の段階の名前と，期待値を小数第1位まで表示する．
- 返金は，確率が0.5以上なら`yes`，それ以外は`no`と表示する．
- 確率は小数第2位までに丸める．

## 主な型

自分で定義した型と定数を示す．判断エンジンに送る質問は，SDKの型(`ChoiceQuestion`・`ScoreQuestion`・`NoulQuestion`)の定数として`triage.ts`の中に持つ．

```mermaid
classDiagram
  class Ticket {
    <<interface>>
    subject : string
    body : string
  }
  class Triage {
    <<interface>>
    department : string
    departmentProbability : number
    urgency : number
    refundProbability : number
  }
  class RunResult {
    <<interface>>
    code : number
    output : string
  }
  class urgencyLevels {
    <<定数>>
    "not urgent"
    "somewhat urgent"
    "urgent"
    "critical"
  }
  class ScoreResponse {
    <<interface・SDK>>
    type : "score"
    score : number
    confidence : number
    legend : ScoreLegend
    probabilities : Record~string, number~
  }
  Triage ..> urgencyLevels : urgencyは段階の番号の期待値
  Triage ..> ScoreResponse : urgency = score
```

- `urgencyLevels`は，緊急度の質問の`criteria`と，`formatUrgency`の段階の名前の両方に使う．
