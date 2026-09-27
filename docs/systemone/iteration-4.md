# Iteration 4：確信度としきい値，引数の解析

Iteration 4で初めて使う概念・APIを説明する．
コマンドの例は，devcontainerの中で実行した実際の結果である．

## 確率と確信度

`choice`と`score`の答えには，`probabilities`(選択肢ごとの確率)と`confidence`(確信度)がある．
2つは，同じ答えを違う見方で表している．

- 選ばれた選択肢の確率：「その選択肢がどれくらいありそうか」．
- 確信度：「確率の分布が，どれくらい1つの選択肢に集まっているか」．分布全体から計算する．

laya-serverの確信度は，分布のエントロピー(ばらつきの大きさ)を使って，次の式で計算する．
kは選択肢の数，p_iは各選択肢の確率である．

```text
confidence = 1 − (−Σ p_i log p_i) / log k
```

すべての確率が同じ(もっとも迷っている)なら0，1つの選択肢の確率が1(まったく迷っていない)なら1になる．

実際の答えで比べる．

| 問い合わせ | 選ばれた部署 | 確率の分布 | 選ばれた部署の確率 | 確信度 |
| --- | --- | --- | --- | --- |
| `Charged twice` | billing | billing 0.9661 | 0.97 | 0.846 |
| `Login problem` | support | support 0.8427，billing 0.0745，sales 0.0828 | 0.84 | 0.5048 |
| `Refund not received` | billing | billing 0.7253，support 0.1994，sales 0.0753 | 0.73 | 0.318 |
| `Team plan` | sales | sales 0.4394，support 0.2963，billing 0.2642 | 0.44 | 0.0229 |

確信度は，選ばれた部署の確率より小さい値になりやすい．
`Team plan`では，salesの確率は0.44ある．しかし，ほかの2つも0.26〜0.30あって分布がほぼ平らなので，確信度は0.02しかない．
確信度は確率とは尺度が違うので，しきい値は確率の感覚で決めず，実際の答えを見て決める．

確信度の計算の仕方は，判断エンジンごとに決まっている．
判断エンジンを替えたら，しきい値も見直す．

## しきい値で人の確認に回す

System Oneは速く安いので，すべての問い合わせを自動で振り分けられる．
ただし，モデルが迷っている問い合わせまで自動で振り分けると，誤りが増える．
そこで，確信度がしきい値を下回ったものだけを，人の確認に回す．

しきい値を上げると，自動で振り分ける問い合わせは減るが，振り分けた分の誤りは減る．
しきい値を下げると，その逆になる．
どこにするかは，人が確認できる量と，誤りをどこまで許すかで決める．
このハンズオンでは，いったん0.2にしておき，Iteration 7で実際のデータを使って測る．

## `util.parseArgs`：オプションを解析する

Node.jsの`node:util`の`parseArgs`は，コマンドライン引数をオプションと位置引数に分ける．

```ts
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  args: ["--min-confidence", "0.3", "Hello", "Hi"],
  options: { "min-confidence": { type: "string" } },
  allowPositionals: true,
});
```

結果は次のようになる．

```console
{
  values: [Object: null prototype] { 'min-confidence': '0.3' },
  positionals: [ 'Hello', 'Hi' ]
}
```

- `options`に，受け付けるオプションを書く．`type: "string"`は値をとるオプション，`type: "boolean"`は値をとらないオプションである．
- `allowPositionals: true`にすると，オプションでない引数を`positionals`に集める．
- オプションの値は文字列のまま返る．数として使うなら，自分で変換して確かめる．

引数に知らないオプションや値の足りないオプションがあると，`parseArgs`は例外を投げる．

```console
ERR_PARSE_ARGS_UNKNOWN_OPTION - Unknown option '--verbose'. To specify a positional argument starting with a '-', place it at the end of the command after '--', as in '-- "--verbose"
ERR_PARSE_ARGS_INVALID_OPTION_VALUE - Option '--min-confidence <value>' argument missing
```

例外は`try`〜`catch`で受け止め，使い方の表示に変える．

## 文字列を数にする

`Number(文字列)`は，数として読めない文字列を`NaN`(数ではないことを表す値)にする．

```ts
Number("abc"); // NaN
Number("0.3"); // 0.3
Number("1e-1"); // 0.1
Number(""); // 0
```

`NaN`は，どんな数と比べても`false`になる．
そのため，範囲の確かめ方を`!(x >= 0 && x <= 1)`と書くと，`NaN`も範囲外として扱える．
`x < 0 || x > 1`と書くと，`NaN`は範囲内として通ってしまう．

`pnpm start`にオプションを渡すときは，`pnpm start --min-confidence 0.3 "件名" "本文"`のように，`start`の後ろに続けて書く．
