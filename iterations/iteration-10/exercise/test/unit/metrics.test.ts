import { describe, expect, test } from "vitest";
import { evaluate } from "../../src/evaluate.ts";
import { buildReport, meanAbsoluteError, percentile, precisionRecall, refundMetrics } from "../../src/metrics.ts";
import { type EvalRecord, toLabeledResults } from "../../src/records.ts";

// 正解と判定した部署，返金の正解と確率，緊急度の正解と期待値，時間から記録を作る．
const record = (
  label: string,
  predicted: string,
  refund: boolean,
  refundProbability: number,
  urgency: number,
  urgencyScore: number,
  elapsedMs: number,
): EvalRecord => ({
  ticket: { subject: "S", body: "b", department: label, refund, urgency },
  result: {
    department: predicted,
    departmentProbability: 0.6,
    departmentConfidence: 0.5,
    needsReview: false,
    urgency: urgencyScore,
    refundProbability,
  },
  elapsedMs,
});

const records = [
  record("billing", "billing", true, 0.9, 2, 1.5, 100),
  record("billing", "support", false, 0.6, 1, 1, 300),
  record("support", "support", false, 0.2, 0, 1, 200),
  record("sales", "support", false, 0.1, 3, 2, 400),
];

describe("precisionRecall", () => {
  test("部署ごとに，判定したもののうちの正解の割合(適合率)と，正解のもののうち判定できた割合(再現率)を求める", () => {
    expect(precisionRecall(toLabeledResults(records))).toEqual({
      billing: { precision: 1, recall: 1 / 2 },
      support: { precision: 1 / 3, recall: 1 },
      sales: { precision: undefined, recall: 0 },
    });
  });
});

describe("refundMetrics", () => {
  test("確率0.5以上を返金ありとした正解率と，確率と正解の差の2乗の平均(Brierスコア)を求める", () => {
    expect(refundMetrics(records)).toEqual({
      accuracy: 3 / 4,
      brierScore: (0.1 ** 2 + 0.6 ** 2 + 0.2 ** 2 + 0.1 ** 2) / 4,
    });
  });

  test("記録がなければ，どちらもundefinedにする", () => {
    expect(refundMetrics([])).toEqual({ accuracy: undefined, brierScore: undefined });
  });
});

describe("meanAbsoluteError", () => {
  test("緊急度の期待値と正解の段階の差の絶対値を平均する", () => {
    expect(meanAbsoluteError(records)).toBe((0.5 + 0 + 1 + 1) / 4);
  });
});

describe("percentile", () => {
  test("小さい順に並べて，p%の位置にある値を返す", () => {
    const values = [400, 100, 300, 200];

    expect(percentile(values, 50)).toBe(200);
    expect(percentile(values, 95)).toBe(400);
    expect(percentile(values, 0)).toBe(100);
  });

  test("値がなければundefinedを返す", () => {
    expect(percentile([], 50)).toBeUndefined();
  });
});

describe("buildReport", () => {
  test("部署の評価・部署ごとの適合率と再現率・返金・緊急度・時間の指標をまとめる", () => {
    expect(buildReport(records, 0.2)).toEqual({
      evaluation: evaluate(toLabeledResults(records), 0.2),
      departments: precisionRecall(toLabeledResults(records)),
      refund: refundMetrics(records),
      urgencyError: meanAbsoluteError(records),
      latency: { median: 200, p95: 400 },
    });
  });
});
