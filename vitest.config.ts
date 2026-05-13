import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      LARK_BITABLE_AUDIT_PATH: ".lark-bitable/test-audit.json",
    },
    include: ["tests/**/*.test.ts"],
    restoreMocks: true,
  },
});
