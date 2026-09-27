import { describe, expect, test } from "vitest";
import { formatDepartment, formatRefund, formatTriage, formatUrgency } from "../../src/format.ts";

describe("formatDepartment", () => {
  test("部署と，その確率を表示する", () => {
    expect(formatDepartment("billing", 0.7253, false)).toBe("department: billing (0.73)");
  });

  test("人の確認に回すなら，末尾に印を付ける", () => {
    expect(formatDepartment("sales", 0.4394, true)).toBe("department: sales (0.44) -> needs review");
  });
  // 発展(演習4-7)：確信度を表示する
  //
  // test("確信度を渡されたら，確率の後ろに表示する", () => {
  //   expect(formatDepartment("sales", 0.4394, true, 0.0229)).toBe(
  //     "department: sales (0.44, confidence 0.02) -> needs review",
  //   );
  // });
  // 発展(演習4-7)ここまで
});

describe("formatUrgency", () => {
  test("期待値にもっとも近い段階の名前と，期待値を表示する", () => {
    expect(formatUrgency(2.4387)).toBe("urgency: urgent (2.4)");
  });

  test("期待値が段階のちょうど中間なら，上の段階にする", () => {
    expect(formatUrgency(0.5)).toBe("urgency: somewhat urgent (0.5)");
  });

  test("期待値が0なら最も低い段階，3なら最も高い段階にする", () => {
    expect(formatUrgency(0)).toBe("urgency: not urgent (0.0)");
    expect(formatUrgency(3)).toBe("urgency: critical (3.0)");
  });
});

describe("formatRefund", () => {
  test("確率が0.5以上ならyesと表示する", () => {
    expect(formatRefund(0.86)).toBe("refund: yes (0.86)");
  });

  test("確率が0.5未満ならnoと表示する", () => {
    expect(formatRefund(0.08)).toBe("refund: no (0.08)");
  });

  test("確率がちょうど0.5ならyesと表示する", () => {
    expect(formatRefund(0.5)).toBe("refund: yes (0.50)");
  });

  test("確率を小数第2位までに丸める", () => {
    expect(formatRefund(0.8631)).toBe("refund: yes (0.86)");
  });
});

describe("formatTriage", () => {
  test("部署・緊急度・返金の判定を，この順に1項目1行で表示する", () => {
    // 発展(演習4-7)：Triageに部署の確信度が加わる
    // const triage = {
    //   department: "billing",
    //   departmentProbability: 0.7253,
    //   departmentConfidence: 0.318,
    //   needsReview: false,
    //   urgency: 1.4061,
    //   refundProbability: 0.8631,
    // };
    // 発展(演習4-7)ここまで．次の7行の代わりに使う
    const triage = {
      department: "billing",
      departmentProbability: 0.7253,
      needsReview: false,
      urgency: 1.4061,
      refundProbability: 0.8631,
    };
    expect(formatTriage(triage)).toBe("department: billing (0.73)\nurgency: somewhat urgent (1.4)\nrefund: yes (0.86)");
  });
  // 発展(演習4-7)：showConfidenceが真なら，部署の行に確信度を表示する
  //
  // test("showConfidenceが真なら，部署の行に確信度を表示する", () => {
  //   const triage = {
  //     department: "billing",
  //     departmentProbability: 0.7253,
  //     departmentConfidence: 0.318,
  //     needsReview: false,
  //     urgency: 1.4061,
  //     refundProbability: 0.8631,
  //   };
  //   expect(formatTriage(triage, true).split("\n")[0]).toBe("department: billing (0.73, confidence 0.32)");
  // });
  // 発展(演習4-7)ここまで
});
