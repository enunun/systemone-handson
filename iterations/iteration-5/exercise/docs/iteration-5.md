# Iteration 5：接続先を環境変数で選ぶ(演習)

## このIterationで作るもの

判断エンジンの接続先(URL・モデル名・APIキー)を，コードではなく環境変数で指定する．
環境変数は`.env`ファイルに書いておき，`pnpm start`のときに読み込む．

```console
$ cp .env.example .env
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.73)
urgency: somewhat urgent (1.4)
refund: yes (0.86)
```

`DECISION_ENGINE=fake`にすると，判断エンジンを使わずに決まった答えを表示する．
`.env`の3行を書き換えると，コードを変えずに本家Jevへ切り替えられる．

作りながら，環境変数による設定，組み立ての場所(composition root)，`node --env-file`，laya-serverとJevの違いを学ぶ．

## 進め方

演習5-1から順に進める．
詰まったら，`../solution/docs/iteration-5.md`の同じ番号の節を読む．
コマンドは，このパッケージのディレクトリ(`iterations/iteration-5/exercise`)で実行する．

## 演習5-1：引き継いだパッケージを確かめる

1. テストを実行して型を検査する．Iteration 4の26のテストがすべて通ることを確かめる．
2. `src/main.ts`を読み，判断エンジンの接続先がどこに書かれているかを確かめる．接続先を本家Jevに替えるには，どこをどう変える必要があるか．

## 演習5-2：環境変数を試す

[Iteration 5：環境変数による設定と，Jevへの切り替え](../../../../docs/systemone/iteration-5.md)を読む．

読み終えたら，次を試す．

1. `node`の対話モードで`process.env.HOME`と`process.env.NO_SUCH_VARIABLE`を評価し，結果を比べる．
2. `GREETING=Hi node -e 'console.log(process.env.GREETING)'`を実行する．コマンドの前に書いた環境変数が，プログラムから読めることを確かめる．
3. このパッケージのディレクトリに`GREETING=Hello`とだけ書いた`.env`を作り，`node --env-file-if-exists=.env -e 'console.log(process.env.GREETING)'`を実行する．続けて，`GREETING=Hi`をコマンドの前に付けて実行し，どちらの値が使われるかを確かめる．試したら`.env`を消す．

## 演習5-3：テストリストを書く

次の要求を読み，[TESTLIST.md](../TESTLIST.md)にテストリストを書く．

### 要求

- 判断エンジンの種類を，環境変数`DECISION_ENGINE`で選ぶ．`systemone`なら`/v1/systemone`を話す判断エンジン，`fake`なら決まった答えを返す判断エンジンを使う．指定がなければ`systemone`とする．
- `systemone`のときは，`SYSTEMONE_BASE_URL`・`SYSTEMONE_MODEL`・`SYSTEMONE_API_KEY`で，接続先のURL・モデル名・APIキーを指定する．
- 必要な環境変数が足りない(または空の)ときは，判断エンジンへ問い合わせずに，足りない変数の名前を`missing environment variables: SYSTEMONE_BASE_URL, SYSTEMONE_API_KEY`のように標準エラー出力に表示し，終了コード1で終わる．
- `DECISION_ENGINE`が知らない値なら，`DECISION_ENGINE must be systemone or fake: <値>`と表示し，終了コード1で終わる．
- `pnpm start`は，パッケージのディレクトリの`.env`があれば読み込む．`.env`の見本として`.env.example`を置く．
- `fake`のときは，部署support(確率1)・緊急度0・返金の確率0を答える．

### 使い方の例

```console
$ pnpm start "Refund not received" "Where is my refund?"
.env not found. Continuing without it.
missing environment variables: SYSTEMONE_BASE_URL, SYSTEMONE_MODEL, SYSTEMONE_API_KEY
$ cp .env.example .env
$ pnpm start "Refund not received" "Where is my refund?"
department: billing (0.73)
urgency: somewhat urgent (1.4)
refund: yes (0.86)
$ DECISION_ENGINE=fake pnpm start "Refund not received" "Where is my refund?"
department: support (1.00)
urgency: not urgent (0.0)
refund: no (0.00)
```

