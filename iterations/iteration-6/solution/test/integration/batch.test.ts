import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { TypeSafeClient } from "@typesafe-ai/sdk";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createSystemOneEngine } from "../../src/adapters/systemone-engine.ts";
import { run } from "../../src/app.ts";

// 判断エンジンの代わりに，件名に応じた答えを返すfetch．件名が"Team plan"なら，salesを迷いながら選ぶ．
const fakeFetch = async (_url: string, init?: RequestInit) => {
  const request = JSON.parse(String(init?.body)) as { state: { subject: string } };
  const unsure = request.state.subject === "Team plan";
  return Response.json({
    model: "laya",
    answers: {
      department: {
        type: "choice",
        choice: unsure ? "sales" : "billing",
        confidence: unsure ? 0.02 : 0.8,
        probabilities: unsure
          ? { billing: 0.26, support: 0.3, sales: 0.44 }
          : { billing: 0.9, support: 0.05, sales: 0.05 },
      },
      urgency: { type: "score", score: 1, confidence: 0.1, legend: {}, probabilities: { 0: 0, 1: 1, 2: 0, 3: 0 } },
      refund: { type: "noul", noul: 0.5 },
    },
    usage: { input_tokens: 150, output_tokens: 0 },
  });
};

const engine = createSystemOneEngine(
  new TypeSafeClient({ baseURL: "http://laya.test", apiKey: "test", fetch: fakeFetch }),
);

let dir = "";
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "triage-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const writeTickets = async (lines: string[]): Promise<string> => {
  const file = path.join(dir, "tickets.jsonl");
  await writeFile(file, lines.join("\n"));
  return file;
};

describe("run batch", () => {
  test("ファイルの問い合わせを振り分け，部署ごとの件数と人の確認に回した件数を表示する", async () => {
    const file = await writeTickets([
      '{"subject": "Refund", "body": "Where is my refund?"}',
      '{"subject": "Invoice", "body": "Send me the invoice."}',
      '{"subject": "Team plan", "body": "What does the team plan cost?"}',
    ]);

    const result = await run(["batch", file], engine);

    expect(result).toEqual({ code: 0, output: "billing: 2, support: 0, sales: 0, needs review: 1" });
  });

  test("読めない行は，行番号とともに知らせて飛ばす", async () => {
    const file = await writeTickets(['{"subject": "Refund", "body": "Where is my refund?"}', "not json"]);

    const result = await run(["batch", file], engine);

    expect(result).toEqual({
      code: 0,
      output:
        "line 2: skipped (not a JSON object with subject and body)\nbilling: 1, support: 0, sales: 0, needs review: 0",
    });
  });

  test("--min-confidenceで，しきい値を変える", async () => {
    const file = await writeTickets(['{"subject": "Refund", "body": "Where is my refund?"}']);

    const result = await run(["batch", "--min-confidence", "0.9", file], engine);

    expect(result.output).toBe("billing: 0, support: 0, sales: 0, needs review: 1");
  });

  test("ファイルが読めなければ，終了コード1で知らせる", async () => {
    const result = await run(["batch", path.join(dir, "missing.jsonl")], engine);

    expect(result.code).toBe(1);
    expect(result.output).toMatch(/^cannot read .*missing\.jsonl: ENOENT/);
  });

  test("ファイルを指定しなければ，使い方を表示する", async () => {
    const result = await run(["batch"], engine);

    expect(result.code).toBe(2);
    expect(result.output).toContain("triage batch");
  });
  // 発展(演習6-7)：同時に送る数を指定する
  //
  // test("--concurrencyで，同時に送る数を変える", async () => {
  //   // 送っている途中の数を数え，同時に送った数の最大を記録するfetch．
  //   let active = 0;
  //   let most = 0;
  //   const countingFetch = async (url: string, init?: RequestInit) => {
  //     active++;
  //     most = Math.max(most, active);
  //     await new Promise((resolve) => setTimeout(resolve, 5));
  //     active--;
  //     return fakeFetch(url, init);
  //   };
  //   const countingEngine = createSystemOneEngine(
  //     new TypeSafeClient({ baseURL: "http://laya.test", apiKey: "test", fetch: countingFetch }),
  //   );
  //   const file = await writeTickets(Array.from({ length: 5 }, () => '{"subject": "Refund", "body": "Where?"}'));
  //
  //   await run(["batch", "--concurrency", "2", file], countingEngine);
  //
  //   expect(most).toBe(2);
  // });
  //
  // test("--concurrencyが1以上の整数でなければ，使い方を表示する", async () => {
  //   const file = await writeTickets(['{"subject": "Refund", "body": "Where is my refund?"}']);
  //
  //   for (const value of ["0", "1.5", "two"]) {
  //     const result = await run(["batch", "--concurrency", value, file], engine);
  //
  //     expect(result.code).toBe(2);
  //   }
  // });
  // 発展(演習6-7)ここまで
});
