# Component：モジュール

`triage`を構成するモジュール(`src/`のファイル)と，使う外部のパッケージと，その依存関係を示す．

```mermaid
C4Component
  title triageのコンポーネント
  Container_Boundary(cli, "triage") {
    Component(main, "main", "src/main.ts", "判断エンジンのクライアントを作り，runの結果を表示する")
    Component(app, "app", "src/app.ts", "引数を読み，triageとformatをつなぐ")
    Component(triage, "triage", "src/triage.ts", "質問を組み立てて判断エンジンに尋ね，答えを振り分けの結果にまとめる")
    Component(format, "format", "src/format.ts", "振り分けの結果を表示する文字列にする")
  }
  Component_Ext(sdk, "@typesafe-ai/sdk", "npmのパッケージ", "/v1/systemoneのクライアント")
  Rel(main, app, "run")
  Rel(main, sdk, "TypeSafeClient")
  Rel(app, triage, "triage")
  Rel(app, format, "formatTriage")
  Rel(app, sdk, "TypeSafeClient")
  Rel(format, triage, "Triage，urgencyLevels")
  Rel(triage, sdk, "TypeSafeClient，ChoiceQuestion，ScoreQuestion，NoulQuestion")
```

- `main`だけが，接続先のURLを知っている．`app`は，渡されたクライアントを`triage`に渡す．
- 判断エンジンとやりとりするのは`triage`だけである．`format`は，判断エンジンの答えの形(SDKの型)を知らず，`Triage`だけを表示する．
