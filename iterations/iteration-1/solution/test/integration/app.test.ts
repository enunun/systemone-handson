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
  refund: { type: "noul", noul: 0.8631 },
};

// 判断エンジンの代わりに，決まった答えを返すfetch．受け取ったリクエストの本文をrequestsに記録する．
const fakeFetch = (requests: unknown[]) => async (_url: string, init?: RequestInit) => {
  requests.push(JSON.parse(String(init?.body)));
  return Response.json({ model: "tev1:0.8b", answers, usage: { input_tokens: 120, output_tokens: 0 } });
};

const clientWith = (requests: unknown[] = []) =>
  new TypeSafeClient({ baseURL: "http://ollama.test", apiKey: "test", fetch: fakeFetch(requests) });

describe("run", () => {
  test("件名と本文を判断エンジンに送り，担当部署と返金の判定を表示する", async () => {
    const requests: unknown[] = [];

    const result = await run(["Refund not received", "Where is my refund?"], clientWith(requests));

    // 発展(演習1-7)：部署の行に，2番目に確からしい部署が付く
    // expect(result).toEqual({ code: 0, output: "department: billing (0.73, next: support 0.20)\nrefund: yes (0.86)" });
    // 発展(演習1-7)ここまで．次の1行の代わりに使う
    expect(result).toEqual({ code: 0, output: "department: billing (0.73)\nrefund: yes (0.86)" });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      state: { subject: "Refund not received", body: "Where is my refund?" },
      questions: {
        department: { type: "choice", instructions: "Which team should handle this ticket?" },
        refund: { type: "noul", instructions: "Is the customer asking for a refund?" },
      },
    });
  });

  test("件名と本文がそろっていなければ，判断エンジンへ送らずに使い方を表示する", async () => {
    const requests: unknown[] = [];

    const result = await run(["Refund not received"], clientWith(requests));

    expect(result).toEqual({ code: 2, output: 'usage: triage "<subject>" "<body>"' });
    expect(requests).toEqual([]);
  });
});
