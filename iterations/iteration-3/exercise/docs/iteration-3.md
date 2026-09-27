# Iteration 3：判断エンジンをアプリから切り離す(演習)

## このIterationで作るもの

振る舞いは変えずに，判断エンジンをアプリから切り離す．
表示はIteration 2と同じである．

```console
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.73)
urgency: somewhat urgent (1.4)
refund: yes (0.86)
```

アプリが判断を頼む窓口(ポート)`DecisionEngine`を定め，`triage`はこの型だけを使うようにする．
TypeSafeのSDKを使う部分と，テストで使う偽物は，それぞれ`DecisionEngine`を実装するアダプタにする．

作りながら，ポートとアダプタ，依存性の逆転，テストダブル(stub・fake)の使い分けを学ぶ．

## 進め方

演習3-1から順に進める．
詰まったら，`../solution/docs/iteration-3.md`の同じ番号の節を読む．
コマンドは，このパッケージのディレクトリ(`iterations/iteration-3/exercise`)で実行する．

## 演習3-1：引き継いだパッケージを確かめる

1. テストを実行して型を検査する．Iteration 2の13のテストがすべて通ることを確かめる．
2. `src/triage.ts`・`src/app.ts`・`src/main.ts`の`import`を読み，SDK(`@typesafe-ai/sdk`)を使っているモジュールを挙げる．設計書のComponentの図とも見比べる．

## 演習3-2：ポートとアダプタを学ぶ

[Iteration 3：ポートとアダプタ](../../../../docs/systemone/iteration-3.md)を読む．

読み終えたら，次を考える．

1. `test/unit/triage.test.ts`で，偽の`fetch`が返しているJSONのうち，`triage`のテストにとって本当に必要な値はどれか．
2. 判断エンジンを，`/v1/systemone`とは別のAPIを持つものに替えるとする．いまのコードで変える必要があるモジュールはどれか．
3. 資料の`describe`の例で，`switch`から`case "yesno"`を消すと，型検査はどうなるか．このパッケージの中に小さなファイルを作って試し，試したら消す．

## 演習3-3：テストリストを書く

### 要求

- 振る舞い(表示と，判断エンジンへの問い合わせの回数)は変えない．
- `triage`は，ポート`DecisionEngine`と，ポートの質問・答えの型だけを使う．SDKを`import`しない．
- SDKとの変換は，アダプタ`createSystemOneEngine`が行う．
- テストでは，決まった答えを返すアダプタ`createFakeEngine`を使えるようにする．fakeは受け取った問い合わせを記録し，答えを決めていない質問を尋ねられたら例外を投げる．
- どのアダプタを使うかは`main`で決める．

### 作るもの

ポート(`src/ports/decision-engine.ts`)には，次の型を書く．

| 名前 | 形 |
| --- | --- |
| `ChoiceQuestion` | `{ kind: "choice"; prompt: string; options: Readonly<Record<string, string>> }` |
| `ScaleQuestion` | `{ kind: "scale"; prompt: string; levels: readonly string[] }` |
| `YesNoQuestion` | `{ kind: "yesno"; prompt: string }` |
| `ChoiceAnswer` | `{ kind: "choice"; value: string; probability: number; confidence: number; probabilities: Readonly<Record<string, number>> }` |
| `ScaleAnswer` | `{ kind: "scale"; value: number; confidence: number; probabilities: readonly number[] }` |
| `YesNoAnswer` | `{ kind: "yesno"; probability: number }` |
| `Question`・`Answer` | 上の3つずつのユニオン |
| `AnswerFor`・`Questions`・`Answers` | 資料の「型で質問に対応する答えを表す」のとおり |
| `DecisionEngine` | `decide(state, questions)`で，質問の名前ごとの答えを返す |

アダプタには，次のものを作る．

| モジュール | 名前 | 型 |
| --- | --- | --- |
| `src/adapters/systemone-engine.ts` | `createSystemOneEngine` | `(client: TypeSafeClient) => DecisionEngine` |
| `src/adapters/fake-engine.ts` | `createFakeEngine` | `(answers: Readonly<Record<string, Answer>>) => FakeEngine` |
| `src/adapters/fake-engine.ts` | `FakeEngine` | `DecisionEngine`に，受け取った問い合わせの記録`calls`を足したもの |

