// 環境変数から，使うDecisionEngineを組み立てる．
// ローカル(Laya)と本番(Jev)の切り替えは，ここに渡す環境変数だけで行う．
//
// - DECISION_ENGINE：systemone(既定)またはfake
// - SYSTEMONE_BASE_URL：APIのルート(既定http://localhost:8080．本番はhttps://api.typesafe.ai)
// - SYSTEMONE_API_KEY：APIキー(laya-serverでは任意の文字列でよい)
// - SYSTEMONE_MODEL：モデル名(既定laya．本番はjev-latest)

import { FakeEngine } from "./adapters/fake.ts";
import { SystemOneHttpEngine } from "./adapters/systemone-http.ts";
import type { DecisionEngine } from "./ports/decision-engine.ts";

export const createEngine = (env: NodeJS.ProcessEnv = process.env): DecisionEngine => {
  const kind = env.DECISION_ENGINE ?? "systemone";
  switch (kind) {
    case "fake":
      return new FakeEngine();
    case "systemone":
      return new SystemOneHttpEngine({
        baseURL: env.SYSTEMONE_BASE_URL ?? "http://localhost:8080",
        apiKey: env.SYSTEMONE_API_KEY ?? "local",
        model: env.SYSTEMONE_MODEL ?? "laya",
      });
    default:
      throw new Error(`unknown DECISION_ENGINE: ${kind} (expected systemone or fake)`);
  }
};
