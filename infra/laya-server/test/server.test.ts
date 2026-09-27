import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, test } from "vitest";
import { createLayaServer, type Engine } from "../src/server.ts";

// モデルを読み込まずに試すため，決まった答えを返すエンジンを使う．
const stubEngine: Engine = async (_state, questions) => ({
  model: "laya",
  answers: Object.fromEntries(
    Object.keys(questions).map((name) => [name, { type: "noul", noul: 0.7, rl_agent: { act_probability: 0.7 } }]),
  ),
  usage: { input_tokens: 5, output_tokens: 0 },
});

let engine: Engine | null = null;
const server = createLayaServer({ engine: () => engine });
let baseURL = "";

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => server.close());

const post = (body: unknown): Promise<Response> =>
  fetch(`${baseURL}/v1/systemone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const request = { state: "I want a refund", questions: { refund: { type: "noul", instructions: "Refund?" } } };

test("モデルの読み込み中は503を返す", async () => {
  engine = null;
  assert.equal((await fetch(`${baseURL}/healthz`)).status, 503);
  assert.equal((await post(request)).status, 503);
});

test("読み込み後は，Jevと同じ形で答える", async () => {
  engine = stubEngine;
  assert.equal((await fetch(`${baseURL}/healthz`)).status, 200);

  const res = await post(request);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    model: "laya",
    answers: { refund: { type: "noul", noul: 0.7 } },
    usage: { input_tokens: 5, output_tokens: 0 },
  });
});

test("誤ったリクエストには，Jevの形のエラーを返す", async () => {
  engine = stubEngine;
  const res = await post({ state: "x", questions: {} });
  assert.equal(res.status, 422);
  assert.deepEqual(await res.json(), { error: { message: "questions: at least one question is required" } });
});

test("モデルの一覧を返す", async () => {
  const res = await fetch(`${baseURL}/v1/models`);
  const body = (await res.json()) as { models: { name: string }[] };
  assert.equal(body.models[0]?.name, "laya");
});
