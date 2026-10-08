# Iteration 1：choiceの質問と確率の分布

Iteration 1で初めて使う概念・APIを説明する．
コマンドの例は，devcontainerの中で実行した実際の結果である．

## choice：選択肢から1つを選ぶ

`choice`は，こちらが渡した選択肢の中から，もっとも当てはまるものを選ばせる質問である．
選択肢は`criteria`に，ラベルをキー，説明を値としたオブジェクトで渡す．

```json
{
  "type": "choice",
  "instructions": "Which team should handle this ticket?",
  "criteria": {
    "billing": "payments, refunds, invoices and charges",
    "support": "product help, bugs and how-to questions",
    "sales": "new purchases, pricing and plan upgrades"
  }
}
```

長いリクエストは，JSONをファイルに書いて`curl`の`-d @ファイル名`で送ると楽である．
Iteration 0の`refund`の例と同じ`model`と`state`に，上の質問を`questions`の`department`として入れた本文を`department.json`に保存して送ると，次の答えが返る．

```console
$ curl -s http://ollama:11434/v1/systemone -H 'Content-Type: application/json' -d @department.json
{"model":"tev1:0.8b","answers":{"department":{"type":"choice","choice":"billing","probabilities":{"billing":0.9365169959581124,"support":0.0633304256832058,"sales":0.00015257835868191845},"confidence":0.7838017545633793}},"usage":{"input_tokens":176,"output_tokens":1}}
```

答えには，次の3つが入る．

- `choice`：もっとも確率の高いラベル．
- `probabilities`：ラベルごとの確率．合計はほぼ1になる．
- `confidence`：答えにどれだけ迷いがないか(0から1)．Iteration 4で使う．

答えは必ず，渡したラベルのどれかになる．
LLMに「どの部署か」を文章で答えさせると，`Billing`・`billing team`・`accounting`のように表記がぶれたり，選択肢にない答えが返ったりする．
`choice`では，そのような答えは起こらない．

## 選択肢の説明文

`criteria`の説明文は，モデルが各ラベルの意味を知る唯一の手がかりである．
説明文を`null`にして，ラベルだけを渡すと，同じ問い合わせでも確率が変わる．

```console
$ curl -s http://ollama:11434/v1/systemone -H 'Content-Type: application/json' -d @department-no-descriptions.json
{"model":"tev1:0.8b","answers":{"department":{"type":"choice","choice":"support","probabilities":{"billing":0.3497877941634086,"support":0.6482359232615378,"sales":0.001976282575053673},"confidence":0.3985656691436217}},"usage":{"input_tokens":157,"output_tokens":1}}
```

`billing`の確率は0.9365から0.3498に下がり，選ばれる部署が`support`に変わった．
「refunds」が`billing`の説明に含まれていることが，判断の手がかりになっていたからである．
ラベルの名前だけでは意味が伝わりにくい選択肢ほど，説明文が効く．

選択肢を増やすと，確率は新しい選択肢にも分かれる．
配送を扱う`shipping`(説明は`"deliveries, tracking and returns"`)を足すと，`shipping`には0.0006が割り振られた．
返金の問い合わせは配送とは関係が薄いので，ほとんど確率が付かない．
`billing`の確率は0.9642になった．確率の分かれ方は，選択肢の組み合わせによって少しずつ変わる．

```json
{"billing":0.964235584753306,"support":0.035086389431413144,"sales":0.000057113248001382804,"shipping":0.0006209125672794299}
```

## SDKの型

SDKでは，`choice`の質問は`ChoiceQuestion`型，その答えは`ChoiceResponse`型である．

```ts
import type { ChoiceQuestion, ChoiceResponse } from "@typesafe-ai/sdk";

const colorQuestion: ChoiceQuestion = {
  type: "choice",
  instructions: "Which color does the customer mention?",
  criteria: { red: null, green: null, blue: null },
};

const describe = (answer: ChoiceResponse): string => `${answer.choice}: ${answer.probabilities[answer.choice]}`;
```

`answer.probabilities[answer.choice]`の型は`number | undefined`になる．
このリポジトリの型検査は，オブジェクトを文字列のキーで引いた結果に`undefined`を含める(`noUncheckedIndexedAccess`)．
`choice`は必ず`probabilities`のキーのどれかだが，型だけではそれがわからないからである．
値が必ずあるとわかっているときは，`?? 0`のように，`undefined`のときの値を決めて`number`にする．

## 1回の問い合わせで複数の質問に答えさせる

`questions`に質問を並べると，判断エンジンは1回の計算ですべてに答える．

```console
$ curl -s http://ollama:11434/v1/systemone -H 'Content-Type: application/json' -d @department-and-refund.json
{"model":"tev1:0.8b","answers":{"department":{"type":"choice","choice":"billing","probabilities":{"billing":0.8162253116734451,"support":0.18367337004175932,"sales":0.00010131828479560951},"confidence":0.5649687096830311},"refund":{"type":"noul","noul":0.6121792760571444}},"usage":{"input_tokens":464,"output_tokens":3}}
```

選ばれた部署と，返金を求めているかの判断は，1つずつ尋ねたときと同じである．
確率は，1つずつ尋ねたとき(`billing`が0.9365，`refund`が0.8091)と少し違う．Iteration 0で見たとおり，Tev1の答えは一緒に尋ねる質問によって変わることがある．
まとめて送ると，通信が1回で済み，すべての答えが同じ時点の同じ問い合わせについてのものになる．
プログラムでは，いつも同じ質問の組み合わせで尋ねるようにすると，同じ問い合わせには同じ答えが返る．

SDKでは，`questions`に質問を並べると，`result.answers`に同じ名前で答えが入る．
答えの型は質問の型から決まるので，`result.answers.department`は`ChoiceResponse`，`result.answers.refund`は`NoulResponse`として扱える．

## 複数行の出力

複数の行を1つの文字列にするには，行の配列を作って`join("\n")`でつなぐ．
`console.log`は，文字列の中の`\n`で改行して表示する．

```ts
const lines = ["first line", "second line"];
console.log(lines.join("\n"));
```
