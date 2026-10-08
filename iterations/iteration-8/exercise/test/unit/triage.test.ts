import { describe, expect, test } from "vitest";
import { createFakeEngine } from "../../src/adapters/fake-engine.ts";
import type { Answer } from "../../src/ports/decision-engine.ts";
import { triage } from "../../src/triage.ts";

const answers: Record<string, Answer> = {
  department: {
    kind: "choice",
    value: "support",
    probability: 0.8427,
    confidence: 0.5,
    probabilities: { billing: 0.0745, support: 0.8427, sales: 0.0828 },
  },
  urgency: { kind: "scale", value: 1.6092, confidence: 0.1074, probabilities: [0.1263, 0.2707, 0.4707, 0.1324] },
  refund: { kind: "yesno", probability: 0.08 },
};

const ticket = { subject: "Login problem", body: "I cannot log in since yesterday." };

describe("triage", () => {
  test("問い合わせと3つの質問を，判断エンジンに1回で尋ねる", async () => {
    const engine = createFakeEngine(answers);

    await triage(engine, ticket);

    expect(engine.calls).toHaveLength(1);
    expect(engine.calls[0]).toMatchObject({
      state: { subject: "Login problem", body: "I cannot log in since yesterday." },
      questions: {
        department: {
          kind: "choice",
          prompt: "Which team should handle this ticket?",
          options: {
            billing: "payments, refunds, invoices and charges",
            support: "product help, bugs and how-to questions",
            sales: "new purchases, pricing and plan upgrades",
          },
        },
        urgency: {
          kind: "scale",
          prompt: "How urgent is this ticket?",
          levels: ["not urgent", "somewhat urgent", "urgent", "critical"],
        },
        refund: { kind: "yesno", prompt: "Is the customer asking for a refund?" },
      },
    });
  });

  test("答えから，部署とその確率・確信度・緊急度の期待値・返金の確率を取り出す", async () => {
    const result = await triage(createFakeEngine(answers), ticket);

    expect(result).toEqual({
      department: "support",
      departmentProbability: 0.8427,
      departmentConfidence: 0.5,
      needsReview: false,
      urgency: 1.6092,
      refundProbability: 0.08,
    });
  });

  test("部署の確信度がしきい値を下回れば，人の確認に回す", async () => {
    const result = await triage(createFakeEngine(answers), ticket, { minConfidence: 0.6 });

    expect(result.needsReview).toBe(true);
  });

  test("部署の確信度がしきい値ちょうどなら，人の確認に回さない", async () => {
    const result = await triage(createFakeEngine(answers), ticket, { minConfidence: 0.5 });

    expect(result.needsReview).toBe(false);
  });

  test("しきい値を指定しなければ，0.3を使う", async () => {
    const lowConfidence = { ...answers, department: { ...answers.department, confidence: 0.29 } } as Record<
      string,
      Answer
    >;

    const result = await triage(createFakeEngine(lowConfidence), ticket);

    expect(result.needsReview).toBe(true);
  });
});
