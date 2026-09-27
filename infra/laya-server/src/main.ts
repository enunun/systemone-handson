// Layaを読み込み，Jev互換のHTTPサーバとして起動する．
// サーバはすぐに起動し，モデルの読み込みが終わるまでは503を返す(初回はモデルのダウンロードに時間がかかる)．
//
// 環境変数
// - PORT：待ち受けるポート(既定8080)
// - LAYA_MODEL_DIR：ダウンロード済みのONNXバンドルのディレクトリ(省略時はHugging Faceから取得する)
// - LAYA_SUBFOLDER：チェックポイントの種類(例：multilingual)
// - LAYA_CACHE：ダウンロードしたモデルの置き場所

import { Laya, type LayaOptions } from "@receptron/laya";
import { progressLogger } from "./progress.ts";
import { createLayaServer, type Engine } from "./server.ts";

const port = Number(process.env.PORT ?? 8080);

let engine: Engine | null = null;
const server = createLayaServer({ engine: () => engine });
server.listen(port, () => console.log(`laya-server listening on :${port}`));

const progress = progressLogger({ log: console.log });
const options: LayaOptions = { onProgress: progress.onProgress };
if (process.env.LAYA_MODEL_DIR) options.modelDir = process.env.LAYA_MODEL_DIR;
if (process.env.LAYA_SUBFOLDER) options.subfolder = process.env.LAYA_SUBFOLDER;

const laya = await Laya.load(options).catch((err: unknown) => {
  console.error("failed to load the Laya model. Check that huggingface.co is reachable, or set LAYA_MODEL_DIR.");
  console.error(err);
  process.exit(1);
});
engine = (state, questions) => laya.systemOne(state, questions);
progress.done();
console.log("laya model loaded");

const shutdown = (): void => {
  server.close();
  void laya.close().finally(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
