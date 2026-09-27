# Component：モジュール

`triage`を構成するモジュール(`src/`のファイル)と，使う外部のパッケージと，その依存関係を示す．

```mermaid
C4Component
  title triageのコンポーネント
  Container_Boundary(cli, "triage") {
    Component(main, "main", "src/main.ts", "設定からアダプタを組み立て，runの結果を表示する(組み立ての場所)")
    Component(config, "config", "src/config.ts", "環境変数から判断エンジンの設定を読む")
    Component(app, "app", "src/app.ts", "引数(オプション・件名・本文)を読み，triageとformatをつなぐ")
    Boundary(core, "アプリの中心") {
      Component(triage, "triage", "src/triage.ts", "質問を組み立てて判断を頼み，答えを振り分けの結果にまとめる")
      Component(format, "format", "src/format.ts", "振り分けの結果を表示する文字列にする")
      Component(port, "ports/decision-engine", "src/ports/decision-engine.ts", "判断を頼む窓口(DecisionEngine)と，質問・答えの型")
    }
    Boundary(adapters, "アダプタ") {
      Component(systemone, "adapters/systemone-engine", "src/adapters/systemone-engine.ts", "/v1/systemoneを話す判断エンジンにつなぐ")
      Component(fake, "adapters/fake-engine", "src/adapters/fake-engine.ts", "決まった答えを返す(テスト用)")
    }
  }
  Component_Ext(sdk, "@typesafe-ai/sdk", "npmのパッケージ", "/v1/systemoneのクライアント")
  Rel(main, app, "run")
  Rel(main, config, "loadConfig，Config")
  Rel(main, systemone, "createSystemOneEngine")
  Rel(main, fake, "createFakeEngine")
  Rel(main, port, "DecisionEngine")
  Rel(main, sdk, "TypeSafeClient")
  Rel(app, triage, "triage，TriageOptions")
  Rel(app, format, "formatTriage")
  Rel(app, port, "DecisionEngine")
  Rel(format, triage, "Triage，urgencyLevels")
  Rel(triage, port, "DecisionEngine，質問の型")
  Rel(systemone, port, "DecisionEngineを実装する")
  Rel(systemone, sdk, "TypeSafeClient，Question")
  Rel(fake, port, "DecisionEngineを実装する")
```

- アプリの中心(`triage`・`format`・`ports/decision-engine`)は，SDKとアダプタのどちらにも依存しない．
- アダプタは，ポートの`DecisionEngine`を実装する．依存の矢印は，アダプタからポートへ向く(依存性の逆転)．
- どのアダプタを使うかを決めるのは`main`だけである．`main`は，`config`が読んだ設定に従ってアダプタを作る．
- `adapters/fake-engine`は，テストと，`DECISION_ENGINE=fake`のときに使う．
- `config`は，ほかのモジュールに依存しない．
