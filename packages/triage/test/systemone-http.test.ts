import assert from "node:assert/strict";
import { test } from "node:test";
import { SystemOneHttpEngine } from "../src/adapters/systemone-http.ts";

interface Captured {
  url: string;
  headers: Headers;
  body: Record<string, unknown>;
}

// 通信を差し替え，送ったリクエストを記録して，Jevの形の回答を返す．
const fakeServer = (captured: Captured[]) => async (input: string, init?: RequestInit) => {
  captured.push({
    url: input,
    headers: new Headers(init?.headers),
    body: JSON.parse(String(init?.body)) as Record<string, unknown>,
  });
  return Response.json({
    model: "laya",
    answers: {
      team: { type: "choice", choice: "billing", confidence: 0.7, probabilities: { billing: 0.8, support: 0.2 } },
      urgency: {
        type: "score",
        score: 1.5,
        confidence: 0.4,
        legend: { 0: "low", 1: "mid", 2: "high" },
        probabilities: { 0: 0.1, 1: 0.3, 2: 0.6 },
      },
      refund: { type: "noul", noul: 0.9 },
    },
    usage: { input_tokens: 42, output_tokens: 0 },
  });
};

const questions = {
  team: { kind: "choice", prompt: "Which team?", options: { billing: "money", support: "help" } },
  urgency: { kind: "scale", prompt: "How urgent?", levels: ["low", "mid", "high"] },
  refund: { kind: "yesno", prompt: "Refund?" },
} as const;

test("アプリの質問を，Jevの/v1/systemoneのリクエストにして送る", async () => {
  const captured: Captured[] = [];
  const engine = new SystemOneHttpEngine({
    baseURL: "http://laya:8080",
    apiKey: "local",
    model: "laya",
    fetch: fakeServer(captured),
  });

  await engine.decide({ subject: "hi" }, questions);

  const [req] = captured;
  assert.ok(req);
  assert.equal(req.url, "http://laya:8080/v1/systemone");
  assert.equal(req.headers.get("authorization"), "Bearer local");
  assert.deepEqual(req.body, {
    model: "laya",
    state: { subject: "hi" },
    questions: {
      team: { type: "choice", instructions: "Which team?", criteria: { billing: "money", support: "help" } },
      urgency: { type: "score", instructions: "How urgent?", criteria: ["low", "mid", "high"] },
      refund: { type: "noul", instructions: "Refund?" },
    },
  });
});

test("Jevの回答を，アプリの回答の形にする", async () => {
  const engine = new SystemOneHttpEngine({
    baseURL: "https://api.typesafe.ai",
    apiKey: "secret",
    model: "jev-latest",
    fetch: fakeServer([]),
  });

  const answers = await engine.decide("text", questions);

  assert.deepEqual(answers, {
    team: { kind: "choice", value: "billing", confidence: 0.7, probabilities: { billing: 0.8, support: 0.2 } },
    urgency: { kind: "scale", value: 1.5, confidence: 0.4, probabilities: [0.1, 0.3, 0.6] },
    refund: { kind: "yesno", probability: 0.9 },
  });
});
