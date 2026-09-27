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
上の質問を`questions`の`department`に入れた本文を`department.json`に保存して送ると，次の答えが返る．

```console
$ curl -s http://laya:8080/v1/systemone -H 'Content-Type: application/json' -d @department.json
{"model":"laya","answers":{"department":{"type":"choice","choice":"billing","confidence":0.318,"probabilities":{"billing":0.7253,"support":0.1994,"sales":0.0753}}},"usage":{"input_tokens":67,"output_tokens":0}}
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
$ curl -s http://laya:8080/v1/systemone -H 'Content-Type: application/json' -d @department-no-descriptions.json
{"model":"laya","answers":{"department":{"type":"choice","choice":"billing","confidence":0.144,"probabilities":{"billing":0.5122,"support":0.3877,"sales":0.1001}}},"usage":{"input_tokens":39,"output_tokens":0}}
```

`billing`の確率は0.7253から0.5122に下がった．
「refunds」が`billing`の説明に含まれていることが，判断の手がかりになっていたからである．
ラベルの名前だけでは意味が伝わりにくい選択肢ほど，説明文が効く．

選択肢を増やすと，確率はほかの選択肢にも分かれる．
配送を扱う`shipping`を足すと，`billing`の確率は0.6425になり，`shipping`に0.1464が割り振られた．

```json
{"billing":0.6425,"support":0.1471,"sales":0.064,"shipping":0.1464}
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
$ curl -s http://laya:8080/v1/systemone -H 'Content-Type: application/json' -d @department-and-refund.json
{"model":"laya","answers":{"department":{"type":"choice","choice":"billing","confidence":0.318,"probabilities":{"billing":0.7253,"support":0.1994,"sales":0.0753}},"refund":{"type":"noul","noul":0.8631}},"usage":{"input_tokens":120,"output_tokens":0}}
```

`department`の答えも`refund`の答えも，1つずつ尋ねたときと同じである．
質問を同じリクエストにまとめても，互いの答えは変わらない．
まとめて送ると，通信が1回で済み，すべての答えが同じ時点の同じ問い合わせについてのものになる．

SDKでは，`questions`に質問を並べると，`result.answers`に同じ名前で答えが入る．
答えの型は質問の型から決まるので，`result.answers.department`は`ChoiceResponse`，`result.answers.refund`は`NoulResponse`として扱える．

## 複数行の出力

複数の行を1つの文字列にするには，行の配列を作って`join("\n")`でつなぐ．
`console.log`は，文字列の中の`\n`で改行して表示する．

```ts
const lines = ["first line", "second line"];
console.log(lines.join("\n"));
```
