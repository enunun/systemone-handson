import { TypeSafeClient } from "@typesafe-ai/sdk";
import { describe, expect, test } from "vitest";
import { run } from "../../src/app.ts";

// 判断エンジンが返す答え．質問の名前ごとの答えを並べる．
const answers = {
  department: {
    type: "choice",
    choice: "billing",
    confidence: 0.32,
    probabilities: { billing: 0.7253, support: 0.1994, sales: 0.0753 },
  },
  urgency: {
    type: "score",
    score: 1.4061,
    confidence: 0.0892,
    legend: { 0: "not urgent", 1: "somewhat urgent", 2: "urgent", 3: "critical" },
    probabilities: { 0: 0.2147, 1: 0.2574, 2: 0.4349, 3: 0.093 },
  },
  refund: { type: "noul", noul: 0.8631 },
};

// 判断エンジンの代わりに，決まった答えを返すfetch．受け取ったリクエストの本文をrequestsに記録する．
const fakeFetch = (requests: unknown[]) => async (_url: string, init?: RequestInit) => {
  requests.push(JSON.parse(String(init?.body)));
  return Response.json({ model: "laya", answers, usage: { input_tokens: 150, output_tokens: 0 } });
};

const clientWith = (requests: unknown[] = []) =>
  new TypeSafeClient({ baseURL: "http://laya.test", apiKey: "test", fetch: fakeFetch(requests) });

describe("run", () => {
  test("件名と本文を判断エンジンに送り，担当部署・緊急度・返金の判定を表示する", async () => {
    const requests: unknown[] = [];

    const result = await run(["Refund not received", "Where is my refund?"], clientWith(requests));

    expect(result).toEqual({
      code: 0,
      output: "department: billing (0.73)\nurgency: somewhat urgent (1.4)\nrefund: yes (0.86)",
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ state: { subject: "Refund not received", body: "Where is my refund?" } });
  });

  test("件名と本文がそろっていなければ，判断エンジンへ送らずに使い方を表示する", async () => {
    const requests: unknown[] = [];

    const result = await run(["Refund not received"], clientWith(requests));

    expect(result).toEqual({ code: 2, output: 'usage: triage "<subject>" "<body>"' });
    expect(requests).toEqual([]);
  });
});
