import { describe, expect, test } from "vitest";
import { type EvalRecord, formatRecords, parseRecords, toLabeledResults } from "../../src/records.ts";

const record = (subject: string, department: string, predicted: string): EvalRecord => ({
  ticket: { subject, body: subject.toLowerCase(), department, refund: false, urgency: 1 },
  result: {
    department: predicted,
    departmentProbability: 0.6,
    departmentConfidence: 0.3,
    needsReview: false,
    urgency: 1.2,
    refundProbability: 0.1,
  },
  elapsedMs: 850,
});

const records = [record("A", "billing", "billing"), record("B", "sales", "support")];

describe("formatRecords", () => {
  test("記録を1行に1件のJSONにする", () => {
    const lines = formatRecords(records).split("\n");

    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[0] ?? "")).toEqual(records[0]);
    expect(lines[2]).toBe("");
  });
});

describe("parseRecords", () => {
  test("formatRecordsで書いた記録を読み戻す", () => {
    expect(parseRecords(formatRecords(records))).toEqual({ records, errors: [] });
  });

  test("正解・結果・時間のそろっていない行は，行番号とともに知らせて飛ばす", () => {
    const text = [JSON.stringify({ ...records[0], elapsedMs: "fast" }), JSON.stringify({ ticket: {} })].join("\n");

    expect(parseRecords(text)).toEqual({
      records: [],
      errors: [
        "line 1: skipped (not a JSON object with ticket, result and elapsedMs)",
        "line 2: skipped (not a JSON object with ticket, result and elapsedMs)",
      ],
    });
  });
});

describe("toLabeledResults", () => {
  test("記録を，正解の部署と振り分けの結果の組にする", () => {
    expect(toLabeledResults(records)).toEqual([
      { label: "billing", result: records[0]?.result },
      { label: "sales", result: records[1]?.result },
    ]);
  });
});
