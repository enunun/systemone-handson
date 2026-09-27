import { TypeSafeClient } from "@typesafe-ai/sdk";
import { describe, expect, test } from "vitest";
import { run } from "../../src/app.ts";

// 判断エンジンの代わりに，決まった答えを返すfetch．受け取ったリクエストの本文をrequestsに記録する．
const fakeFetch = (noul: number, requests: unknown[]) => async (_url: string, init?: RequestInit) => {
  requests.push(JSON.parse(String(init?.body)));
  return Response.json({
    model: "laya",
    answers: { refund: { type: "noul", noul } },
    usage: { input_tokens: 53, output_tokens: 0 },
  });
};

const clientWith = (noul: number, requests: unknown[] = []) =>
  new TypeSafeClient({ baseURL: "http://laya.test", apiKey: "test", fetch: fakeFetch(noul, requests) });

describe("run", () => {
  test("件名と本文を判断エンジンに送り，返金の判定を表示する", async () => {
    const requests: unknown[] = [];

    const result = await run(["Refund not received", "Where is my refund?"], clientWith(0.8631, requests));

    expect(result).toEqual({ code: 0, output: "refund: yes (0.86)" });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      state: { subject: "Refund not received", body: "Where is my refund?" },
      questions: { refund: { type: "noul", instructions: "Is the customer asking for a refund?" } },
    });
  });

  test("件名と本文がそろっていなければ，判断エンジンへ送らずに使い方を表示する", async () => {
    const requests: unknown[] = [];

    const result = await run(["Refund not received"], clientWith(0.8631, requests));

    expect(result).toEqual({ code: 2, output: 'usage: triage "<subject>" "<body>"' });
    expect(requests).toEqual([]);
  });
});
