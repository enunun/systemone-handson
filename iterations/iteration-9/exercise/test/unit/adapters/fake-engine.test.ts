import { describe, expect, test } from "vitest";
import { createFakeEngine } from "../../../src/adapters/fake-engine.ts";

describe("createFakeEngine", () => {
  test("質問の名前ごとに，決めておいた答えを返す", async () => {
    const engine = createFakeEngine({ angry: { kind: "yesno", probability: 0.9 } });

    const result = await engine.decide({ subject: "Hi" }, { angry: { kind: "yesno", prompt: "Angry?" } });

    expect(result).toEqual({ angry: { kind: "yesno", probability: 0.9 } });
  });

  test("受け取った状態と質問を記録する", async () => {
    const engine = createFakeEngine({ angry: { kind: "yesno", probability: 0.9 } });

    await engine.decide({ subject: "Hi" }, { angry: { kind: "yesno", prompt: "Angry?" } });

    expect(engine.calls).toEqual([
      { state: { subject: "Hi" }, questions: { angry: { kind: "yesno", prompt: "Angry?" } } },
    ]);
  });

  test("答えを決めていない質問を尋ねられたら，例外を投げる", async () => {
    const engine = createFakeEngine({});

    await expect(engine.decide({}, { angry: { kind: "yesno", prompt: "Angry?" } })).rejects.toThrow(
      'the fake engine has no answer for "angry"',
    );
  });
});
