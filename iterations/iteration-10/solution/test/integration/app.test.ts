import { TypeSafeClient } from "@typesafe-ai/sdk";
import { describe, expect, test } from "vitest";
import { createSystemOneEngine } from "../../src/adapters/systemone-engine.ts";
import { run } from "../../src/app.ts";

// 判断エンジンが返す答え．部署の確信度(confidence)だけを変えられるようにする．
const answersWith = (departmentConfidence: number) => ({
  department: {
    type: "choice",
    choice: "billing",
    confidence: departmentConfidence,
    probabilities: { billing: 0.7253, support: 0.1994, sales: 0.0753 },
  },
  urgency: {
    type: "score",
    score: 1.4061,
    confidence: 0.0892,
    legend: { 0: "not urgent", 1: "somewhat urgent", 2: "urgent", 3: "critical" },
    probabilities: { 0: 0.2147, 1: 0.2574, 2: 0.4349, 3: 0.093 },
  },
  refund: { type: "noul", noul: 0.8631 },
});

// 判断エンジンの代わりに，決まった答えを返すfetch．受け取ったリクエストの本文をrequestsに記録する．
const fakeFetch = (answers: object, requests: unknown[]) => async (_url: string, init?: RequestInit) => {
  requests.push(JSON.parse(String(init?.body)));
  return Response.json({ model: "tev1:0.8b", answers, usage: { input_tokens: 150, output_tokens: 0 } });
};

// 本物と同じアダプタに，偽のfetchを持つクライアントを渡す．
const engineWith = (departmentConfidence = 0.318, requests: unknown[] = []) =>
  createSystemOneEngine(
    new TypeSafeClient({
      baseURL: "http://ollama.test",
      apiKey: "test",
      fetch: fakeFetch(answersWith(departmentConfidence), requests),
    }),
  );

const usage = [
  'usage: triage [--min-confidence <0-1>] "<subject>" "<body>"',
  "       triage batch [--min-confidence <0-1>] <file>",
  "       triage eval [--min-confidence <0-1> | --sweep] [--out <file>] <file>",
  "       triage report [--min-confidence <0-1>] [--calibration] <file>",
  "       triage compare [--min-confidence <0-1>] <file A> <file B>",
  "       triage serve [--min-confidence <0-1>] [--port <0-65535>]",
].join("\n");

describe("run", () => {
  test("件名と本文を判断エンジンに送り，担当部署・緊急度・返金の判定を表示する", async () => {
    const requests: unknown[] = [];

    const result = await run(["Refund not received", "Where is my refund?"], engineWith(0.318, requests));

    expect(result).toEqual({
      code: 0,
      output: "department: billing (0.73)\nurgency: somewhat urgent (1.4)\nrefund: yes (0.86)",
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ state: { subject: "Refund not received", body: "Where is my refund?" } });
  });

  test("部署の確信度が既定のしきい値を下回れば，部署の行に印を付ける", async () => {
    const result = await run(["Refund not received", "Where is my refund?"], engineWith(0.1));

    expect(result.output.split("\n")[0]).toBe("department: billing (0.73) -> needs review");
  });

  test("--min-confidenceで，しきい値を変える", async () => {
    const result = await run(
      ["--min-confidence", "0.5", "Refund not received", "Where is my refund?"],
      engineWith(0.318),
    );

    expect(result.output.split("\n")[0]).toBe("department: billing (0.73) -> needs review");
  });

  test("--min-confidenceが0から1の数でなければ，判断エンジンへ送らずに使い方を表示する", async () => {
    const requests: unknown[] = [];

    for (const value of ["abc", "1.5", "-0.1"]) {
      const result = await run(["--min-confidence", value, "Refund", "Where?"], engineWith(0.318, requests));
      expect(result).toEqual({ code: 2, output: usage });
    }
    expect(requests).toEqual([]);
  });

  test("知らないオプションがあれば，使い方を表示する", async () => {
    const result = await run(["--verbose", "Refund", "Where?"], engineWith());

    expect(result).toEqual({ code: 2, output: usage });
  });

  test("件名と本文がそろっていなければ，判断エンジンへ送らずに使い方を表示する", async () => {
    const requests: unknown[] = [];

    const result = await run(["Refund not received"], engineWith(0.318, requests));

    expect(result).toEqual({ code: 2, output: usage });
    expect(requests).toEqual([]);
  });
});
