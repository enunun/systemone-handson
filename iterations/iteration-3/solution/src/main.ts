// triageの実行ファイル．判断エンジン(laya-server)につなぐアダプタを作り，runの結果を表示する．

import { TypeSafeClient } from "@typesafe-ai/sdk";
import { createSystemOneEngine } from "./adapters/systemone-engine.ts";
import { run } from "./app.ts";

const client = new TypeSafeClient({ baseURL: "http://laya:8080", apiKey: "local", defaultModel: "laya" });
const { code, output } = await run(process.argv.slice(2), createSystemOneEngine(client));
if (code === 0) console.log(output);
else console.error(output);
process.exitCode = code;
