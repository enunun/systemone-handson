import { describe, expect, test } from "vitest";
import { createFakeEngine } from "../../../src/adapters/fake-engine.ts";
import { createTimingEngine } from "../../../src/adapters/timing-engine.ts";

const questions = {
  angry: { kind: "yesno", prompt: "Angry?" },
  refund: { kind: "yesno", prompt: "Refund?" },
} as const;

const fake = () =>
  createFakeEngine({ angry: { kind: "yesno", probability: 0.9 }, refund: { kind: "yesno", probability: 0.1 } });

describe("createTimingEngine", () => {
  test("包んだ判断エンジンの答えを，そのまま返す", async () => {
    const inner = fake();
    const engine = createTimingEngine(inner, () => {});

    const result = await engine.decide({ subject: "Hi" }, questions);

    expect(result).toEqual({
      angry: { kind: "yesno", probability: 0.9 },
      refund: { kind: "yesno", probability: 0.1 },
    });
    expect(inner.calls).toEqual([{ state: { subject: "Hi" }, questions }]);
  });

  test("質問の数と，かかった時間を記録する", async () => {
    const lines: string[] = [];
    const engine = createTimingEngine(fake(), (line) => lines.push(line));

    await engine.decide({ subject: "Hi" }, questions);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^decide: 2 questions in \d+ ms$/);
  });
});
