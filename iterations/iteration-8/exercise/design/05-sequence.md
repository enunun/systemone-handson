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
  alt 引数の数が合わない，またはオプションが誤っている
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

`triage batch`では，ファイルの問い合わせを同時に4件まで判断エンジンに送る．

```mermaid
sequenceDiagram
  actor user as サポート担当者
  participant app as app
  participant batch as batch
  participant triage as triage
  participant adapter as systemone-engine
  participant engine as Ollama・Jev
  user->>app: triage batch data/tickets.jsonl
  app->>app: readFile(data/tickets.jsonl)
  app->>batch: parseTickets(text)
  batch-->>app: { tickets, errors }
  app->>batch: mapWithConcurrency(tickets, 4, triage)
  par 同時に4件まで
    batch->>triage: triage(engine, ticket 1)
    triage->>adapter: decide
    adapter->>engine: POST /v1/systemone
  and
    batch->>triage: triage(engine, ticket 2)
    triage->>adapter: decide
    adapter->>engine: POST /v1/systemone
  end
  Note over batch,engine: 1件終わるたびに，次の問い合わせを送る
  batch-->>app: Triage[](ファイルの順)
  app->>batch: summarize(results)
  batch-->>app: Summary
  app->>user: 読めなかった行と，集計の1行(標準出力)
```

`triage eval`も，同じ流れで問い合わせを送る．
`parseTickets`の代わりに`parseLabeledTickets`で正解の部署ごと読み，`summarize`の代わりに`evaluate`・`confusionMatrix`(または`sweep`)で評価する．
