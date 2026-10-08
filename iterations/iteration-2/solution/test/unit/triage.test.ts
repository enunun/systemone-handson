import { TypeSafeClient } from "@typesafe-ai/sdk";
import { describe, expect, test } from "vitest";
import { triage } from "../../src/triage.ts";

// 判断エンジンの代わりに，決まった答えを返すfetch．受け取ったリクエストの本文をrequestsに記録する．
const fakeFetch = (answers: object, requests: unknown[]) => async (_url: string, init?: RequestInit) => {
  requests.push(JSON.parse(String(init?.body)));
  return Response.json({ model: "tev1:0.8b", answers, usage: { input_tokens: 120, output_tokens: 0 } });
};

const clientWith = (answers: object, requests: unknown[] = []) =>
  new TypeSafeClient({ baseURL: "http://ollama.test", apiKey: "test", fetch: fakeFetch(answers, requests) });

const ticket = { subject: "Refund not received", body: "Where is my refund?" };

describe("triage", () => {
  test("問い合わせと質問を1回で送る", async () => {
    const requests: unknown[] = [];
    const answers = {
      department: {
        type: "choice",
        choice: "billing",
        confidence: 0.32,
        probabilities: { billing: 0.73, support: 0.27 },
      },
      // 発展(演習2-7)：もっとも確率の高い段階を取り出すので，段階ごとの確率を返す
      // urgency: { type: "score", score: 1.4, confidence: 0.09, legend: {}, probabilities: { 1: 0.6, 2: 0.4 } },
      // 発展(演習2-7)ここまで．次の1行の代わりに使う
      urgency: { type: "score", score: 1.4, confidence: 0.09, legend: {}, probabilities: {} },
      refund: { type: "noul", noul: 0.86 },
    };

    await triage(clientWith(answers, requests), ticket);

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      state: { subject: "Refund not received", body: "Where is my refund?" },
      questions: {
        department: { type: "choice", instructions: "Which team should handle this ticket?" },
        urgency: {
          type: "score",
          instructions: "How urgent is this ticket?",
          criteria: ["not urgent", "somewhat urgent", "urgent", "critical"],
        },
        refund: { type: "noul", instructions: "Is the customer asking for a refund?" },
      },
    });
  });

  test("選ばれた部署と，その部署の確率・緊急度の期待値・返金の確率を取り出す", async () => {
    const answers = {
      department: {
        type: "choice",
        choice: "support",
        confidence: 0.5,
        probabilities: { billing: 0.0745, support: 0.8427, sales: 0.0828 },
      },
      urgency: {
        type: "score",
        score: 1.6092,
        confidence: 0.1074,
        legend: { 0: "not urgent", 1: "somewhat urgent", 2: "urgent", 3: "critical" },
        probabilities: { 0: 0.1263, 1: 0.2707, 2: 0.4707, 3: 0.1324 },
      },
      refund: { type: "noul", noul: 0.08 },
    };

    const result = await triage(clientWith(answers), ticket);

    // 発展(演習2-7)：もっとも確率の高い緊急度の段階の番号も取り出す
    // expect(result).toEqual({
    //   department: "support",
    //   departmentProbability: 0.8427,
    //   urgency: 1.6092,
    //   urgencyMostLikely: 2,
    //   refundProbability: 0.08,
    // });
    // 発展(演習2-7)ここまで．次の6行の代わりに使う
    expect(result).toEqual({
      department: "support",
      departmentProbability: 0.8427,
      urgency: 1.6092,
      refundProbability: 0.08,
    });
  });
});
