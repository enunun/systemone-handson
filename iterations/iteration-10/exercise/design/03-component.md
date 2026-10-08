# Component：モジュール

`triage`を構成するモジュール(`src/`のファイル)と，使う外部のパッケージと，その依存関係を示す．

```mermaid
C4Component
  title triageのコンポーネント
  Container_Boundary(cli, "triage") {
    Component(main, "main", "src/main.ts", "設定からアダプタを組み立て，runの結果を表示する(組み立ての場所)")
    Component(config, "config", "src/config.ts", "環境変数から判断エンジンの設定を読む")
    Boundary(inbound, "入口側のアダプタ") {
      Component(app, "app", "src/app.ts", "コマンドライン：引数を読み，triage・batch・evaluate・records・metrics・formatをつなぐ．serveでHTTP APIを起動する")
      Component(http, "adapters/http-api", "src/adapters/http-api.ts", "HTTP：POST /triageを受け付け，triageの結果をJSONで返す")
    }
    Boundary(core, "アプリの中心") {
      Component(triage, "triage", "src/triage.ts", "質問を組み立てて判断を頼み，答えを振り分けの結果にまとめる")
      Component(format, "format", "src/format.ts", "振り分けの結果と集計を表示する文字列にする")
      Component(batch, "batch", "src/batch.ts", "JSON Linesを読み，同時に送る数を制限して振り分け，集計する部品")
      Component(evaluate, "evaluate", "src/evaluate.ts", "正解の付いた問い合わせを読み，しきい値ごとの精度を測る")
      Component(records, "records", "src/records.ts", "評価の記録をJSON Linesに書き，読み戻す")
      Component(metrics, "metrics", "src/metrics.ts", "評価の記録から，適合率・再現率・Brierスコア・平均絶対誤差・パーセンタイルを計算する")
      Component(port, "ports/decision-engine", "src/ports/decision-engine.ts", "判断を頼む窓口(DecisionEngine)と，質問・答えの型")
    }
    Boundary(adapters, "出口側のアダプタ") {
      Component(systemone, "adapters/systemone-engine", "src/adapters/systemone-engine.ts", "/v1/systemoneを話す判断エンジンにつなぐ")
      Component(fake, "adapters/fake-engine", "src/adapters/fake-engine.ts", "決まった答えを返す(テスト用)")
    }
  }
  Component_Ext(sdk, "@typesafe-ai/sdk", "npmのパッケージ", "/v1/systemoneのクライアント")
  Rel(main, app, "run")
  Rel(app, http, "createApi")
  Rel(http, triage, "triage，TriageOptions")
  Rel(http, batch, "isTicket")
  Rel(http, port, "DecisionEngine")
  Rel(main, config, "loadConfig，Config")
  Rel(main, systemone, "createSystemOneEngine")
  Rel(main, fake, "createFakeEngine")
  Rel(main, port, "DecisionEngine")
  Rel(main, sdk, "TypeSafeClient")
  Rel(app, triage, "triage，TriageOptions，defaultMinConfidence")
  Rel(app, format, "formatTriage，formatSummary，formatEvaluation，formatConfusionMatrix，formatSweep，formatReport")
  Rel(app, evaluate, "parseLabeledTickets，evaluate，confusionMatrix，sweep")
  Rel(app, records, "EvalRecord，formatRecords，parseRecords，toLabeledResults")
  Rel(app, metrics, "buildReport")
  Rel(records, batch, "parseJsonLines")
  Rel(records, evaluate, "LabeledTicket，LabeledResult，readLabeledTicket")
  Rel(records, triage, "Triage")
  Rel(metrics, evaluate, "evaluate，Evaluation，LabeledResult")
  Rel(metrics, records, "EvalRecord，toLabeledResults")
  Rel(metrics, triage, "departmentNames")
  Rel(format, metrics, "Report")
  Rel(evaluate, batch, "isTicket，parseJsonLines")
  Rel(evaluate, triage, "Ticket，Triage，departmentNames，urgencyLevels")
  Rel(format, evaluate, "Evaluation，ConfusionMatrix")
  Rel(app, batch, "parseTickets，mapWithConcurrency，summarize，batchConcurrency")
  Rel(batch, triage, "Ticket，Triage，departmentNames")
  Rel(format, batch, "Summary")
  Rel(app, port, "DecisionEngine")
  Rel(format, triage, "Triage，urgencyLevels")
  Rel(triage, port, "DecisionEngine，質問の型")
  Rel(systemone, port, "DecisionEngineを実装する")
  Rel(systemone, sdk, "TypeSafeClient，Question")
  Rel(fake, port, "DecisionEngineを実装する")
```

- アプリの中心(`triage`・`format`・`batch`・`evaluate`・`records`・`metrics`・`ports/decision-engine`)は，SDKとアダプタのどちらにも依存しない．
- ファイルを読み書きするのは`app`である．`batch`・`evaluate`・`records`は，ファイルの中身(文字列)を受け取るか返す．
- `metrics`は，記録だけから指標を計算する．判断エンジンを使わない．
- アダプタは，ポートの`DecisionEngine`を実装する．依存の矢印は，アダプタからポートへ向く(依存性の逆転)．
- 入口側のアダプタ(`app`・`adapters/http-api`)は，外からの頼みごと(コマンドライン・HTTP)をアプリの中心の呼び出しに変える．出口側のアダプタ(`adapters/systemone-engine`・`adapters/fake-engine`)は，アプリの中心の頼みごとを外の仕組みの呼び出しに変える．
- コマンドラインとHTTP APIは，同じ`triage`を使う．
- どの出口側のアダプタを使うかを決めるのは`main`だけである．`main`は，`config`が読んだ設定に従ってアダプタを作る．
- `adapters/fake-engine`は，テストと，`DECISION_ENGINE=fake`のときに使う．
- `config`は，ほかのモジュールに依存しない．
