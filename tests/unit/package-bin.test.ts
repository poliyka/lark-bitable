import { access, readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("package binary contract", () => {
  it("exposes only the lark-bitable system command", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      bin?: Record<string, string>;
    };

    expect(packageJson.bin).toEqual({
      "lark-bitable": "bin/run.js",
    });
  });

  it("ships the dashboard command module through oclif command discovery", async () => {
    await expect(
      access("src/cli/commands/dashboard.ts"),
    ).resolves.toBeUndefined();
  });
});
