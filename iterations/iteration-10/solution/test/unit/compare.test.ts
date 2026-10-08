import { describe, expect, test } from "vitest";
import { compareRecords } from "../../src/compare.ts";
import type { EvalRecord } from "../../src/records.ts";

// 件名・正解の部署・判定した部署から記録を作る．
const record = (subject: string, label: string, predicted: string): EvalRecord => ({
  ticket: { subject, body: subject.toLowerCase(), department: label, refund: false, urgency: 0 },
  result: {
    department: predicted,
    departmentProbability: 0.6,
    departmentConfidence: 0.5,
    needsReview: false,
    urgency: 0,
    refundProbability: 0,
  },
  elapsedMs: 100,
});

describe("compareRecords", () => {
  test("部署の判定が食い違った問い合わせと，片方だけが正解した件数を求める", () => {
    const a = [
      record("A", "billing", "billing"),
      record("B", "sales", "support"),
      record("C", "sales", "billing"),
      record("D", "support", "support"),
    ];
    const b = [
      record("A", "billing", "support"),
      record("B", "sales", "sales"),
      record("C", "sales", "support"),
      record("D", "support", "support"),
    ];

    expect(compareRecords(a, b)).toEqual({
      ok: true,
      comparison: {
        differences: [
          { subject: "A", actual: "billing", a: "billing", b: "support" },
          { subject: "B", actual: "sales", a: "support", b: "sales" },
          { subject: "C", actual: "sales", a: "billing", b: "support" },
        ],
        onlyA: 1,
        onlyB: 1,
      },
    });
  });

  test("件数か，同じ位置の件名と本文が違えば，同じデータの記録ではないとメッセージを返す", () => {
    const message = { ok: false, message: "the records are not from the same tickets" };

    expect(compareRecords([record("A", "billing", "billing")], [])).toEqual(message);
    expect(compareRecords([record("A", "billing", "billing")], [record("B", "billing", "billing")])).toEqual(message);
  });
});
