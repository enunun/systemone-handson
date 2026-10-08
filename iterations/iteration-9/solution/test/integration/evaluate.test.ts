import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { TypeSafeClient } from "@typesafe-ai/sdk";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createSystemOneEngine } from "../../src/adapters/systemone-engine.ts";
import { run } from "../../src/app.ts";
import { parseRecords } from "../../src/records.ts";

// 判断エンジンの代わりに，件名で決まる部署と確信度を返すfetch．
const decisions: Record<string, { choice: string; confidence: number }> = {
  A: { choice: "billing", confidence: 0.8 },
  B: { choice: "support", confidence: 0.3 },
  C: { choice: "billing", confidence: 0.05 },
};
const fakeFetch = async (_url: string, init?: RequestInit) => {
  const request = JSON.parse(String(init?.body)) as { state: { subject: string } };
  const decision = decisions[request.state.subject] ?? { choice: "support", confidence: 0 };
  return Response.json({
    model: "tev1:0.8b",
    answers: {
      department: { type: "choice", ...decision, probabilities: { [decision.choice]: 0.6 } },
      urgency: { type: "score", score: 1, confidence: 0.1, legend: {}, probabilities: { 0: 0, 1: 1, 2: 0, 3: 0 } },
      refund: { type: "noul", noul: 0.8 },
    },
    usage: { input_tokens: 150, output_tokens: 0 },
  });
};

const engine = createSystemOneEngine(
  new TypeSafeClient({ baseURL: "http://ollama.test", apiKey: "test", fetch: fakeFetch }),
);

let dir = "";
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "triage-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

// Aとbillingは正解，Bは正解がbillingなので誤り，Cは正解がsalesなので誤り．
const writeLabeled = async (): Promise<string> => {
  const file = path.join(dir, "labeled.jsonl");
  await writeFile(
    file,
    [
      '{"subject": "A", "body": "a", "department": "billing", "refund": true, "urgency": 1}',
      '{"subject": "B", "body": "b", "department": "billing", "refund": false, "urgency": 2}',
      '{"subject": "C", "body": "c", "department": "sales", "refund": true, "urgency": 1}',
      '{"subject": "D", "body": "d"}',
    ].join("\n"),
  );
  return file;
};

describe("run eval", () => {
  test("既定のしきい値で評価し，評価の1行と混同行列を表示する．読めない行は知らせて飛ばす", async () => {
    const result = await run(["eval", await writeLabeled()], engine);

    expect(result).toEqual({
      code: 0,
      output: [
        "line 4: skipped (not a JSON object with subject, body and labels)",
        "accuracy: 0.50 (auto-routed 2 / 3), review rate: 0.33",
        "",
        "actual \\ predicted   billing   support     sales",
        "billing                    1         1         0",
        "support                    0         0         0",
        "sales                      1         0         0",
      ].join("\n"),
    });
  });

  test("--min-confidenceで，評価するしきい値を変える", async () => {
    const result = await run(["eval", "--min-confidence", "0.5", await writeLabeled()], engine);

    expect(result.output.split("\n")[1]).toBe("accuracy: 1.00 (auto-routed 1 / 3), review rate: 0.67");
  });

  test("--sweepで，しきい値ごとの評価の表を表示する", async () => {
    const result = await run(["eval", "--sweep", await writeLabeled()], engine);

    expect(result.output.split("\n").slice(1, 5)).toEqual([
      "min-confidence  auto-routed  accuracy  review rate",
      "0.0                       3      0.33         0.00",
      "0.1                       2      0.50         0.33",
      "0.2                       2      0.50         0.33",
    ]);
  });

  test("--sweepと--min-confidenceは一緒に使えない", async () => {
    const result = await run(["eval", "--sweep", "--min-confidence", "0.5", "labeled.jsonl"], engine);

    expect(result.code).toBe(2);
  });

  test("--sweepは，eval以外では使えない", async () => {
    const result = await run(["--sweep", "Refund", "Where?"], engine);

    expect(result.code).toBe(2);
  });
});

