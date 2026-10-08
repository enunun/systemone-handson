// 評価の記録から，指標を計算する．

import { evaluate, type Evaluation, type LabeledResult } from "./evaluate.ts";
import { type EvalRecord, toLabeledResults } from "./records.ts";
import { departmentNames } from "./triage.ts";

/** ある部署の適合率と再現率．割る数が0ならundefinedにする． */
export interface PrecisionRecall {
  /** その部署と判定したもののうち，正解もその部署だった割合． */
  precision: number | undefined;
  /** 正解がその部署のもののうち，その部署と判定した割合． */
  recall: number | undefined;
  // 発展(演習9-7)：適合率と再現率の調和平均(F1)
  // /** 適合率と再現率の調和平均．どちらかを求められないか，どちらも0ならundefinedにする． */
  // f1: number | undefined;
  // 発展(演習9-7)ここまで
}

/** 返金の判定の指標． */
export interface RefundMetrics {
  /** 確率0.5以上を「返金を求めている」としたときの正解率． */
  accuracy: number | undefined;
  /** 確率と正解(1か0)の差の2乗の平均．0に近いほどよい． */
  brierScore: number | undefined;
}

/** 記録から計算した指標をまとめたもの． */
export interface Report {
  evaluation: Evaluation;
  departments: Record<string, PrecisionRecall>;
  refund: RefundMetrics;
  /** 緊急度の期待値と，正解の段階の差の絶対値の平均． */
  urgencyError: number | undefined;
  latency: { median: number | undefined; p95: number | undefined };
}

const ratio = (part: number, whole: number): number | undefined => (whole === 0 ? undefined : part / whole);

const mean = (values: readonly number[]): number | undefined =>
  ratio(
    values.reduce((sum, value) => sum + value, 0),
    values.length,
  );

/** 部署ごとに，適合率と再現率を求める．人の確認に回すものも含める． */
export const precisionRecall = (results: readonly LabeledResult[]): Record<string, PrecisionRecall> =>
  Object.fromEntries(
    departmentNames.map((name) => {
      const predicted = results.filter(({ result }) => result.department === name);
      const actual = results.filter(({ label }) => label === name);
      const correct = predicted.filter(({ label }) => label === name).length;
      // 発展(演習9-7)：F1も求める
      // const precision = ratio(correct, predicted.length);
      // const recall = ratio(correct, actual.length);
      // const f1 =
      //   precision === undefined || recall === undefined ? undefined : ratio(2 * precision * recall, precision + recall);
      // return [name, { precision, recall, f1 }];
      // 発展(演習9-7)ここまで．次の1行の代わりに使う
      return [name, { precision: ratio(correct, predicted.length), recall: ratio(correct, actual.length) }];
    }),
  );

/** 返金の判定の正解率とBrierスコアを求める． */
export const refundMetrics = (records: readonly EvalRecord[]): RefundMetrics => ({
  accuracy: ratio(
    records.filter(({ ticket, result }) => result.refundProbability >= 0.5 === ticket.refund).length,
    records.length,
  ),
  brierScore: mean(records.map(({ ticket, result }) => (result.refundProbability - (ticket.refund ? 1 : 0)) ** 2)),
});

/** 緊急度の期待値と，正解の段階の差の絶対値の平均を求める． */
export const meanAbsoluteError = (records: readonly EvalRecord[]): number | undefined =>
  mean(records.map(({ ticket, result }) => Math.abs(result.urgency - ticket.urgency)));

/** 値を小さい順に並べ，p%(0から100)の位置にある値を返す(最近順位法)．値がなければundefinedを返す． */
export const percentile = (values: readonly number[], p: number): number | undefined => {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.max(Math.ceil((p / 100) * sorted.length) - 1, 0)];
};

/** 記録から指標をまとめて計算する．部署の正解率は，minConfidenceをしきい値として求める． */
export const buildReport = (records: readonly EvalRecord[], minConfidence: number): Report => {
  const results = toLabeledResults(records);
  const elapsed = records.map(({ elapsedMs }) => elapsedMs);
  return {
    evaluation: evaluate(results, minConfidence),
    departments: precisionRecall(results),
    refund: refundMetrics(records),
    urgencyError: meanAbsoluteError(records),
    latency: { median: percentile(elapsed, 50), p95: percentile(elapsed, 95) },
  };
};
