import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRequest, RequestError, toResponse } from "../src/translate.ts";

test("Jevのリクエストを，Layaが受け付ける形に変換する", () => {
  const parsed = parseRequest({
    model: "jev-latest",
    state: { subject: "Refund" },
    questions: {
      team: { type: "choice", instructions: null, criteria: { billing: { area: "payments" }, support: null } },
      urgency: { type: "score", instructions: "How urgent?", criteria: ["low", null, "high"] },
      churn: { type: "noul", instructions: "Will they cancel?", criteria: { true: "yes", false: null } },
    },
  });

  assert.deepEqual(parsed.state, { subject: "Refund" });
  assert.deepEqual(parsed.questions.team, {
    type: "choice",
    instructions: "",
    criteria: { billing: '{"area":"payments"}', support: null },
  });
  assert.deepEqual(parsed.questions.urgency, {
    type: "score",
    instructions: "How urgent?",
    criteria: ["low", "1", "high"],
  });
  assert.deepEqual(parsed.questions.churn, {
    type: "noul",
    instructions: "Will they cancel?",
    criteria: { true: "yes" },
  });
});

test("誤ったリクエストは，ステータス付きの例外にする", () => {
  const statusOf = (body: unknown): number => {
    try {
      parseRequest(body);
    } catch (err) {
      assert.ok(err instanceof RequestError);
      return err.status;
    }
    throw new Error("expected RequestError");
  };

  assert.equal(statusOf("text"), 400);
  assert.equal(statusOf({ state: "x", questions: {} }), 422);
  assert.equal(statusOf({ state: "x", questions: { q: { type: "text" } } }), 422);
  assert.equal(statusOf({ state: "x", questions: { q: { type: "score", criteria: ["only"] } } }), 422);
  assert.equal(statusOf({ state: "x", questions: { q: { type: "choice", criteria: ["a", "b"] } } }), 422);
});

test("Layaの回答から，Jevにないフィールドを取り除く", () => {
  const response = toResponse({
    model: "laya",
    answers: {
      team: {
        type: "choice",
        choice: "billing",
        probabilities: { billing: 0.9, support: 0.1 },
        confidence: 0.53,
        rl_agent: { act_probability: 0.9 },
      },
      churn: { type: "noul", noul: 0.2, rl_agent: { act_probability: 0.8 } },
    },
    usage: { input_tokens: 10, output_tokens: 0 },
  });

  assert.deepEqual(response, {
    model: "laya",
    answers: {
      team: { type: "choice", choice: "billing", confidence: 0.53, probabilities: { billing: 0.9, support: 0.1 } },
      churn: { type: "noul", noul: 0.2 },
    },
    usage: { input_tokens: 10, output_tokens: 0 },
  });
});
