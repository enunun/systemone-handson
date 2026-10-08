// 評価の記録．問い合わせ1件ごとに，正解・振り分けの結果・かかった時間を残す．
// 記録があれば，判断エンジンに尋ね直さずに，指標を計算し直せる．

import { parseJsonLines } from "./batch.ts";
import { type LabeledResult, type LabeledTicket, readLabeledTicket } from "./evaluate.ts";
import type { Triage } from "./triage.ts";

/** 問い合わせ1件の評価の記録． */
export interface EvalRecord {
  ticket: LabeledTicket;
  result: Triage;
  /** 振り分けにかかった時間(ミリ秒)． */
  elapsedMs: number;
}

/** 記録を，1行に1件のJSON Linesの文字列にする． */
export const formatRecords = (records: readonly EvalRecord[]): string =>
  records.map((record) => `${JSON.stringify(record)}\n`).join("");

const isTriage = (value: unknown): value is Triage => {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.department === "string" &&
    typeof v.needsReview === "boolean" &&
    ["departmentProbability", "departmentConfidence", "urgency", "refundProbability"].every(
      (key) => typeof v[key] === "number",
    )
  );
};

const readRecord = (value: unknown): EvalRecord | undefined => {
  if (typeof value !== "object" || value === null) return undefined;
  const { ticket, result, elapsedMs } = value as Record<string, unknown>;
  const labeled = readLabeledTicket(ticket);
  if (labeled === undefined || !isTriage(result) || typeof elapsedMs !== "number") return undefined;
  return { ticket: labeled, result, elapsedMs };
};

/** JSON Linesの文字列から，評価の記録を読む． */
export const parseRecords = (text: string): { records: EvalRecord[]; errors: string[] } => {
  const { items, errors } = parseJsonLines(text, readRecord, "ticket, result and elapsedMs");
  return { records: items, errors };
};

/** 記録を，正解の部署と振り分けの結果の組にする． */
export const toLabeledResults = (records: readonly EvalRecord[]): LabeledResult[] =>
  records.map(({ ticket, result }) => ({ label: ticket.department, result }));
