// 振り分けの結果の表示．

import type { Summary } from "./batch.ts";
import type { ConfusionMatrix, Evaluation } from "./evaluate.ts";
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
// 発展(演習7-7)：各行の右に，その行の対角線の件数を行の合計で割った再現率を表示する．行の合計が0ならn/aとする
// export const formatConfusionMatrix = (matrix: ConfusionMatrix): string => {
//   const labels = Object.keys(matrix);
//   const header = [
//     "actual \\ predicted".padEnd(18),
//     ...labels.map((label) => label.padStart(10)),
//     "recall".padStart(10),
//   ].join("");
//   const rows = labels.map((label) => {
//     const row = matrix[label] ?? {};
//     const total = Object.values(row).reduce((sum, count) => sum + count, 0);
//     const recall = total === 0 ? undefined : (row[label] ?? 0) / total;
//     return [
//       label.padEnd(18),
//       ...labels.map((predicted) => String(row[predicted] ?? 0).padStart(10)),
//       formatRate(recall).padStart(10),
//     ].join("");
//   });
//   return [header, ...rows].join("\n");
// };
// 発展(演習7-7)ここまで．次の8行の代わりに使う
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
