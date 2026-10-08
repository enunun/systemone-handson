# シーケンス：呼び出しの順序

利用者が`triage`を実行してから結果が表示されるまでの，呼び出しの順序を示す．

```mermaid
sequenceDiagram
  actor user as サポート担当者
  participant main as main
  participant app as app
  participant triage as triage
  participant format as format
  participant client as TypeSafeClient
  participant engine as Ollama
  user->>main: triage "Refund not received" "Where is my refund?"
  main->>main: new TypeSafeClient(baseURL: http://ollama:11434)
  main->>app: run(args, client)
  alt 件名か本文がない
    app-->>main: { code: 2, output: 使い方 }
    main->>user: 使い方(標準エラー出力)
  else それ以外
    app->>triage: triage(client, { subject, body })
    triage->>client: systemOne({ state, questions: { department, urgency, refund } })
    client->>engine: POST /v1/systemone
    engine-->>client: { answers: { department, urgency, refund } }
    client-->>triage: SystemOneResult
    triage-->>app: Triage
    app->>format: formatTriage(Triage)
    format-->>app: 3行の文字列
    app-->>main: { code: 0, output: 3行の文字列 }
    main->>user: department・urgency・refundの3行(標準出力)
  end
```
