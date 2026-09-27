import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createFakeEngine } from "../../src/adapters/fake-engine.ts";
import { createApi } from "../../src/adapters/http-api.ts";

const engine = createFakeEngine({
  department: {
    kind: "choice",
    value: "billing",
    probability: 0.7253,
    confidence: 0.318,
    probabilities: { billing: 0.7253, support: 0.1994, sales: 0.0753 },
  },
  urgency: { kind: "scale", value: 1.4061, confidence: 0.0892, probabilities: [0.2147, 0.2574, 0.4349, 0.093] },
  refund: { kind: "yesno", probability: 0.8631 },
});

const server = createApi(engine, {});
let baseURL = "";

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

const post = (body: string): Promise<Response> =>
  fetch(`${baseURL}/triage`, { method: "POST", headers: { "Content-Type": "application/json" }, body });

describe("createApi", () => {
  test("POST /triageに件名と本文を送ると，振り分けの結果をJSONで返す", async () => {
    const response = await post('{"subject": "Refund not received", "body": "Where is my refund?"}');

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.json()).toEqual({
      department: "billing",
      departmentProbability: 0.7253,
      departmentConfidence: 0.318,
      needsReview: false,
      urgency: 1.4061,
      refundProbability: 0.8631,
    });
    expect(engine.calls.at(-1)?.state).toEqual({ subject: "Refund not received", body: "Where is my refund?" });
  });

  test("本文がJSONとして読めなければ，400を返す", async () => {
    const response = await post("not json");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "request body must be a JSON object with subject and body" });
  });

  test("件名か本文がなければ，400を返す", async () => {
    const response = await post('{"subject": "Refund not received"}');

    expect(response.status).toBe(400);
  });

  test("本文が64KBを超えれば，413を返す", async () => {
    const response = await post(JSON.stringify({ subject: "A", body: "x".repeat(70 * 1024) }));

    expect(response.status).toBe(413);
  });

  test("/triage以外のパスには，404を返す", async () => {
    const response = await fetch(`${baseURL}/other`);

    expect(response.status).toBe(404);
  });

  test("/triageにPOST以外で送ると，405を返す", async () => {
    const response = await fetch(`${baseURL}/triage`);

    expect(response.status).toBe(405);
  });
  // 発展(演習8-7)：死活確認のエンドポイント
  //
  // test("GET /healthzに，200と{\"status\": \"ok\"}を返す", async () => {
  //   const response = await fetch(`${baseURL}/healthz`);
  //
  //   expect(response.status).toBe(200);
  //   expect(await response.json()).toEqual({ status: "ok" });
  // });
  //
  // test("/healthzにGET以外で送ると，ほかのパスと同じく404を返す", async () => {
  //   const response = await fetch(`${baseURL}/healthz`, { method: "POST", body: "{}" });
  //
  //   expect(response.status).toBe(404);
  // });
  // 発展(演習8-7)ここまで

  test("判断エンジンが失敗したら，502を返す", async () => {
    const failing = createApi(createFakeEngine({}), {});
    await new Promise<void>((resolve) => failing.listen(0, resolve));
    const url = `http://127.0.0.1:${(failing.address() as AddressInfo).port}/triage`;

    const response = await fetch(url, { method: "POST", body: '{"subject": "A", "body": "a"}' });

    expect(response.status).toBe(502);
    failing.close();
  });
});
