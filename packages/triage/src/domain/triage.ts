// 問い合わせの振り分け．担当部署，緊急度，返金の要否をまとめて判断する．
// 判断はDecisionEngineに任せ，ここでは質問の組み立てと，答えの解釈(確信度が低いときは人に回すなど)だけを書く．

import type { DecisionEngine } from "../ports/decision-engine.ts";

export interface Ticket {
  subject: string;
  body: string;
}

export const DEPARTMENTS = {
  billing: "payments, refunds, invoices and charges",
  support: "product help, bugs and how-to questions",
  sales: "new purchases, pricing and plan upgrades",
} as const;

export type Department = keyof typeof DEPARTMENTS;

export const URGENCY_LEVELS = ["not urgent", "somewhat urgent", "urgent", "critical"] as const;

const questions = {
  department: { kind: "choice", prompt: "Which team should handle this ticket?", options: DEPARTMENTS },
  urgency: { kind: "scale", prompt: "How urgent is this ticket?", levels: URGENCY_LEVELS },
  refund: { kind: "yesno", prompt: "Is the customer asking for a refund?" },
} as const;

export interface TriageOptions {
  /** 部署の判断の確信度がこれを下回ったら，人の確認に回す． */
  minConfidence?: number;
  /** 返金を求めていると見なす確率のしきい値． */
  refundThreshold?: number;
}

export interface TriageResult {
  department: Department;
  /** 0(not urgent)から3(critical)までの期待値． */
  urgency: number;
  urgencyLabel: (typeof URGENCY_LEVELS)[number];
  refundRequested: boolean;
  /** モデルが迷っているため，人が確認すべきか． */
  needsHumanReview: boolean;
  /** 判断の根拠となった確率など．ログや画面表示に使う． */
  detail: {
    departmentConfidence: number;
    departmentProbabilities: Record<string, number>;
    refundProbability: number;
  };
}

export const triage = async (
  engine: DecisionEngine,
  ticket: Ticket,
  { minConfidence = 0.5, refundThreshold = 0.5 }: TriageOptions = {},
): Promise<TriageResult> => {
  const answers = await engine.decide({ subject: ticket.subject, body: ticket.body }, questions);

  const urgencyIndex = Math.min(URGENCY_LEVELS.length - 1, Math.max(0, Math.round(answers.urgency.value)));
  return {
    department: answers.department.value as Department,
    urgency: answers.urgency.value,
    urgencyLabel: URGENCY_LEVELS[urgencyIndex] ?? URGENCY_LEVELS[0],
    refundRequested: answers.refund.probability >= refundThreshold,
    needsHumanReview: answers.department.confidence < minConfidence,
    detail: {
      departmentConfidence: answers.department.confidence,
      departmentProbabilities: answers.department.probabilities,
      refundProbability: answers.refund.probability,
    },
  };
};
