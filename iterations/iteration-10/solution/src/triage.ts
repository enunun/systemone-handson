// 問い合わせの振り分け．判断エンジンに質問を送り，答えを振り分けの結果にまとめる．

import type { ChoiceQuestion, DecisionEngine, ScaleQuestion, YesNoQuestion } from "./ports/decision-engine.ts";

/** 問い合わせ． */
export interface Ticket {
  subject: string;
  body: string;
}

/** 振り分けの結果． */
export interface Triage {
  /** もっとも確からしい担当部署． */
  department: string;
  /** その部署である確率． */
  departmentProbability: number;
  /** 部署の判定の確信度(0から1)． */
  departmentConfidence: number;
  /** 部署の判定に迷いがあり，人の確認に回すべきか． */
  needsReview: boolean;
  /** 緊急度の期待値(0から3)．段階の番号はurgencyLevelsの添字である． */
  urgency: number;
  /** 返金を求めている確率． */
  refundProbability: number;
}

/** 問い合わせを担当する部署を尋ねる質問．選択肢ごとに，その部署が扱う内容を説明する． */
const departmentQuestion: ChoiceQuestion = {
  kind: "choice",
  prompt: "Which team should handle this ticket?",
  options: {
    billing: "payments, refunds, invoices and charges",
    support: "product help, bugs and how-to questions",
    sales: "new purchases, pricing, quotes, demos, trials and plan upgrades",
  },
};

/** 担当部署の名前．質問の選択肢の順である． */
export const departmentNames = Object.keys(departmentQuestion.options);

/** 緊急度の段階．添字が段階の番号(0がもっとも低い)である． */
export const urgencyLevels = ["not urgent", "somewhat urgent", "urgent", "critical"] as const;

/** 緊急度を尋ねる，段階評価の質問． */
const urgencyQuestion: ScaleQuestion = { kind: "scale", prompt: "How urgent is this ticket?", levels: urgencyLevels };

/** 返金を求めているかを尋ねる，はい・いいえの質問． */
const refundQuestion: YesNoQuestion = { kind: "yesno", prompt: "Is the customer asking for a refund?" };

export interface TriageOptions {
  /** 部署の判定の確信度がこれを下回ったら，人の確認に回す．0から1． */
  minConfidence?: number;
}

/** しきい値を指定しないときに使う，部署の判定の確信度のしきい値． */
export const defaultMinConfidence = 0.2;

/** 問い合わせについて判断エンジンに尋ね，振り分けの結果を返す． */
export const triage = async (
  engine: DecisionEngine,
  ticket: Ticket,
  { minConfidence = defaultMinConfidence }: TriageOptions = {},
): Promise<Triage> => {
  const answers = await engine.decide(
    { subject: ticket.subject, body: ticket.body },
    { department: departmentQuestion, urgency: urgencyQuestion, refund: refundQuestion },
  );
  return {
    department: answers.department.value,
    departmentProbability: answers.department.probability,
    departmentConfidence: answers.department.confidence,
    needsReview: answers.department.confidence < minConfidence,
    urgency: answers.urgency.value,
    refundProbability: answers.refund.probability,
  };
};
