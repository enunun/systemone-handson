// triageの実行ファイル．判断エンジン(laya-server)につなぐアダプタを作り，runの結果を表示する．

import { TypeSafeClient } from "@typesafe-ai/sdk";
import { createSystemOneEngine } from "./adapters/systemone-engine.ts";
// 発展(演習3-7)：判断エンジンへの問い合わせにかかった時間を記録するアダプタを使う(advanced/src/adapters/timing-engine.ts)
// import { createTimingEngine } from "./adapters/timing-engine.ts";
// 発展(演習3-7)ここまで
import { run } from "./app.ts";

const client = new TypeSafeClient({ baseURL: "http://laya:8080", apiKey: "local", defaultModel: "laya" });
// 発展(演習3-7)：アダプタを重ねて，問い合わせにかかった時間を標準エラー出力に書く
// const { code, output } = await run(process.argv.slice(2), createTimingEngine(createSystemOneEngine(client)));
// 発展(演習3-7)ここまで．次の1行の代わりに使う
const { code, output } = await run(process.argv.slice(2), createSystemOneEngine(client));
if (code === 0) console.log(output);
else console.error(output);
process.exitCode = code;
