# Iteration 2：scoreの質問と，判断と表示の分離

Iteration 2で初めて使う概念・APIと，設計の考え方を説明する．
コマンドの例は，devcontainerの中で実行した実際の結果である．

## score：段階で評価する

`score`は，順序のある段階(低い・中くらい・高いなど)で評価させる質問である．
段階の説明を，低いものから順に`criteria`の配列で渡す．配列の添字が段階の番号になる．

```json
{
  "type": "score",
  "instructions": "How urgent is this ticket?",
  "criteria": ["not urgent", "somewhat urgent", "urgent", "critical"]
}
```

この質問を`urgency`という名前で送ると，次の答えが返る．

```console
$ curl -s http://laya:8080/v1/systemone -H 'Content-Type: application/json' -d @urgency.json
{"model":"laya","answers":{"urgency":{"type":"score","score":1.4061,"confidence":0.0892,"legend":{"0":"not urgent","1":"somewhat urgent","2":"urgent","3":"critical"},"probabilities":{"0":0.2147,"1":0.2574,"2":0.4349,"3":0.093}}},"usage":{"input_tokens":54,"output_tokens":0}}
```

- `probabilities`：段階の番号ごとの確率．
- `score`：段階の番号の期待値．段階の番号に，その確率を掛けて足したもの(`0×0.2147 + 1×0.2574 + 2×0.4349 + 3×0.093 = 1.4061`)である．段階の間の値もとる．
- `legend`：段階の番号と説明の対応．送った`criteria`と同じである．
- `confidence`：`choice`と同じく，答えにどれだけ迷いがないかを表す．

### 期待値と，もっとも確率の高い段階

上の例で，もっとも確率が高い段階は2(urgent，0.4349)である．
一方，期待値は1.4061で，四捨五入すると1(somewhat urgent)になる．
期待値は，確率の分布全体を1つの数にまとめたものなので，もっとも確率の高い段階とは一致しないことがある．
このハンズオンでは，期待値にもっとも近い段階を表示する．
期待値を使うと，「urgentとsomewhat urgentの間」のような中間の度合いも数で扱える．

### 段階の数と並び順

段階は2つ以上なら，いくつでもよい．
`["low", "high"]`の2段階で尋ねると，期待値は「highである確率」と同じになる．

```json
{"type":"score","score":0.7487,"confidence":0.1867,"legend":{"0":"low","1":"high"},"probabilities":{"0":0.2513,"1":0.7487}}
```

段階は，低いものから高いものへ順に並べる．
逆順(`["critical", "urgent", "somewhat urgent", "not urgent"]`)に並べて同じ問い合わせを送ると，期待値は1.4442になった．
元の並びの1.4061を裏返した値(3 − 1.4061 = 1.5939)にはならない．
並び順を変えると，同じ意味の質問でも答えが変わる．

## SDKの型

`score`の質問は`ScoreQuestion`型，その答えは`ScoreResponse`型である．
`criteria`には，2つ以上の要素を持つ配列を渡す．

```ts
import type { ScoreQuestion } from "@typesafe-ai/sdk";

const sizes = ["small", "medium", "large"] as const;

const sizeQuestion: ScoreQuestion = {
  type: "score",
  instructions: "How large is the order?",
  criteria: sizes,
};
```

配列に`as const`を付けると，`readonly ["small", "medium", "large"]`という，要素の値と数が決まった型(読み取り専用のタプル)になる．
`sizes[1]`の型は`"medium"`，`sizes[Math.round(x)]`の型は`"small" | "medium" | "large" | undefined`になる．
質問の`criteria`と表示の両方で同じ定数を使うと，段階の名前がずれない．

## 判断と表示を分ける

Iteration 1までの`triage`では，質問の定数と表示の関数が，判定の種類ごとのモジュール(`refund`，`department`)に入っていた．
判定の種類が増えると，`run`の中に「3つの質問を送る」「3つの答えを取り出す」「3つの行を作る」が並び，`run`が長くなる．
また，表示の関数が判断エンジンの答えの型(`ChoiceResponse`など)を受け取っているので，表示を確かめるテストでも判断エンジンの答えの形を作る必要があった．

そこで，役割でモジュールを分け直す．

| モジュール | 役割 | 知っているもの |
| --- | --- | --- |
| `triage` | 質問を組み立てて判断エンジンに尋ね，答えを振り分けの結果(`Triage`)にまとめる | 判断エンジンの質問と答えの形 |
| `format` | `Triage`を表示する文字列にする | `Triage`だけ |
| `app` | 引数を読み，`triage`と`format`をつなぐ | 両者の関数 |

`Triage`は，判断エンジンの答えから，このプログラムが使う値だけを取り出した型である．

```ts
export interface Triage {
  department: string;
  departmentProbability: number;
  urgency: number;
  refundProbability: number;
}
```

こうすると，表示の書式を変えるときは`format`だけを，質問の文や答えの取り出し方を変えるときは`triage`だけを変えればよい．
`format`のテストは，`Triage`のオブジェクトを渡すだけで書ける．

## 振る舞いを変えずに構造を変える

モジュールを分け直す作業は，振る舞いを変えないリファクタリングである．
TDDのサイクルのRefactorの段階と同じく，テストがすべて通った状態から始め，少し変えるたびにテストを実行して，通ったままであることを確かめる．

テストも，テストする関数の移動に合わせて移す．
関数のシグネチャが変わったら(たとえば，表示の関数が`ChoiceResponse`ではなく部署の名前と確率を受け取るようになったら)，テストの入力もそれに合わせて書き換える．
期待する表示は変えない．期待値を変えずにテストが通れば，振る舞いを変えていないと確かめられる．
