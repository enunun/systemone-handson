# Iteration 5：環境変数による設定と，Jevへの切り替え

Iteration 5で初めて使う概念・ツールと，本家Jevへの切り替え方を説明する．
コマンドの例は，devcontainerの中で実行した実際の結果である．

## 設定をコードの外に出す

Iteration 4までの`main.ts`には，判断エンジンのURL(`http://laya:8080`)・APIキー・モデル名を直接書いていた．
これでは，接続先を替えるたびにコードを変えることになる．
APIキーのような秘密の値をコードに書くと，Gitの履歴に残ってしまう．

そこで，環境によって変わる値は，環境変数で渡す．
コードは同じまま，開発ではlaya-server，本番ではJevのように，実行する環境ごとに値を変えられる．

Node.jsでは，環境変数を`process.env`で読める．
値は文字列か，設定されていなければ`undefined`である．

```ts
const url = process.env.SYSTEMONE_BASE_URL; // string | undefined
```

## `.env`ファイルと`--env-file`

環境変数を毎回シェルで設定するのは手間なので，`.env`ファイルに書いておく．

```sh
SYSTEMONE_BASE_URL=http://laya:8080
SYSTEMONE_MODEL=laya
```

Node.jsは，`--env-file-if-exists=.env`を付けて起動すると，`.env`を読んで`process.env`に入れる．
ファイルがなければ，その旨を表示して続ける．

```console
$ pnpm start "Refund not received" "Where is my refund?"
.env not found. Continuing without it.
```

シェルで設定した環境変数は，`.env`の値より優先される．
一時的に値を変えたいときは，コマンドの前に書く．

```sh
DECISION_ENGINE=fake pnpm start "Refund not received" "Where is my refund?"
```

`.env`には秘密の値が入るので，Gitに入れない(このリポジトリの`.gitignore`で除外している)．
代わりに，値の見本を`.env.example`としてGitに入れておき，使う人が`cp .env.example .env`で作る．

## 設定を読む関数をテストする

`process.env`を直接読む関数は，テストのたびにプロセスの環境変数を書き換える必要がある．
環境変数のオブジェクトを引数で受け取る関数にすると，テストでは普通のオブジェクトを渡せる．

```ts
export const loadGreeting = (env: Readonly<Record<string, string | undefined>>): string => env.GREETING ?? "Hello";

loadGreeting({ GREETING: "Hi" }); // "Hi"
loadGreeting(process.env); // 本番では，プロセスの環境変数を渡す
```

設定が足りないときに例外を投げる代わりに，成功と失敗のどちらかを表す値を返すと，呼び出し側で扱いやすい．

```ts
type Result = { ok: true; value: string } | { ok: false; message: string };
```

`ok`で分けると，それぞれの場合で`value`と`message`のどちらを持つかが型で絞り込まれる．

## 組み立ての場所

Iteration 3で，アプリの中心は`DecisionEngine`だけに依存し，どのアダプタを使うかは`main`で決めるようにした．
このように，具体的な部品(アダプタ)を作って組み合わせる場所を1か所にまとめたものを，組み立ての場所(composition root)と呼ぶ．

```text
main(組み立ての場所)
  ├─ loadConfig(process.env)          設定を読む
  ├─ createSystemOneEngine / createFakeEngine   設定に従ってアダプタを作る
  └─ run(args, engine)                 アプリに渡す
```

組み立ての場所は，プログラムの中でもっとも具体的な部分である．
設定の読み方・アダプタの作り方が変わっても，`run`から先は変わらない．

## 本家Jevに切り替える

laya-serverと本家Jevは，同じ`/v1/systemone`のAPIを持つ．
`triage`は，`.env`の3行を書き換えるだけでJevを使える．

```sh
SYSTEMONE_BASE_URL=https://api.typesafe.ai
SYSTEMONE_MODEL=jev-latest
SYSTEMONE_API_KEY=<TypeSafeのAPIキー>
```

切り替えるときは，次のことを確かめる．

| 項目 | laya-server | 本家Jev |
| --- | --- | --- |
| 動く場所 | devcontainerの中(CPU) | TypeSafe AIのサーバ |
| APIキー | 検査しない(何でもよい) | TypeSafe AIで発行したキーが必要 |
| モデル名 | 何を指定しても`laya`で答える | `jev-latest`など |
| 料金 | かからない | 読んだトークンの数に応じてかかる(`usage.input_tokens`) |
| 確信度 | Layaの計算の仕方 | Jevの計算の仕方 |

- 確信度の分布は，判断エンジンによって違う．Iteration 4で決めたしきい値は，Jevに替えたら測り直す．測り方は，Iteration 7で作る．
- APIキーは，`.env`にだけ書き，コードやGitに入れない．
- 本家Jevの利用条件(利用できる人，料金，商用利用の条件)は，TypeSafe AIの案内と利用規約で確かめる．

コードを変えずに切り替えられるのは，Iteration 3でアプリの中心を`DecisionEngine`に依存させ，Iteration 5で接続先を設定に出したからである．
`/v1/systemone`とは別のAPIを持つ判断エンジンに替えるときは，そのためのアダプタを作り，`DECISION_ENGINE`の値を1つ増やす．
