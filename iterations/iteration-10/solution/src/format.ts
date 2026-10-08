// 振り分けの結果の表示．

import type { Summary } from "./batch.ts";
import type { ConfusionMatrix, Evaluation } from "./evaluate.ts";
import type { Comparison } from "./compare.ts";
import type { CalibrationBin, Report } from "./metrics.ts";
import { type Triage, urgencyLevels } from "./triage.ts";

/**
 * 担当部署と，その確率を`department: billing (0.94)`のような1行にする．
 * 人の確認に回すなら，末尾に` -> needs review`を付ける．
 */
export const formatDepartment = (department: string, probability: number, needsReview: boolean): string =>
  `department: ${department} (${probability.toFixed(2)})${needsReview ? " -> needs review" : ""}`;

/** 緊急度の期待値(0から3)を，`urgency: urgent (2.4)`のような1行にする．段階は，期待値にもっとも近いものにする． */
export const formatUrgency = (score: number): string => {
  const level = urgencyLevels[Math.round(score)];
  return `urgency: ${level} (${score.toFixed(1)})`;
};

/** 返金を求めている確率(0から1)を，`refund: yes (0.89)`のような1行にする． */
export const formatRefund = (probability: number): string => {
  const answer = probability >= 0.5 ? "yes" : "no";
  return `refund: ${answer} (${probability.toFixed(2)})`;
};

/** 振り分けの結果を，1項目1行の文字列にする． */
export const formatTriage = (triage: Triage): string =>
  [
    formatDepartment(triage.department, triage.departmentProbability, triage.needsReview),
    formatUrgency(triage.urgency),
    formatRefund(triage.refundProbability),
  ].join("\n");

/** まとめて振り分けた結果の集計を，`billing: 5, support: 7, sales: 1, needs review: 8`のような1行にする． */
export const formatSummary = (summary: Summary): string =>
  [
    ...Object.entries(summary.departments).map(([department, count]) => `${department}: ${count}`),
    `needs review: ${summary.needsReview}`,
  ].join(", ");

const formatRate = (rate: number | undefined): string => (rate === undefined ? "n/a" : rate.toFixed(2));

/** 評価を，`accuracy: 0.86 (auto-routed 7 / 30), review rate: 0.77`のような1行にする． */
export const formatEvaluation = (evaluation: Evaluation): string =>
  `accuracy: ${formatRate(evaluation.accuracy)} (auto-routed ${evaluation.autoRouted} / ${evaluation.total}), ` +
  `review rate: ${formatRate(evaluation.reviewRate)}`;

/** 混同行列を，行が正解の部署，列が判定した部署の表にする． */
export const formatConfusionMatrix = (matrix: ConfusionMatrix): string => {
  const labels = Object.keys(matrix);
  const header = ["actual \\ predicted".padEnd(18), ...labels.map((label) => label.padStart(10))].join("");
  const rows = labels.map((label) =>
    [label.padEnd(18), ...labels.map((predicted) => String(matrix[label]?.[predicted] ?? 0).padStart(10))].join(""),
  );
  return [header, ...rows].join("\n");
};

/** しきい値ごとの評価を表にする． */
export const formatSweep = (evaluations: readonly Evaluation[]): string => {
  const header = "min-confidence  auto-routed  accuracy  review rate";
  const rows = evaluations.map((e) =>
    [
      e.minConfidence.toFixed(1).padEnd(14),
      String(e.autoRouted).padStart(13),
      formatRate(e.accuracy).padStart(10),
      formatRate(e.reviewRate).padStart(13),
    ].join(""),
  );
  return [header, ...rows].join("\n");
};

const formatNumber = (value: number | undefined, digits: number): string =>
  value === undefined ? "n/a" : value.toFixed(digits);

const formatMs = (value: number | undefined): string => (value === undefined ? "n/a" : `${Math.round(value)} ms`);

/** 記録から計算した指標を，部署・返金・緊急度・所要時間の順に表示する． */
export const formatReport = (report: Report): string => {
  const departments = Object.entries(report.departments).map(([name, { precision, recall }]) =>
    [name.padEnd(10), formatRate(precision).padStart(11), formatRate(recall).padStart(8)].join(""),
  );
  return [
    formatEvaluation(report.evaluation),
    "",
    "department  precision  recall",
    ...departments,
    "",
    `refund accuracy: ${formatRate(report.refund.accuracy)}, brier score: ${formatNumber(report.refund.brierScore, 3)}`,
    `urgency mean absolute error: ${formatNumber(report.urgencyError, 2)}`,
    `latency median: ${formatMs(report.latency.median)}, p95: ${formatMs(report.latency.p95)}`,
  ].join("\n");
};

/** 確信度の区間ごとの件数・確信度の平均・正解率を表にする． */
export const formatCalibration = (bins: readonly CalibrationBin[]): string => {
  const header = "confidence  tickets  mean confidence  accuracy";
  const rows = bins.map((bin) =>
    [
      `${bin.lower.toFixed(1)}-${bin.upper.toFixed(1)}`.padEnd(10),
      String(bin.count).padStart(9),
      formatRate(bin.meanConfidence).padStart(17),
      formatRate(bin.accuracy).padStart(10),
    ].join(""),
  );
  return [header, ...rows].join("\n");
};

/** 2つの記録の指標を並べ，部署の判定が食い違った問い合わせと，片方だけが正解した件数を表示する． */
export const formatComparison = (
  files: { a: string; b: string },
  a: Report,
  b: Report,
  comparison: Comparison,
): string => {
  const metric = (name: string, valueA: string, valueB: string): string =>
    [name.padEnd(28), valueA.padStart(8), valueB.padStart(8)].join("");
  const ms = (value: number | undefined): string => (value === undefined ? "n/a" : String(Math.round(value)));
  const differences = comparison.differences.map((d) =>
    [d.subject.padEnd(24), d.actual.padEnd(10), d.a.padEnd(10), d.b].join(""),
  );
  return [
    `A: ${files.a}`,
    `B: ${files.b}`,
    "",
    metric("metric", "A", "B"),
    metric("accuracy", formatRate(a.evaluation.accuracy), formatRate(b.evaluation.accuracy)),
    metric("review rate", formatRate(a.evaluation.reviewRate), formatRate(b.evaluation.reviewRate)),
    metric("refund accuracy", formatRate(a.refund.accuracy), formatRate(b.refund.accuracy)),
    metric("refund brier score", formatNumber(a.refund.brierScore, 3), formatNumber(b.refund.brierScore, 3)),
    metric("urgency mean absolute error", formatNumber(a.urgencyError, 2), formatNumber(b.urgencyError, 2)),
    metric("latency median (ms)", ms(a.latency.median), ms(b.latency.median)),
    metric("latency p95 (ms)", ms(a.latency.p95), ms(b.latency.p95)),
    "",
    `department differs: ${comparison.differences.length}`,
    ...(differences.length === 0
      ? []
      : [["subject".padEnd(24), "actual".padEnd(10), "A".padEnd(10), "B"].join(""), ...differences]),
    `only A correct: ${comparison.onlyA}, only B correct: ${comparison.onlyB}`,
  ].join("\n");
};
