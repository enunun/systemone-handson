import { describe, expect, test } from "vitest";
import { confusionMatrix, evaluate, parseLabeledTickets, sweep } from "../../src/evaluate.ts";

// 正解の部署と，判定した部署・確信度の組．
const pair = (label: string, department: string, departmentConfidence: number) => ({
  label,
  result: {
    department,
    departmentProbability: 0.5,
    departmentConfidence,
    needsReview: false,
    urgency: 1,
    refundProbability: 0.1,
  },
});

const pairs = [
  pair("billing", "billing", 0.8),
  pair("billing", "support", 0.3),
  pair("support", "support", 0.5),
  pair("sales", "billing", 0.05),
  pair("sales", "sales", 0.02),
];

describe("parseLabeledTickets", () => {
  test("問い合わせと正解の部署を読む", () => {
    const text = '{"subject": "A", "body": "a", "department": "billing"}\n';

    expect(parseLabeledTickets(text)).toEqual({
      tickets: [{ subject: "A", body: "a", department: "billing" }],
      errors: [],
    });
  });

  test("正解の部署がない行や，知らない部署の行は，行番号とともに知らせて飛ばす", () => {
    const text = '{"subject": "A", "body": "a"}\n{"subject": "B", "body": "b", "department": "hr"}';

    expect(parseLabeledTickets(text).errors).toEqual([
      "line 1: skipped (not a JSON object with subject, body and a known department)",
      "line 2: skipped (not a JSON object with subject, body and a known department)",
    ]);
  });
});

describe("evaluate", () => {
  test("しきい値以上の確信度のものを自動で振り分けたとして，件数・正解率・人の確認に回る割合を求める", () => {
    expect(evaluate(pairs, 0.2)).toEqual({
      minConfidence: 0.2,
      total: 5,
      autoRouted: 3,
      correct: 2,
      accuracy: 2 / 3,
      reviewRate: 2 / 5,
    });
  });

  test("しきい値が0なら，すべてを自動で振り分ける", () => {
    expect(evaluate(pairs, 0)).toMatchObject({ autoRouted: 5, correct: 3, accuracy: 3 / 5, reviewRate: 0 });
  });

  test("自動で振り分けたものがなければ，正解率はundefinedにする", () => {
    expect(evaluate(pairs, 0.9)).toMatchObject({ autoRouted: 0, correct: 0, accuracy: undefined, reviewRate: 1 });
  });
});

describe("confusionMatrix", () => {
  test("正解の部署ごとに，判定した部署の件数を数える(人の確認に回したものも含める)", () => {
    expect(confusionMatrix(pairs)).toEqual({
      billing: { billing: 1, support: 1, sales: 0 },
      support: { billing: 0, support: 1, sales: 0 },
      sales: { billing: 1, support: 0, sales: 1 },
    });
  });
});

describe("sweep", () => {
  test("しきい値を0から1まで0.1刻みで変えて評価する", () => {
    const rows = sweep(pairs);

    expect(rows.map((row) => row.minConfidence)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
    expect(rows[2]).toEqual(evaluate(pairs, 0.2));
  });
});
