// triageの実行ファイル．環境変数の設定から判断エンジンのアダプタを組み立て，runの結果を表示する．
// どのアダプタを使うかを決めるのは，このモジュールだけである(組み立ての場所)．

import { TypeSafeClient } from "@typesafe-ai/sdk";
import { createFakeEngine } from "./adapters/fake-engine.ts";
import { createSystemOneEngine } from "./adapters/systemone-engine.ts";
import { run } from "./app.ts";
import { type Config, loadConfig } from "./config.ts";
import type { DecisionEngine } from "./ports/decision-engine.ts";

/** DECISION_ENGINE=fakeのときに返す答え．判断エンジンなしで動作を確かめるときに使う． */
const fakeAnswers = {
  department: { kind: "choice", value: "support", probability: 1, confidence: 1, probabilities: { support: 1 } },
  urgency: { kind: "scale", value: 0, confidence: 1, probabilities: [1, 0, 0, 0] },
  refund: { kind: "yesno", probability: 0 },
} as const;

const createEngine = (config: Config): DecisionEngine => {
  switch (config.engine) {
    case "systemone":
      return createSystemOneEngine(
        new TypeSafeClient({ baseURL: config.baseURL, apiKey: config.apiKey, defaultModel: config.model }),
      );
    case "fake":
      return createFakeEngine(fakeAnswers);
  }
};

const loaded = loadConfig(process.env);
if (loaded.ok) {
  const { code, output } = await run(process.argv.slice(2), createEngine(loaded.config));
  if (code === 0) console.log(output);
  else console.error(output);
  process.exitCode = code;
} else {
  console.error(loaded.message);
  process.exitCode = 1;
}
