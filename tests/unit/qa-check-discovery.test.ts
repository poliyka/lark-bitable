import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  discoverQaChecks,
  isUnsafeCommand,
} from "../../src/qa/check-discovery.js";

describe("QA check discovery", () => {
  it("discovers supported package scripts with repository evidence", async () => {
    const cwd = await mkdir(join(tmpdir(), `qa-discovery-${Date.now()}`), {
      recursive: true,
    });
    await writeFile(
      join(cwd, "package.json"),
      JSON.stringify({
        packageManager: "pnpm@10.0.0",
        scripts: {
          test: "vitest run",
          "test:e2e": "playwright test",
          lint: "eslint .",
          deploy: "git push",
        },
      }),
    );

    const checks = discoverQaChecks(cwd);

    expect(checks.map((check) => check.id)).toEqual([
      "script-test",
      "script-test-e2e",
      "script-lint",
    ]);
    expect(checks[0]?.command).toEqual(["pnpm", "run", "test"]);
    expect(checks[0]?.evidence[0]?.reference).toBe(join(cwd, "package.json"));
  });

  it("blocks unsupported or missing workspaces", async () => {
    const cwd = await mkdir(join(tmpdir(), `qa-empty-${Date.now()}`), {
      recursive: true,
    });

    const checks = discoverQaChecks(cwd);

    expect(checks).toHaveLength(1);
    expect(checks[0]).toMatchObject({
      id: "manual-workspace-check",
      safety: "blocked",
    });
  });

  it("detects unsafe command text", () => {
    expect(isUnsafeCommand("rm -rf dist && vitest run")).toBe(true);
    expect(isUnsafeCommand("vitest run")).toBe(false);
  });
});
