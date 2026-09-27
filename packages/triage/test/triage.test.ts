import assert from "node:assert/strict";
import { test } from "node:test";
import { FakeEngine } from "../src/adapters/fake.ts";
import { triage } from "../src/domain/triage.ts";

const ticket = { subject: "Refund not received", body: "I cancelled two weeks ago and still have no refund." };

test("モデルの答えを，振り分けの結果にまとめる", async () => {
  const engine = new FakeEngine((name) => {
    switch (name) {
      case "department":
        return { kind: "choice", value: "billing", confidence: 0.8, probabilities: { billing: 0.9, support: 0.05, sales: 0.05 } };
      case "urgency":
        return { kind: "scale", value: 2.4, confidence: 0.6, probabilities: [0, 0.1, 0.4, 0.5] };
      case "refund":
        return { kind: "yesno", probability: 0.93 };
    }
  });

  const result = await triage(engine, ticket);

  assert.equal(result.department, "billing");
  assert.equal(result.urgencyLabel, "urgent");
  assert.equal(result.refundRequested, true);
  assert.equal(result.needsHumanReview, false);
});

test("部署の判断に迷いがあるときは，人の確認に回す", async () => {
  const engine = new FakeEngine((name) =>
    name === "department"
      ? { kind: "choice", value: "support", confidence: 0.2, probabilities: { billing: 0.35, support: 0.4, sales: 0.25 } }
      : undefined,
  );

  const result = await triage(engine, ticket, { minConfidence: 0.5 });

  assert.equal(result.department, "support");
  assert.equal(result.needsHumanReview, true);
});
