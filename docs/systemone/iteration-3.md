# Iteration 3：ポートとアダプタ

Iteration 3で初めて使う設計の考え方と，TypeScriptの型の書き方を説明する．

## いまの依存の向き

Iteration 2の`triage`は，TypeSafeのSDKの`TypeSafeClient`を受け取り，SDKの質問の型(`ChoiceQuestion`など)で質問を作っている．
つまり，アプリの中心の処理が，判断エンジンの通信方式とデータの形に直接依存している．

この形には，次の困りごとがある．

- 判断エンジンを，`/v1/systemone`とは別のAPIを持つもの(別のOSSのモデルや，LLMを使った判定など)に替えると，`triage`を書き直すことになる．
- `triage`のテストで，判断エンジンの答えを返すには，HTTPのレスポンスの形(JSON)まで作る必要がある．

## ポートとアダプタ

ポートとアダプタ(ヘキサゴナルアーキテクチャとも呼ぶ)は，アプリの中心を外の仕組みから切り離す設計である．

- ポート：アプリの中心が，外の仕組みに頼みたいことを表す型．アプリの言葉で書く．このハンズオンでは`DecisionEngine`である．
- アダプタ：ポートを実装し，実際の仕組みとの間で変換するもの．仕組みごとに1つ作る．

```text
          アプリの中心                          アダプタ                外の仕組み
triage ──使う──▶ DecisionEngine ◀──実装する── systemone-engine ──▶ /v1/systemone
                 (ポート)       ◀──実装する── fake-engine        (テスト用)
```

矢印の向きに注目する．
アプリの中心(`triage`)も，アダプタ(`systemone-engine`)も，ポートに依存する．
アプリの中心は，アダプタを知らない．
「使う側が決めた型に，使われる側が合わせる」ので，これを依存性の逆転と呼ぶ．

どのアダプタを使うかは，プログラムの入口(`main`)で決め，`run`と`triage`に渡す．

## アプリの言葉で型を書く

ポートの型は，SDKの型を真似せず，アプリにとって自然な形にする．
たとえば，次のような違いがある．

| | SDK(`/v1/systemone`) | ポート |
| --- | --- | --- |
| 質問の種類 | `type: "choice" \| "score" \| "noul"` | `kind: "choice" \| "scale" \| "yesno"` |
| 質問の文 | `instructions` | `prompt` |
| 選択肢 | `criteria` | `options`(choice)・`levels`(scale) |
| 選んだラベルの確率 | `probabilities[choice]`を自分で引く | `probability`として答えに入れる |
| 段階ごとの確率 | 番号の文字列をキーとするオブジェクト | 番号を添字とする配列 |

違いは，アダプタが変換する．
判断エンジンを替えても，変換の仕方が変わるだけで，ポートと`triage`は変わらない．

## 型で「質問に対応する答え」を表す

`decide`は，質問の集まりを受け取り，同じ名前の答えの集まりを返す．
答えの型は，質問の種類で決まる．これを型で表すために，3つの書き方を使う．

```ts
/** 質問の型に対応する答えの型． */
export type AnswerFor<Q extends Question> = Q extends ChoiceQuestion
  ? ChoiceAnswer
  : Q extends ScaleQuestion
    ? ScaleAnswer
    : YesNoAnswer;

/** 質問の名前ごとの答え． */
export type Answers<Q extends Questions> = { [K in keyof Q]: AnswerFor<Q[K]> };

export interface DecisionEngine {
  decide<const Q extends Questions>(state: Readonly<Record<string, string>>, questions: Q): Promise<Answers<Q>>;
}
```

- 条件型(`A extends B ? X : Y`)：型`A`が`B`に当てはまれば`X`，そうでなければ`Y`になる型．
- マップ型(`{ [K in keyof Q]: … }`)：`Q`のキーごとに，値の型を作り直した型．
- `const`型引数(`<const Q …>`)：呼び出し側が渡したオブジェクトを，できるだけ細かい型(`kind: "choice"`など)のまま`Q`にする．

これにより，`decide`の結果の`answers.department`は`ChoiceAnswer`，`answers.refund`は`YesNoAnswer`として扱える．

## 判別可能なユニオンと`switch`

`Question`は，`kind`の値で種類を見分けられるユニオン型(判別可能なユニオン)である．
`switch (question.kind)`で分けると，それぞれの`case`の中で`question`の型が絞り込まれる．

```ts
const describe = (question: Question): string => {
  switch (question.kind) {
    case "choice":
      return Object.keys(question.options).join(" / ");
    case "scale":
      return question.levels.join(" < ");
    case "yesno":
      return "yes / no";
  }
};
```

すべての種類を`case`で扱うと，`switch`の後ろに`return`がなくても型検査が通る．
種類を1つ増やして`case`を書き忘れると，「戻り値のない場合がある」という理由で型検査が失敗する．

## オブジェクトでインターフェースを実装する

インターフェースは，クラスを作らなくても，そのメソッドを持つオブジェクトで実装できる．
このハンズオンでは，アダプタを「オブジェクトを作る関数」にする．

```ts
export const createGreeter = (name: string): Greeter => ({
  greet: () => `Hello, ${name}`,
});
```

関数の引数(`name`)は，作ったオブジェクトのメソッドから使える(クロージャ)．

## テストダブル

テストで本物の代わりに使うものを，テストダブルと呼ぶ．
このハンズオンでは，2種類を使い分ける．

| 種類 | 振る舞い | 使う場所 |
| --- | --- | --- |
| stub | 決まった値を返すだけの，最小限の代わり | 偽の`fetch`(SDKの通信の代わり) |
| fake | 本物と同じインターフェースを持ち，簡単な仕組みで動く代わり | `fake-engine`(`DecisionEngine`の代わり) |

`fake-engine`は，受け取った問い合わせを`calls`に記録する．
テストでは，記録を見て「何を尋ねたか」を確かめられる．

使い分けの目安は，何をテストするかである．

- アダプタ(`systemone-engine`)のテストでは，SDKとの変換を確かめたいので，通信の手前まで本物を使い，`fetch`だけをstubにする．
- `triage`のテストでは，質問の組み立てと答えの取り出しを確かめたいので，`DecisionEngine`をfakeにする．HTTPのレスポンスの形を作る必要がなくなる．
- 結合テストでは，モジュールを組み合わせた振る舞いを確かめたいので，本物のアダプタに`fetch`のstubを渡す．

## ディレクトリでモジュールを分ける

モジュールが増えてきたので，役割でディレクトリを分ける．

```text
src/ports/decision-engine.ts
src/adapters/systemone-engine.ts
src/adapters/fake-engine.ts
```

ディレクトリの外のモジュールを`import`するときは，相対パスで`../`を使う(`import type { Question } from "../ports/decision-engine.ts"`)．
設計書のComponentの図では，モジュール名を`src/`からの相対パス(`ports/decision-engine`など)にする．
