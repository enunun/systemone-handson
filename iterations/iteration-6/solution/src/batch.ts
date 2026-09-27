// 複数の問い合わせをまとめて振り分けるための部品．

import { departmentNames, type Ticket, type Triage } from "./triage.ts";

/** まとめて振り分けるときに，判断エンジンへ同時に送る問い合わせの数． */
export const batchConcurrency = 4;

/** 問い合わせのファイルを読んだ結果．読めなかった行は，errorsに理由を入れる． */
export interface ParsedTickets {
  tickets: Ticket[];
  errors: string[];
}

const isTicket = (value: unknown): value is Ticket =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Record<string, unknown>).subject === "string" &&
  typeof (value as Record<string, unknown>).body === "string";

const parseLine = (line: string): Ticket | undefined => {
  try {
    const value: unknown = JSON.parse(line);
    return isTicket(value) ? { subject: value.subject, body: value.body } : undefined;
  } catch {
    return undefined;
  }
};

/** JSON Lines(1行に1件のJSON)の文字列から，問い合わせを読む．空の行は飛ばす． */
export const parseTickets = (text: string): ParsedTickets => {
  const tickets: Ticket[] = [];
  const errors: string[] = [];
  text.split("\n").forEach((line, index) => {
    if (line.trim() === "") return;
    const ticket = parseLine(line);
    if (ticket === undefined) errors.push(`line ${index + 1}: skipped (not a JSON object with subject and body)`);
    else tickets.push(ticket);
  });
  return { tickets, errors };
};

/** 配列の要素に非同期の関数を適用する．同時に実行するのはlimit個までで，結果は元の順に並べる． */
export const mapWithConcurrency = async <T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = [];
  let next = 0;
  // limit個の作業者が，まだ手の付いていない要素を1つずつ取って処理する．
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};

/** まとめて振り分けた結果の集計． */
export interface Summary {
  /** 自動で振り分けた件数(部署ごと)． */
  departments: Record<string, number>;
  /** 人の確認に回した件数． */
  needsReview: number;
}

/** 振り分けの結果を集計する．人の確認に回したものは，部署の件数に含めない． */
export const summarize = (results: readonly Triage[]): Summary => {
  const departments: Record<string, number> = Object.fromEntries(departmentNames.map((name) => [name, 0]));
  let needsReview = 0;
  for (const result of results) {
    if (result.needsReview) needsReview += 1;
    else departments[result.department] = (departments[result.department] ?? 0) + 1;
  }
  return { departments, needsReview };
};
