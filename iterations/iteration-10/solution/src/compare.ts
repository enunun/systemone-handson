// 同じデータで取った2つの評価の記録を，問い合わせごとに突き合わせる．

import type { EvalRecord } from "./records.ts";

/** 2つの記録で，部署の判定が食い違った問い合わせ． */
export interface Difference {
  subject: string;
  /** 正解の部署． */
  actual: string;
  /** 記録Aの判定． */
  a: string;
  /** 記録Bの判定． */
  b: string;
}

/** 2つの記録を突き合わせた結果． */
export interface Comparison {
  differences: Difference[];
  /** Aだけが部署を正解した件数． */
  onlyA: number;
  /** Bだけが部署を正解した件数． */
  onlyB: number;
}

/**
 * 2つの記録を，同じ位置の問い合わせどうしで突き合わせる．
 * 件数が違うか，同じ位置の件名と本文が違えば，同じデータの記録ではないので，メッセージを返す．
 */
export const compareRecords = (
  a: readonly EvalRecord[],
  b: readonly EvalRecord[],
): { ok: true; comparison: Comparison } | { ok: false; message: string } => {
  const sameTickets =
    a.length === b.length &&
    a.every(({ ticket }, i) => ticket.subject === b[i]?.ticket.subject && ticket.body === b[i]?.ticket.body);
  if (!sameTickets) return { ok: false, message: "the records are not from the same tickets" };
  const differences: Difference[] = [];
  let onlyA = 0;
  let onlyB = 0;
  a.forEach((recordA, i) => {
    const recordB = b[i] as EvalRecord;
    const actual = recordA.ticket.department;
    const correctA = recordA.result.department === actual;
    const correctB = recordB.result.department === actual;
    if (correctA && !correctB) onlyA += 1;
    if (correctB && !correctA) onlyB += 1;
    if (recordA.result.department !== recordB.result.department) {
      differences.push({
        subject: recordA.ticket.subject,
        actual,
        a: recordA.result.department,
        b: recordB.result.department,
      });
    }
  });
  return { ok: true, comparison: { differences, onlyA, onlyB } };
};
