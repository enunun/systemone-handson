import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { TypeSafeClient } from "@typesafe-ai/sdk";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createSystemOneEngine } from "../../src/adapters/systemone-engine.ts";
import { run } from "../../src/app.ts";

// 判断エンジンの代わりに，件名で決まる部署と確信度を返すfetch．
const decisions: Record<string, { choice: string; confidence: number }> = {
  A: { choice: "billing", confidence: 0.8 },
  B: { choice: "support", confidence: 0.3 },
  C: { choice: "billing", confidence: 0.05 },
};
const fakeFetch = async (_url: string, init?: RequestInit) => {
  const request = JSON.parse(String(init?.body)) as { state: { subject: string } };
  const decision = decisions[request.state.subject] ?? { choice: "support", confidence: 0 };
  return Response.json({
    model: "tev1:0.8b",
    answers: {
      department: { type: "choice", ...decision, probabilities: { [decision.choice]: 0.6 } },
      urgency: { type: "score", score: 1, confidence: 0.1, legend: {}, probabilities: { 0: 0, 1: 1, 2: 0, 3: 0 } },
      refund: { type: "noul", noul: 0.5 },
    },
    usage: { input_tokens: 150, output_tokens: 0 },
  });
};

const engine = createSystemOneEngine(
  new TypeSafeClient({ baseURL: "http://ollama.test", apiKey: "test", fetch: fakeFetch }),
);

let dir = "";
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "triage-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

// Aとbillingは正解，Bは正解がbillingなので誤り，Cは正解がsalesなので誤り．
const writeLabeled = async (): Promise<string> => {
  const file = path.join(dir, "labeled.jsonl");
  await writeFile(
    file,
    [
      '{"subject": "A", "body": "a", "department": "billing"}',
      '{"subject": "B", "body": "b", "department": "billing"}',
      '{"subject": "C", "body": "c", "department": "sales"}',
      '{"subject": "D", "body": "d"}',
    ].join("\n"),
  );
  return file;
};

describe("run eval", () => {
  test("既定のしきい値で評価し，評価の1行と混同行列を表示する．読めない行は知らせて飛ばす", async () => {
    const result = await run(["eval", await writeLabeled()], engine);

    expect(result).toEqual({
      code: 0,
      output: [
        "line 4: skipped (not a JSON object with subject, body and a known department)",
        "accuracy: 0.50 (auto-routed 2 / 3), review rate: 0.33",
        "",
        "actual \\ predicted   billing   support     sales",
        "billing                    1         1         0",
        "support                    0         0         0",
        "sales                      1         0         0",
      ].join("\n"),
    });
  });

  test("--min-confidenceで，評価するしきい値を変える", async () => {
    const result = await run(["eval", "--min-confidence", "0.5", await writeLabeled()], engine);

    expect(result.output.split("\n")[1]).toBe("accuracy: 1.00 (auto-routed 1 / 3), review rate: 0.67");
  });

  test("--sweepで，しきい値ごとの評価の表を表示する", async () => {
    const result = await run(["eval", "--sweep", await writeLabeled()], engine);

    expect(result.output.split("\n").slice(1, 5)).toEqual([
      "min-confidence  auto-routed  accuracy  review rate",
      "0.0                       3      0.33         0.00",
      "0.1                       2      0.50         0.33",
      "0.2                       2      0.50         0.33",
    ]);
  });

  test("--sweepと--min-confidenceは一緒に使えない", async () => {
    const result = await run(["eval", "--sweep", "--min-confidence", "0.5", "labeled.jsonl"], engine);

    expect(result.code).toBe(2);
  });

  test("--sweepは，eval以外では使えない", async () => {
    const result = await run(["--sweep", "Refund", "Where?"], engine);

    expect(result.code).toBe(2);
  });
});
