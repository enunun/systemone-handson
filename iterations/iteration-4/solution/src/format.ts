// 振り分けの結果の表示．

import { type Triage, urgencyLevels } from "./triage.ts";

/**
 * 担当部署と，その確率を`department: billing (0.94)`のような1行にする．
 * 人の確認に回すなら，末尾に` -> needs review`を付ける．
 */
// 発展(演習4-7)：確信度を省略できる4つ目の引数で受け取り，渡されたら確率の後ろに表示する
// export const formatDepartment = (
//   department: string,
//   probability: number,
//   needsReview: boolean,
//   confidence?: number,
// ): string => {
//   const detail = confidence === undefined ? "" : `, confidence ${confidence.toFixed(2)}`;
//   return `department: ${department} (${probability.toFixed(2)}${detail})${needsReview ? " -> needs review" : ""}`;
// };
// 発展(演習4-7)ここまで．次の2行の代わりに使う
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
// 発展(演習4-7)：showConfidenceが真なら，部署の行に確信度を表示する
// export const formatTriage = (triage: Triage, showConfidence = false): string =>
// 発展(演習4-7)ここまで．次の1行の代わりに使う
export const formatTriage = (triage: Triage): string =>
  [
    // 発展(演習4-7)：showConfidenceが真なら，確信度を渡す
    // formatDepartment(
    //   triage.department,
    //   triage.departmentProbability,
    //   triage.needsReview,
    //   showConfidence ? triage.departmentConfidence : undefined,
    // ),
    // 発展(演習4-7)ここまで．次の1行の代わりに使う
    formatDepartment(triage.department, triage.departmentProbability, triage.needsReview),
    formatUrgency(triage.urgency),
    formatRefund(triage.refundProbability),
  ].join("\n");
