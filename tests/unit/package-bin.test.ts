import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("package binary contract", () => {
  it("exposes only the lark-bitable system command", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      bin?: Record<string, string>;
    };

    expect(packageJson.bin).toEqual({
      "lark-bitable": "./bin/run.js",
    });
  });
});
