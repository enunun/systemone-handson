// 正解の付いた問い合わせで，振り分けの精度を測る．

import { isTicket, parseJsonLines } from "./batch.ts";
import { departmentNames, type Ticket, type Triage, urgencyLevels } from "./triage.ts";

/** 正解の付いた問い合わせ．部署・返金の要否・緊急度の段階の正解を持つ． */
export interface LabeledTicket extends Ticket {
  department: string;
  /** 返金を求めているか． */
  refund: boolean;
  /** 緊急度の段階(0から3の整数)．段階の番号はurgencyLevelsの添字である． */
  urgency: number;
}

/** 正解の部署と，振り分けの結果の組． */
export interface LabeledResult {
  label: string;
  result: Triage;
}

/** あるしきい値での評価． */
export interface Evaluation {
  minConfidence: number;
  /** 問い合わせの件数． */
  total: number;
  /** 自動で振り分けた(確信度がしきい値以上の)件数． */
  autoRouted: number;
  /** 自動で振り分けたもののうち，部署が正解だった件数． */
  correct: number;
  /** correct / autoRouted．自動で振り分けたものがなければundefined． */
  accuracy: number | undefined;
  /** 人の確認に回る割合((total - autoRouted) / total)． */
  reviewRate: number;
}

/** 正解の部署ごとに，判定した部署の件数を数えた表． */
export type ConfusionMatrix = Record<string, Record<string, number>>;

/** JSONの値を，正解の付いた問い合わせとして読む．読めなければundefinedを返す． */
export const readLabeledTicket = (value: unknown): LabeledTicket | undefined => {
  if (!isTicket(value)) return undefined;
  const { department, refund, urgency } = value as unknown as Record<string, unknown>;
  if (typeof department !== "string" || !departmentNames.includes(department)) return undefined;
  if (typeof refund !== "boolean") return undefined;
  if (!Number.isInteger(urgency) || (urgency as number) < 0 || (urgency as number) >= urgencyLevels.length) {
    return undefined;
  }
  return { subject: value.subject, body: value.body, department, refund, urgency: urgency as number };
};

/**
 * JSON Linesの文字列から，正解の付いた問い合わせを読む．
 * 部署はdepartmentNamesのどれか，refundは真偽値，urgencyは0から3の整数でなければならない．
 */
export const parseLabeledTickets = (text: string): { tickets: LabeledTicket[]; errors: string[] } => {
  const { items, errors } = parseJsonLines(text, readLabeledTicket, "subject, body and labels");
  return { tickets: items, errors };
};

/** 確信度がminConfidence以上のものを自動で振り分けたとして，評価する． */
export const evaluate = (results: readonly LabeledResult[], minConfidence: number): Evaluation => {
  const routed = results.filter(({ result }) => result.departmentConfidence >= minConfidence);
  const correct = routed.filter(({ label, result }) => result.department === label).length;
  return {
    minConfidence,
    total: results.length,
    autoRouted: routed.length,
    correct,
    accuracy: routed.length === 0 ? undefined : correct / routed.length,
    reviewRate: results.length === 0 ? 0 : (results.length - routed.length) / results.length,
  };
};

/** 正解の部署ごとに，判定した部署の件数を数える．人の確認に回すものも含める． */
export const confusionMatrix = (results: readonly LabeledResult[]): ConfusionMatrix => {
  const matrix: ConfusionMatrix = Object.fromEntries(
    departmentNames.map((label) => [label, Object.fromEntries(departmentNames.map((name) => [name, 0]))]),
  );
  for (const { label, result } of results) {
    const row = matrix[label];
    if (row !== undefined) row[result.department] = (row[result.department] ?? 0) + 1;
  }
  return matrix;
};

/** しきい値を0から1まで0.1刻みで変えて評価する． */
export const sweep = (results: readonly LabeledResult[]): Evaluation[] =>
  Array.from({ length: 11 }, (_, i) => evaluate(results, i / 10));
