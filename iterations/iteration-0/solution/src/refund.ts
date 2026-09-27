// 返金を求めているかの判定．

import type { NoulQuestion } from "@typesafe-ai/sdk";

/** 返金を求めているかを尋ねる，はい・いいえの質問． */
export const refundQuestion: NoulQuestion = { type: "noul", instructions: "Is the customer asking for a refund?" };

/** 返金を求めている確率(0から1)を，`refund: yes (0.89)`のような1行にする． */
export const formatRefund = (probability: number): string => {
  const answer = probability >= 0.5 ? "yes" : "no";
  return `refund: ${answer} (${probability.toFixed(2)})`;
};