describe("run eval --out", () => {
  test("1件ごとの正解・振り分けの結果・かかった時間を，JSON Linesで記録する", async () => {
    const out = path.join(dir, "results", "dev.jsonl");

    const result = await run(["eval", "--out", out, await writeLabeled()], engine);

    expect(result.code).toBe(0);
    expect(result.output.split("\n").slice(-2)).toEqual(["", `wrote 3 records to ${out}`]);
    const { records, errors } = parseRecords(await readFile(out, "utf8"));
    expect(errors).toEqual([]);
    expect(records.map(({ ticket, result }) => [ticket.subject, ticket.urgency, result.department])).toEqual([
      ["A", 1, "billing"],
      ["B", 2, "support"],
      ["C", 1, "billing"],
    ]);
    expect(records.every(({ elapsedMs }) => elapsedMs >= 0)).toBe(true);
  });

  test("記録を書けなければ，理由を表示して終了コード1で終わる", async () => {
    const labeled = await writeLabeled();

    const result = await run(["eval", "--out", labeled + "/records.jsonl", labeled], engine);

    expect(result.code).toBe(1);
    expect(result.output).toMatch(/^cannot write .*records\.jsonl: /);
  });
});

describe("run report", () => {
  // run eval --outで書いた記録を読む．Bは部署を誤る．
  const writeRecords = async (): Promise<string> => {
    const out = path.join(dir, "records.jsonl");
    await run(["eval", "--out", out, await writeLabeled()], engine);
    return out;
  };

  test("判断エンジンに尋ねずに，記録から指標を表示する", async () => {
    const file = await writeRecords();
    const unused = createSystemOneEngine(
      new TypeSafeClient({ baseURL: "http://ollama.test", apiKey: "test", fetch: () => Promise.reject(new Error()) }),
    );

    const result = await run(["report", file], unused);

    expect(result.code).toBe(0);
    expect(result.output.split("\n").slice(0, -1)).toEqual([
      "accuracy: 0.50 (auto-routed 2 / 3), review rate: 0.33",
      "",
      // 発展(演習9-7)：F1の列を足す
      // "department  precision  recall    f1",
      // "billing          0.50    0.50  0.50",
      // "support          0.00     n/a   n/a",
      // "sales             n/a    0.00   n/a",
      // 発展(演習9-7)ここまで．次の4行の代わりに使う
      "department  precision  recall",
      "billing          0.50    0.50",
      "support          0.00     n/a",
      "sales             n/a    0.00",
      "",
      "refund accuracy: 0.67, brier score: 0.240",
      "urgency mean absolute error: 0.33",
    ]);
    expect(result.output.split("\n").at(-1)).toMatch(/^latency median: \d+ ms, p95: \d+ ms$/);
  });

  test("判断エンジンを使えなくても，記録から指標を表示する", async () => {
    const result = await run(["report", await writeRecords()], { unavailable: "missing environment variables" });

    expect(result.code).toBe(0);
  });

  test("--min-confidenceで，部署の正解率を求めるしきい値を変える", async () => {
    const result = await run(["report", "--min-confidence", "0.5", await writeRecords()], engine);

    expect(result.output.split("\n")[0]).toBe("accuracy: 1.00 (auto-routed 1 / 3), review rate: 0.67");
  });

  test("記録のファイルを読めなければ，理由を表示して終了コード1で終わる", async () => {
    const result = await run(["report", path.join(dir, "missing.jsonl")], engine);

    expect(result.code).toBe(1);
    expect(result.output).toMatch(/^cannot read .*missing\.jsonl: /);
  });

  test("--outと--sweepは，evalでだけ使える", async () => {
    expect((await run(["report", "--out", "x.jsonl", "records.jsonl"], engine)).code).toBe(2);
    expect((await run(["report", "--sweep", "records.jsonl"], engine)).code).toBe(2);
    expect((await run(["batch", "--out", "x.jsonl", "tickets.jsonl"], engine)).code).toBe(2);
  });
});
