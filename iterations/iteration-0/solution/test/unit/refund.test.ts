import { describe, expect, test } from "vitest";
import { formatRefund } from "../../src/refund.ts";

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
