import { TypeSafeClient } from "@typesafe-ai/sdk";
import { describe, expect, test } from "vitest";
import { createSystemOneEngine } from "../../../src/adapters/systemone-engine.ts";

// 判断エンジンの代わりに，決まった答えを返すfetch．受け取ったリクエストの本文をrequestsに記録する．
const fakeFetch = (answers: object, requests: unknown[]) => async (_url: string, init?: RequestInit) => {
  requests.push(JSON.parse(String(init?.body)));
  return Response.json({ model: "laya", answers, usage: { input_tokens: 120, output_tokens: 0 } });
};

const engineWith = (answers: object, requests: unknown[] = []) =>
  createSystemOneEngine(
    new TypeSafeClient({ baseURL: "http://laya.test", apiKey: "test", fetch: fakeFetch(answers, requests) }),
  );

describe("createSystemOneEngine", () => {
  test("アプリの質問を，/v1/systemoneの質問にして1回で送る", async () => {
    const requests: unknown[] = [];
    const answers = {
      team: { type: "choice", choice: "a", confidence: 1, probabilities: { a: 1, b: 0 } },
      size: { type: "score", score: 0, confidence: 1, legend: {}, probabilities: { 0: 1, 1: 0 } },
      angry: { type: "noul", noul: 0 },
    };

    await engineWith(answers, requests).decide(
      { subject: "Hi" },
      {
        team: { kind: "choice", prompt: "Which team?", options: { a: "team A", b: "team B" } },
        size: { kind: "scale", prompt: "How large?", levels: ["small", "large"] },
        angry: { kind: "yesno", prompt: "Angry?" },
      },
    );

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      state: { subject: "Hi" },
      questions: {
        team: { type: "choice", instructions: "Which team?", criteria: { a: "team A", b: "team B" } },
        size: { type: "score", instructions: "How large?", criteria: ["small", "large"] },
        angry: { type: "noul", instructions: "Angry?" },
      },
    });
  });

  test("答えを，質問の種類ごとのアプリの答えにする", async () => {
    const answers = {
      team: { type: "choice", choice: "b", confidence: 0.4, probabilities: { a: 0.2, b: 0.8 } },
      size: { type: "score", score: 1.6, confidence: 0.3, legend: {}, probabilities: { 0: 0.1, 1: 0.2, 2: 0.7 } },
      angry: { type: "noul", noul: 0.9 },
    };

    const result = await engineWith(answers).decide(
      { subject: "Hi" },
      {
        team: { kind: "choice", prompt: "Which team?", options: { a: "team A", b: "team B" } },
        size: { kind: "scale", prompt: "How large?", levels: ["small", "medium", "large"] },
        angry: { kind: "yesno", prompt: "Angry?" },
      },
    );

    expect(result).toEqual({
      team: { kind: "choice", value: "b", probability: 0.8, confidence: 0.4, probabilities: { a: 0.2, b: 0.8 } },
      size: { kind: "scale", value: 1.6, confidence: 0.3, probabilities: [0.1, 0.2, 0.7] },
      angry: { kind: "yesno", probability: 0.9 },
    });
  });
});
