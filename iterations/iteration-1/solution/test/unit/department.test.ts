import { describe, expect, test } from "vitest";
import { formatDepartment } from "../../src/department.ts";

describe("formatDepartment", () => {
  test("選ばれた部署と，その確率を表示する", () => {
    const answer = {
      type: "choice",
      choice: "billing",
      confidence: 0.32,
      probabilities: { billing: 0.7253, support: 0.1994, sales: 0.0753 },
    } as const;
    expect(formatDepartment(answer)).toBe("department: billing (0.73)");
  });

  test("確率の分布から，選ばれた部署の確率を取り出す", () => {
    const answer = {
      type: "choice",
      choice: "support",
      confidence: 0.5,
      probabilities: { billing: 0.0745, support: 0.8427, sales: 0.0828 },
    } as const;
    expect(formatDepartment(answer)).toBe("department: support (0.84)");
  });
});
