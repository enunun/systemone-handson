# Code：型と関数

モジュールの中の型と関数を示す．

## 型と関数の流れ

`main`は，環境変数から判断エンジンを組み立てる．

```mermaid
flowchart LR
  env(["process.env<br/>(.envを含む)"]) -- "loadConfig" --> result(["ConfigResult"])
  result -- "ok: true" --> config(["Config"])
  result -- "ok: false" --> message(["message<br/>標準エラー出力，終了コード1"])
  config -- "createEngine<br/>engine: systemone" --> systemone(["createSystemOneEngine(new TypeSafeClient)"])
  config -- "createEngine<br/>engine: fake" --> fake(["createFakeEngine(fakeAnswers)"])
  systemone --> engine(["DecisionEngine"])
  fake --> engine
```

- `DECISION_ENGINE`がないときは`systemone`とする．`systemone`のときは，`SYSTEMONE_BASE_URL`・`SYSTEMONE_MODEL`・`SYSTEMONE_API_KEY`がすべて必要である．空の値は，ないものとして扱う．

コマンドライン引数から表示する文字列までを，型の変換の流れで示す．

```mermaid
flowchart LR
  args(["string[]<br/>コマンドライン引数"]) -- "parseCommand<br/>(parseArgs)" --> command(["Command"])
  command -- "kind: single" --> single(["件名・本文・TriageOptions"])
  single -- "triage" --> result(["Triage"])
  result -- "formatTriage" --> output(["RunResult<br/>code: 0"])
  command -- "kind: batch" --> batch(["ファイル名・TriageOptions"])
  batch -- "runBatch" --> batchOutput(["RunResult<br/>code: 0，読めなかった行と集計"])
  batch -- "ファイルが読めない" --> readError(["RunResult<br/>code: 1"])
  command -- "kind: eval" --> evalCommand(["ファイル名・TriageOptions・sweep"])
  evalCommand -- "runEval" --> evalOutput(["RunResult<br/>code: 0，評価と混同行列，またはしきい値ごとの表"])
  evalCommand -- "ファイルが読めない" --> readError
  args -- "引数の数が合わない<br/>知らないオプション<br/>しきい値が0から1の数でない" --> usage(["RunResult<br/>code: 2，使い方"])
```

`runBatch`は，ファイルの中身から集計までを次のように作る．

```mermaid
flowchart LR
  text(["string<br/>ファイルの中身"]) -- "parseTickets" --> parsed(["ParsedTickets<br/>tickets・errors"])
  parsed -- "mapWithConcurrency(tickets, 4, triage)" --> results(["Triage[]"])
  results -- "summarize" --> summary(["Summary"])
  summary -- "formatSummary" --> line(["billing: 5, support: 11, sales: 3, needs review: 2"])
  parsed -- "errors" --> errors(["line 21: skipped (…)"])
```

- 空の行は飛ばす．JSONとして読めない行や，`subject`と`body`が文字列でない行は，行番号とともに知らせて飛ばす．
- 判断エンジンには，同時に`batchConcurrency`(4)件まで送る．結果は，ファイルの順に並べる．
- 集計では，人の確認に回したものを部署の件数に含めない．部署は`departmentNames`の順に並べる．

`runEval`は，正解の部署が付いた問い合わせから，評価を次のように作る．

```mermaid
flowchart LR
  text(["string<br/>ファイルの中身"]) -- "parseLabeledTickets" --> labeled(["LabeledTicket[]"])
  labeled -- "mapWithConcurrency(…, 4, triage)" --> results(["LabeledResult[]<br/>正解の部署と振り分けの結果"])
  results -- "evaluate(results, minConfidence)" --> evaluation(["Evaluation"])
  evaluation -- "formatEvaluation" --> line(["accuracy: 0.93 (auto-routed 27 / 30), review rate: 0.10"])
  results -- "confusionMatrix" --> matrix(["ConfusionMatrix"])
  matrix -- "formatConfusionMatrix" --> table(["混同行列の表"])
  results -- "sweep(--sweepのとき)" --> rows(["Evaluation[]<br/>しきい値0.0〜1.0"])
  rows -- "formatSweep" --> sweepTable(["しきい値ごとの表"])
```

- 自動で振り分けたとみなすのは，部署の確信度(`departmentConfidence`)がしきい値以上のものである．正解率は，そのうち部署が正解だった割合である．自動で振り分けたものがなければ，正解率は`n/a`と表示する．
- 混同行列は，人の確認に回すものも含めて，すべての問い合わせを数える．
- `--sweep`と`--min-confidence`は一緒に使えない．`--sweep`は`eval`でだけ使える．

`triage`の中では，アプリの質問を`DecisionEngine`に渡し，答えから`Triage`を作る．

```mermaid
flowchart LR
  ticket(["Ticket"]) -- "engine.decide<br/>(department, urgency, refund)" --> answers(["Answers"])
  answers -- ".department.value<br/>.department.probability" --> department(["department<br/>departmentProbability"])
  answers -- ".department.confidence < minConfidence" --> review(["needsReview"])
  answers -- ".urgency.value" --> urgency(["urgency"])
  answers -- ".refund.probability" --> refund(["refundProbability"])
  department --> triage(["Triage"])
  review --> triage
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

- `formatTriage`は，`Triage`の項目ごとに1行を作り，改行でつなぐ．`needsReview`なら，部署の行の末尾に空白と`-> needs review`を付ける．
- しきい値(`minConfidence`)は，`--min-confidence`で指定する．指定しなければ`defaultMinConfidence`(0.2)を使う．確信度がしきい値ちょうどなら，人の確認に回さない．
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
  class ParsedTickets {
    <<interface>>
    tickets : Ticket[]
    errors : string[]
  }
  class LabeledTicket {
    <<interface>>
    subject : string
    body : string
    department : string
  }
  class Evaluation {
    <<interface>>
    minConfidence : number
    total : number
    autoRouted : number
    correct : number
    accuracy : number | undefined
    reviewRate : number
  }
  class ConfusionMatrix {
    <<type>>
    Record~正解の部署, Record~判定した部署, 件数~~
  }
  class Summary {
    <<interface>>
    departments : Record~string, number~
    needsReview : number
  }
  class Config {
    <<type>>
    engine : "systemone" | "fake"
    baseURL : string
    model : string
    apiKey : string
  }
  class ConfigResult {
    <<type>>
    ok : true，config : Config
    ok : false，message : string
  }
  class TriageOptions {
    <<interface>>
    minConfidence? : number
  }
  class Triage {
    <<interface>>
    department : string
    departmentProbability : number
    departmentConfidence : number
    needsReview : boolean
    urgency : number
    refundProbability : number
  }
  ConfigResult --> Config : config
  Ticket <|-- LabeledTicket
  DecisionEngine <|-- FakeEngine
  DecisionEngine <|.. createSystemOneEngine : 作るオブジェクト
  ChoiceQuestion ..> ChoiceAnswer : AnswerFor
  ScaleQuestion ..> ScaleAnswer : AnswerFor
  YesNoQuestion ..> YesNoAnswer : AnswerFor
```

- `Answers<Q>`は，質問の名前ごとに，その質問の種類に対応する答え(`AnswerFor`)を持つ型である．
- `Config`は，`engine`が`systemone`のときだけ`baseURL`・`model`・`apiKey`を持つ．
- `Ticket`・`RunResult`・`urgencyLevels`は，Iteration 2と同じである．
- `app`の中の`Command`は，`parseCommand`が引数から作る，件名・本文・`TriageOptions`の組である．
