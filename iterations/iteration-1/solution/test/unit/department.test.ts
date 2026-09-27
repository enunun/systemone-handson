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
    // 発展(演習1-7)：2番目に確からしい部署を添える
    // expect(formatDepartment(answer)).toBe("department: billing (0.73, next: support 0.20)");
    // 発展(演習1-7)ここまで．次の1行の代わりに使う
    expect(formatDepartment(answer)).toBe("department: billing (0.73)");
  });

  test("確率の分布から，選ばれた部署の確率を取り出す", () => {
    const answer = {
      type: "choice",
      choice: "support",
      confidence: 0.5,
      probabilities: { billing: 0.0745, support: 0.8427, sales: 0.0828 },
    } as const;
    // 発展(演習1-7)：2番目に確からしい部署を添える
    // expect(formatDepartment(answer)).toBe("department: support (0.84, next: sales 0.08)");
    // 発展(演習1-7)ここまで．次の1行の代わりに使う
    expect(formatDepartment(answer)).toBe("department: support (0.84)");
  });
  // 発展(演習1-7)：2番目に確からしい部署を，確率の大きい順に並べて選ぶ
  //
  // test("2番目に確からしい部署とその確率を添える", () => {
  //   const answer = {
  //     type: "choice",
  //     choice: "sales",
  //     confidence: 0.2,
  //     probabilities: { billing: 0.2, support: 0.1, sales: 0.7 },
  //   } as const;
  //   expect(formatDepartment(answer)).toBe("department: sales (0.70, next: billing 0.20)");
  // });
  // 発展(演習1-7)ここまで
});
