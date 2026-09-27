// 担当部署の判定．

import type { ChoiceQuestion, ChoiceResponse } from "@typesafe-ai/sdk";

/** 問い合わせを担当する部署を尋ねる質問．選択肢ごとに，その部署が扱う内容を説明する． */
export const departmentQuestion: ChoiceQuestion = {
  type: "choice",
  instructions: "Which team should handle this ticket?",
  criteria: {
    billing: "payments, refunds, invoices and charges",
    support: "product help, bugs and how-to questions",
    sales: "new purchases, pricing and plan upgrades",
  },
};

/** 担当部署の答えを，`department: billing (0.94)`のような1行にする． */
export const formatDepartment = (answer: ChoiceResponse): string => {
  // 選ばれた部署は必ずprobabilitiesのキーにあるが，型の上では見つからない場合もありうるので0とする．
  const probability = answer.probabilities[answer.choice] ?? 0;
  return `department: ${answer.choice} (${probability.toFixed(2)})`;
};
