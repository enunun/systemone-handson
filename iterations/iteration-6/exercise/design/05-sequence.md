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
  participant engine as Ollama・Jev
  user->>main: triage "Refund not received" "Where is my refund?"
  main->>main: loadConfig(process.env)
  alt 設定が足りない
    main->>user: 足りない環境変数(標準エラー出力，終了コード1)
  end
  main->>main: createEngine(config)<br/>(new TypeSafeClient(baseURL: SYSTEMONE_BASE_URL)，createSystemOneEngine)
  main->>app: run(args, engine)
  app->>app: parseCommand(args)
  alt 件名か本文がない，またはオプションが誤っている
    app-->>main: { code: 2, output: 使い方 }
    main->>user: 使い方(標準エラー出力)
  else それ以外
    app->>triage: triage(engine, { subject, body }, { minConfidence })
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
