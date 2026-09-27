import { defineConfig } from "vitest/config";

// 単体テスト(test/unit)と結合テスト(test/integration)を，別のプロジェクトとして実行する．
// `pnpm test --project unit`のように，片方だけを実行できる．
export default defineConfig({
  test: {
    projects: [
      { extends: true, test: { name: "unit", include: ["test/unit/**/*.test.ts"] } },
      { extends: true, test: { name: "integration", include: ["test/integration/**/*.test.ts"] } },
    ],
  },
});
