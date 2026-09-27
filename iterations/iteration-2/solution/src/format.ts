// 振り分けの結果の表示．

import { type Triage, urgencyLevels } from "./triage.ts";

/** 担当部署と，その確率を`department: billing (0.94)`のような1行にする． */
export const formatDepartment = (department: string, probability: number): string =>
  `department: ${department} (${probability.toFixed(2)})`;

/** 緊急度の期待値(0から3)を，`urgency: urgent (2.4)`のような1行にする．段階は，期待値にもっとも近いものにする． */
// 発展(演習2-7)：もっとも確率の高い段階の名前を添える
// export const formatUrgency = (score: number, mostLikely: number): string => {
//   const level = urgencyLevels[Math.round(score)];
//   return `urgency: ${level} (${score.toFixed(1)}, most likely: ${urgencyLevels[mostLikely]})`;
// };
// 発展(演習2-7)ここまで．次の4行の代わりに使う
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
    formatDepartment(triage.department, triage.departmentProbability),
    // 発展(演習2-7)：もっとも確率の高い段階も渡す
    // formatUrgency(triage.urgency, triage.urgencyMostLikely),
    // 発展(演習2-7)ここまで．次の1行の代わりに使う
    formatUrgency(triage.urgency),
    formatRefund(triage.refundProbability),
  ].join("\n");
