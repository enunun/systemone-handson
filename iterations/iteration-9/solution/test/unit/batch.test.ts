import { describe, expect, test } from "vitest";
import { mapWithConcurrency, parseTickets, summarize } from "../../src/batch.ts";

describe("parseTickets", () => {
  test("1行に1件の問い合わせ(JSON)を読む", () => {
    const text = '{"subject": "A", "body": "a"}\n{"subject": "B", "body": "b"}\n';

    expect(parseTickets(text)).toEqual({
      tickets: [
        { subject: "A", body: "a" },
        { subject: "B", body: "b" },
      ],
      errors: [],
    });
  });

  test("空の行は飛ばす", () => {
    expect(parseTickets('\n{"subject": "A", "body": "a"}\n\n').tickets).toEqual([{ subject: "A", body: "a" }]);
  });

  test("JSONとして読めない行は，行番号とともに知らせて飛ばす", () => {
    const text = '{"subject": "A", "body": "a"}\nnot json\n{"subject": "B", "body": "b"}';

    expect(parseTickets(text)).toEqual({
      tickets: [
        { subject: "A", body: "a" },
        { subject: "B", body: "b" },
      ],
      errors: ["line 2: skipped (not a JSON object with subject and body)"],
    });
  });

  test("件名か本文が文字列でない行も，知らせて飛ばす", () => {
    const text = '{"subject": "A"}\n{"subject": 1, "body": "b"}\n["A", "a"]';

    expect(parseTickets(text).errors).toEqual([
      "line 1: skipped (not a JSON object with subject and body)",
      "line 2: skipped (not a JSON object with subject and body)",
      "line 3: skipped (not a JSON object with subject and body)",
    ]);
  });
});

describe("mapWithConcurrency", () => {
  test("すべての要素に関数を適用し，結果を元の順に並べる", async () => {
    const delays = [30, 10, 20, 0, 5];

    const result = await mapWithConcurrency(delays, 2, async (ms) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return ms * 2;
    });

    expect(result).toEqual([60, 20, 40, 0, 10]);
  });

  test("同時に実行する数を，指定した数までにする", async () => {
    let running = 0;
    let maxRunning = 0;

    await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4, async () => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
    });

    expect(maxRunning).toBe(4);
  });
});

describe("summarize", () => {
  const triage = (department: string, needsReview: boolean) => ({
    department,
    departmentProbability: 0.5,
    departmentConfidence: 0.5,
    needsReview,
    urgency: 1,
    refundProbability: 0.1,
  });

  test("自動で振り分けた件数を部署ごとに数え，人の確認に回した件数を別に数える", () => {
    const results = [
      triage("billing", false),
      triage("billing", false),
      triage("sales", true),
      triage("support", false),
      triage("billing", true),
    ];

    expect(summarize(results)).toEqual({ departments: { billing: 2, support: 1, sales: 0 }, needsReview: 2 });
  });
});
