// 振り分けの結果の表示．

import type { Summary } from "./batch.ts";
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
