import { describe, expect, test } from "vitest";
import { evaluate } from "../../src/evaluate.ts";
import {
  buildReport,
  calibration,
  // 発展(演習10-7)：期待較正誤差
  // expectedCalibrationError,
  // 発展(演習10-7)ここまで
  meanAbsoluteError,
  percentile,
  precisionRecall,
  refundMetrics,
} from "../../src/metrics.ts";
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

describe("calibration", () => {
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

  test("確信度を0.2刻みの5つの区間に分け，区間ごとの件数・確信度の平均・正解率を求める", () => {
    const bins = calibration([
      pair("billing", "support", 0.1),
      pair("billing", "billing", 0.3),
      pair("sales", "support", 0.3),
      pair("support", "support", 0.9),
    ]);

    expect(bins.map(({ lower, upper, count }) => [lower, upper, count])).toEqual([
      [0, 0.2, 1],
      [0.2, 0.4, 2],
      [0.4, 0.6, 0],
      [0.6, 0.8, 0],
      [0.8, 1, 1],
    ]);
    expect(bins[1]).toMatchObject({ meanConfidence: 0.3, accuracy: 1 / 2 });
    expect(bins[0]).toMatchObject({ meanConfidence: 0.1, accuracy: 0 });
  });

  test("区間の下端ちょうどはその区間に，確信度1は最後の区間に入れる", () => {
    const counts = calibration([pair("billing", "billing", 0.2), pair("billing", "billing", 1)]).map((b) => b.count);

    expect(counts).toEqual([0, 1, 0, 0, 1]);
  });

  test("記録のない区間は，確信度の平均と正解率をundefinedにする", () => {
    expect(calibration([])[0]).toEqual({
      lower: 0,
      upper: 0.2,
      count: 0,
      meanConfidence: undefined,
      accuracy: undefined,
    });
  });
});
// 発展(演習10-7)：期待較正誤差
//
// describe("expectedCalibrationError", () => {
//   test("区間ごとの確信度の平均と正解率の差を，件数の割合で重み付けして足す", () => {
//     const bins = [
//       { lower: 0, upper: 0.5, count: 1, meanConfidence: 0.1, accuracy: 0 },
//       { lower: 0.5, upper: 1, count: 3, meanConfidence: 0.9, accuracy: 2 / 3 },
//     ];
//
//     expect(expectedCalibrationError(bins)).toBeCloseTo((1 / 4) * 0.1 + (3 / 4) * (0.9 - 2 / 3));
//   });
//
//   test("記録がなければundefinedを返す", () => {
//     expect(expectedCalibrationError([{ lower: 0, upper: 1, count: 0, meanConfidence: undefined, accuracy: undefined }])).toBe(
//       undefined,
//     );
//   });
// });
// 発展(演習10-7)ここまで
