import { TypeSafeClient } from "@typesafe-ai/sdk";
import { describe, expect, test } from "vitest";
import { createSystemOneEngine } from "../../src/adapters/systemone-engine.ts";
import { run } from "../../src/app.ts";

// 判断エンジンの代わりに，決まった答えを返すfetch．
const fakeFetch = async () =>
  Response.json({
    model: "laya",
    answers: {
      department: { type: "choice", choice: "billing", confidence: 0.1, probabilities: { billing: 0.7 } },
      urgency: { type: "score", score: 1.4, confidence: 0.1, legend: {}, probabilities: { 0: 0, 1: 1, 2: 0, 3: 0 } },
      refund: { type: "noul", noul: 0.86 },
    },
    usage: { input_tokens: 150, output_tokens: 0 },
  });

const engine = createSystemOneEngine(
  new TypeSafeClient({ baseURL: "http://laya.test", apiKey: "test", fetch: fakeFetch }),
);

describe("run serve", () => {
  test("HTTP APIの待ち受けを始め，URLを表示する．--min-confidenceが振り分けに使われる", async () => {
    const result = await run(["serve", "--port", "0", "--min-confidence", "0.05"], engine);

    try {
      expect(result.code).toBe(0);
      const url = result.output.match(/^listening on (http:\/\/localhost:\d+)$/)?.[1];
      expect(url).toBeDefined();
      const response = await fetch(`${url}/triage`, { method: "POST", body: '{"subject": "A", "body": "a"}' });
      expect(await response.json()).toMatchObject({ department: "billing", needsReview: false });
    } finally {
      result.server?.close();
    }
  });

  test("--portが0から65535の整数でなければ，使い方を表示する", async () => {
    for (const port of ["abc", "-1", "65536", "1.5"]) {
      expect((await run(["serve", "--port", port], engine)).code).toBe(2);
    }
  });

  test("--portは，serve以外では使えない", async () => {
    expect((await run(["--port", "3000", "Refund", "Where?"], engine)).code).toBe(2);
  });
});