### 作るもの

| モジュール | 名前 | 型 | 役割 |
| --- | --- | --- | --- |
| `src/config.ts` | `Config` | `{ engine: "systemone"; baseURL: string; model: string; apiKey: string } \| { engine: "fake" }` | 判断エンジンの設定． |
| `src/config.ts` | `ConfigResult` | `{ ok: true; config: Config } \| { ok: false; message: string }` | 設定を読んだ結果． |
| `src/config.ts` | `loadConfig` | `(env: Readonly<Record<string, string \| undefined>>) => ConfigResult` | 環境変数から設定を読む． |
| `src/main.ts` | (入口) | | 設定を読み，設定に従ってアダプタを作り，`run`に渡す． |
| `.env.example` | | | `.env`の見本．laya-serverの値と，Jevに切り替えるときの値をコメントで書く． |

`package.json`の`start`は，`node --env-file-if-exists=.env src/main.ts`に変える．

### 考えること

- `loadConfig`は，環境変数のオブジェクトを引数で受け取る．テストでは何を渡すか．
- 足りない環境変数が1つのとき・複数のとき・空の値のときは，それぞれ確かめる価値があるか．
- `main`は単体テストで確かめにくい．`main`に残す処理をできるだけ小さくするには，どこまでを`loadConfig`に任せるとよいか．
- 既存のテストで変わるものはあるか．

## 演習5-4：設計書を更新する

- Context：本家Jevを，もう1つの外部のシステムとして描く．どちらを使うかの決めごとを図の下に書く．
- Container：`.env`をデータの置き場所として描き，本家Jevを描き足す．
- Component：`config`を足し，`main`からの矢印を足す．`main`は，どのアダプタを使うかを決める場所になる．
- Code：環境変数から`DecisionEngine`ができるまでの流れと，`Config`・`ConfigResult`を足す．
- シーケンス：`main`が設定を読み，足りなければ終わる流れを足す．

## 演習5-5：テスト駆動で実装する

- `test/unit/config.test.ts`を作り，`loadConfig`をテスト駆動で作る．
- 足りない変数の名前を集めるには，名前の配列を`filter`する．`!env[name]`は，`undefined`と空文字列の両方で真になる．
- `main.ts`を，設定からアダプタを組み立てる形に書き換える．`Config`の`engine`で`switch`し，`systemone`なら`TypeSafeClient`とアダプタを，`fake`なら決まった答えを持つfakeを作る．
- `.env.example`を作り，`package.json`の`start`を変える．
- 最後に，使い方の例の3つを実際に試す．

## 演習5-6：振り返る

1. 自分の`TESTLIST.md`と，解答例の[TESTLIST.md](../../solution/TESTLIST.md)を比べる．
2. 演習5-1の2の問いに，もう一度答える．いまのコードで，本家Jevに替えるには何を変えるか．
3. `DECISION_ENGINE=fake`は，どんなときに役に立つか．
4. `run`の結合テストは，このIterationで変わったか．それはなぜか．
5. 設計書と実装を見比べる．違う形になったところがあれば，設計書を実装に合わせて直す．

## 演習5-7(発展)：判断エンジンにつながらないときの表示

`SYSTEMONE_BASE_URL`を誤ったURLにして実行すると，SDKの例外が長いスタックトレースとともに表示される．
つながらないときは，短いメッセージを表示して終了コード1で終わるようにする．

```console
$ SYSTEMONE_BASE_URL=http://localhost:9999 pnpm start "Refund" "Where?"
cannot reach the decision engine at http://localhost:9999: Connection error: fetch failed
```

SDKは，つながらないときに`APIConnectionError`を投げる．
SDKは送り直しを2回行うので，メッセージが表示されるまで少し時間がかかる．

発展課題の解答の一例は，`../solution/docs/iteration-5.md`の演習5-7にある．

発展課題でも，テストリストを書いたあとに設計書を更新してから実装し，実装したら設計書と見比べる．
