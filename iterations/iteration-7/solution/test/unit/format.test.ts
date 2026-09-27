import { describe, expect, test } from "vitest";
import {
  formatConfusionMatrix,
  formatDepartment,
  formatEvaluation,
  formatRefund,
  formatSummary,
  formatSweep,
  formatTriage,
  formatUrgency,
} from "../../src/format.ts";

describe("formatDepartment", () => {
  test("部署と，その確率を表示する", () => {
    expect(formatDepartment("billing", 0.7253, false)).toBe("department: billing (0.73)");
  });

  test("人の確認に回すなら，末尾に印を付ける", () => {
    expect(formatDepartment("sales", 0.4394, true)).toBe("department: sales (0.44) -> needs review");
  });
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
    const triage = {
      department: "billing",
      departmentProbability: 0.7253,
      departmentConfidence: 0.318,
      needsReview: false,
      urgency: 1.4061,
      refundProbability: 0.8631,
    };
    expect(formatTriage(triage)).toBe("department: billing (0.73)\nurgency: somewhat urgent (1.4)\nrefund: yes (0.86)");
  });
});

describe("formatSummary", () => {
  test("部署ごとの件数と，人の確認に回した件数を1行で表示する", () => {
    const summary = { departments: { billing: 5, support: 7, sales: 1 }, needsReview: 8 };
    expect(formatSummary(summary)).toBe("billing: 5, support: 7, sales: 1, needs review: 8");
  });
});

const evaluation = (minConfidence: number, autoRouted: number, correct: number) => ({
  minConfidence,
  total: 30,
  autoRouted,
  correct,
  accuracy: autoRouted === 0 ? undefined : correct / autoRouted,
  reviewRate: (30 - autoRouted) / 30,
});

describe("formatEvaluation", () => {
  test("正解率・自動で振り分けた件数・人の確認に回る割合を1行で表示する", () => {
    expect(formatEvaluation(evaluation(0.2, 7, 6))).toBe("accuracy: 0.86 (auto-routed 7 / 30), review rate: 0.77");
  });

  test("自動で振り分けたものがなければ，正解率をn/aと表示する", () => {
    expect(formatEvaluation(evaluation(0.9, 0, 0))).toBe("accuracy: n/a (auto-routed 0 / 30), review rate: 1.00");
  });
});

describe("formatConfusionMatrix", () => {
  test("行を正解の部署，列を判定した部署とした表にする", () => {
    const matrix = {
      billing: { billing: 8, support: 2, sales: 1 },
      support: { billing: 0, support: 11, sales: 0 },
      sales: { billing: 3, support: 2, sales: 3 },
    };
    expect(formatConfusionMatrix(matrix)).toBe(
      [
        // 発展(演習7-7)：各行の右に再現率の列が加わる
        // "actual \\ predicted   billing   support     sales    recall",
        // "billing                    8         2         1      0.73",
        // "support                    0        11         0      1.00",
        // "sales                      3         2         3      0.38",
        // 発展(演習7-7)ここまで．次の4行の代わりに使う
        "actual \\ predicted   billing   support     sales",
        "billing                    8         2         1",
        "support                    0        11         0",
        "sales                      3         2         3",
      ].join("\n"),
    );
  });
  // 発展(演習7-7)：行の合計が0なら，再現率をn/aとする
  //
  // test("行の合計が0なら，再現率をn/aとする", () => {
  //   const matrix = {
  //     billing: { billing: 1, support: 0, sales: 0 },
  //     support: { billing: 0, support: 0, sales: 0 },
  //     sales: { billing: 0, support: 0, sales: 1 },
  //   };
  //   expect(formatConfusionMatrix(matrix).split("\n")[2]).toBe("support                    0         0         0       n/a");
  // });
  // 発展(演習7-7)ここまで
});

describe("formatSweep", () => {
  test("しきい値ごとの評価を表にする", () => {
    expect(formatSweep([evaluation(0, 30, 22), evaluation(0.5, 0, 0)])).toBe(
      [
        "min-confidence  auto-routed  accuracy  review rate",
        "0.0                      30      0.73         0.00",
        "0.5                       0       n/a         1.00",
      ].join("\n"),
    );
  });
});
