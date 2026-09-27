# シーケンス：呼び出しの順序

利用者が`triage`を実行してから結果が表示されるまでの，呼び出しの順序を示す．

```mermaid
sequenceDiagram
  actor user as サポート担当者
  participant main as main
  participant app as app
  participant triage as triage
  participant format as format
  participant adapter as systemone-engine
  participant client as TypeSafeClient
  participant engine as laya-server
  user->>main: triage "Refund not received" "Where is my refund?"
  main->>main: new TypeSafeClient(baseURL: http://laya:8080)
  main->>main: createSystemOneEngine(client)
  main->>app: run(args, engine)
  alt 件名か本文がない
    app-->>main: { code: 2, output: 使い方 }
    main->>user: 使い方(標準エラー出力)
  else それ以外
    app->>triage: triage(engine, { subject, body })
    triage->>adapter: decide(state, { department, urgency, refund })
    adapter->>adapter: toWire(各質問)
    adapter->>client: systemOne({ state, questions })
    client->>engine: POST /v1/systemone
    engine-->>client: { answers: { department, urgency, refund } }
    client-->>adapter: SystemOneResult
    adapter->>adapter: fromWire(各答え)
    adapter-->>triage: Answers
    triage-->>app: Triage
    app->>format: formatTriage(Triage)
    format-->>app: 3行の文字列
    app-->>main: { code: 0, output: 3行の文字列 }
    main->>user: department・urgency・refundの3行(標準出力)
  end
```
