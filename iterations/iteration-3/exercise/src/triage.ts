// 問い合わせの振り分け．判断エンジンに質問を送り，答えを振り分けの結果にまとめる．

import type { ChoiceQuestion, NoulQuestion, ScoreQuestion, TypeSafeClient } from "@typesafe-ai/sdk";

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
  /** 緊急度の期待値(0から3)．段階の番号はurgencyLevelsの添字である． */
  urgency: number;
  /** 返金を求めている確率． */
  refundProbability: number;
}

/** 問い合わせを担当する部署を尋ねる質問．選択肢ごとに，その部署が扱う内容を説明する． */
const departmentQuestion: ChoiceQuestion = {
  type: "choice",
  instructions: "Which team should handle this ticket?",
  criteria: {
    billing: "payments, refunds, invoices and charges",
    support: "product help, bugs and how-to questions",
    sales: "new purchases, pricing and plan upgrades",
  },
};

/** 緊急度の段階．添字が段階の番号(0がもっとも低い)である． */
export const urgencyLevels = ["not urgent", "somewhat urgent", "urgent", "critical"] as const;

/** 緊急度を尋ねる，段階評価の質問． */
const urgencyQuestion: ScoreQuestion = {
  type: "score",
  instructions: "How urgent is this ticket?",
  criteria: urgencyLevels,
};

/** 返金を求めているかを尋ねる，はい・いいえの質問． */
const refundQuestion: NoulQuestion = { type: "noul", instructions: "Is the customer asking for a refund?" };

/** 問い合わせについて判断エンジンに尋ね，振り分けの結果を返す． */
export const triage = async (client: TypeSafeClient, ticket: Ticket): Promise<Triage> => {
  const { answers } = await client.systemOne({
    state: { subject: ticket.subject, body: ticket.body },
    questions: { department: departmentQuestion, urgency: urgencyQuestion, refund: refundQuestion },
  });
  const department = answers.department;
  return {
    department: department.choice,
    // 選ばれた部署は必ずprobabilitiesのキーにあるが，型の上では見つからない場合もありうるので0とする．
    departmentProbability: department.probabilities[department.choice] ?? 0,
    urgency: answers.urgency.score,
    refundProbability: answers.refund.noul,
  };
};
