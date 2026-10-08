import { describe, expect, test } from "vitest";
import {
  formatConfusionMatrix,
  formatDepartment,
  formatEvaluation,
  formatRefund,
  formatReport,
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
        "actual \\ predicted   billing   support     sales",
        "billing                    8         2         1",
        "support                    0        11         0",
        "sales                      3         2         3",
      ].join("\n"),
    );
  });
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

describe("formatReport", () => {
  test("部署の評価，部署ごとの適合率と再現率の表，返金・緊急度・所要時間の指標を表示する", () => {
    const report = {
      evaluation: { minConfidence: 0.2, total: 4, autoRouted: 3, correct: 2, accuracy: 2 / 3, reviewRate: 1 / 4 },
      // 発展(演習9-7)：F1を足す
      // departments: {
      //   billing: { precision: 1, recall: 0.5, f1: 2 / 3 },
      //   support: { precision: 1 / 3, recall: 1, f1: 0.5 },
      //   sales: { precision: undefined, recall: 0, f1: undefined },
      // },
      // 発展(演習9-7)ここまで．次の5行の代わりに使う
      departments: {
        billing: { precision: 1, recall: 0.5 },
        support: { precision: 1 / 3, recall: 1 },
        sales: { precision: undefined, recall: 0 },
      },
      refund: { accuracy: 0.75, brierScore: 0.105 },
      urgencyError: 0.625,
      latency: { median: 200.4, p95: 400 },
    };

    expect(formatReport(report)).toBe(
      [
        "accuracy: 0.67 (auto-routed 3 / 4), review rate: 0.25",
        "",
        // 発展(演習9-7)：F1の列を足す
        // "department  precision  recall    f1",
        // "billing          1.00    0.50  0.67",
        // "support          0.33    1.00  0.50",
        // "sales             n/a    0.00   n/a",
        // 発展(演習9-7)ここまで．次の4行の代わりに使う
        "department  precision  recall",
        "billing          1.00    0.50",
        "support          0.33    1.00",
        "sales             n/a    0.00",
        "",
        "refund accuracy: 0.75, brier score: 0.105",
        "urgency mean absolute error: 0.63",
        "latency median: 200 ms, p95: 400 ms",
      ].join("\n"),
    );
  });

  test("記録がなく指標を求められないときは，n/aと表示する", () => {
    const report = {
      evaluation: { minConfidence: 0.2, total: 0, autoRouted: 0, correct: 0, accuracy: undefined, reviewRate: 0 },
      departments: {},
      refund: { accuracy: undefined, brierScore: undefined },
      urgencyError: undefined,
      latency: { median: undefined, p95: undefined },
    };

    expect(formatReport(report).split("\n").slice(-3)).toEqual([
      "refund accuracy: n/a, brier score: n/a",
      "urgency mean absolute error: n/a",
      "latency median: n/a, p95: n/a",
    ]);
  });
});