変えるもの：`triage(engine: DecisionEngine, ticket: Ticket)`，`run(args: string[], engine: DecisionEngine)`，`main`．

### 考えること

- `createSystemOneEngine`のテストでは，何をstubにするか．アプリの質問と，送られる`/v1/systemone`の質問の対応を，どう確かめるか．
- `triage`の既存のテストを，偽の`fetch`からfakeに置き換える．期待する値はどう書き換わるか．
- 結合テストでは，`run`に何を渡すか．

## 演習3-4：設計書を更新する

- Component：ポートとアダプタのモジュールを足し，`triage`からSDKへの矢印をなくす．アプリの中心とアダプタを，`Boundary`で分けて描くとわかりやすい．
- Code：`triage`の中の流れを，`DecisionEngine`を使う形に描き直す．アダプタの中の変換の流れと，ポートの型を足す．
- シーケンス：`triage`とSDKの間に，アダプタを描き入れる．

## 演習3-5：テスト駆動で実装する

振る舞いを変えないので，既存のテストがいつも通る状態を保ちながら進める．

1. `src/ports/decision-engine.ts`にポートの型を書く．
2. `test/unit/adapters/systemone-engine.test.ts`を作り，`createSystemOneEngine`をテスト駆動で作る．
   - 偽の`fetch`を持つ`TypeSafeClient`を作り，`createSystemOneEngine`に渡す．
   - 質問の変換と答えの変換を，別のテストにする．
   - `scale`の段階は，SDKでは「2つ以上の要素を持つ配列」の型である．配列の最初の2つを取り出して確かめると，型検査が通る．
3. `test/unit/adapters/fake-engine.test.ts`を作り，`createFakeEngine`をテスト駆動で作る．例外を確かめるには，`await expect(…).rejects.toThrow(メッセージ)`と書く．
4. `triage`をポートの型に書き換える．`triage`のテストを，fakeを使う形に書き換える．
5. `run`と`main`を書き換える．結合テストは，偽の`fetch`を持つクライアントから`createSystemOneEngine`でアダプタを作って`run`に渡す．
6. 最後に，本物の判断エンジンで実行し，Iteration 2と同じ表示になることを確かめる．

## 演習3-6：振り返る

1. 自分の`TESTLIST.md`と，解答例の[TESTLIST.md](../../solution/TESTLIST.md)を比べる．
2. 演習3-2の2の問いに，もう一度答える．いまのコードでは，変える必要があるモジュールはどれか．
3. `triage`のテストと，Iteration 2の`triage`のテストを比べる．テストが確かめていることは同じか．読みやすさはどう変わったか．
4. `createSystemOneEngine`の変換に誤りがあったとする(例：`yesno`を`score`として送る)．どのテストで見つかるか．`triage`のテストでは見つかるか．
5. 設計書と実装を見比べる．Componentの図の矢印は，`import`と一致しているか．リポジトリの直下で`node tools/check-component.mjs iterations/iteration-3/exercise`を実行して確かめる．

## 演習3-7(発展)：判断エンジンへの問い合わせを記録するアダプタ

`DecisionEngine`を包み，問い合わせにかかった時間を標準エラー出力に書くアダプタ`createTimingEngine(engine: DecisionEngine): DecisionEngine`を作る．

```console
$ pnpm start "Refund not received" "Where is my refund?"
decide: 3 questions in 654 ms
department: billing (0.73)
urgency: somewhat urgent (1.4)
refund: yes (0.86)
```

かかった時間は，実行するたびに変わる．
`main`で，`createTimingEngine(createSystemOneEngine(client))`のように重ねて使う．
アダプタを重ねても，`triage`は変わらない．

発展課題の解答の一例は，`../solution/docs/iteration-3.md`の演習3-7にある．

発展課題でも，テストリストを書いたあとに設計書を更新してから実装し，実装したら設計書と見比べる．
