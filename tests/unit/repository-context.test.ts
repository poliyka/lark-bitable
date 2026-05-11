import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  discoverRepositoryContext,
  parseEvidenceArgument,
} from "../../src/reporting/repository-context.js";

describe("repository context discovery", () => {
  it("discovers package manager, scripts, test directories, and evidence", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "repository-context-"));
    await writeFile(
      join(cwd, "package.json"),
      JSON.stringify({
        packageManager: "pnpm@10.0.0",
        scripts: {
          test: "vitest run",
          "test:e2e": "playwright test",
          typecheck: "tsc -p tsconfig.json",
        },
      }),
    );
    await mkdir(join(cwd, "tests"));
    await writeFile(join(cwd, "tests", "sample.test.ts"), "export {};\n");

    const context = discoverRepositoryContext(cwd);

    expect(context.packageManager).toBe("pnpm");
    expect(context.scripts).toMatchObject({
      test: "vitest run",
      "test:e2e": "playwright test",
      typecheck: "tsc -p tsconfig.json",
    });
    expect(context.testDirectories).toEqual([join(cwd, "tests")]);
    expect(context.evidence.map((item) => item.reference)).toEqual([
      join(cwd, "package.json"),
      join(cwd, "tests"),
    ]);
    expect(context.evidence[0]?.excerpt).toContain("test:e2e");
  });

  it("returns empty context when workspace evidence is absent", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "repository-context-empty-"));

    expect(discoverRepositoryContext(cwd)).toEqual({
      evidence: [],
      packageManager: undefined,
      scripts: {},
      testDirectories: [],
    });
  });

  it("parses explicit evidence arguments without dropping colon text", () => {
    const evidence = parseEvidenceArgument(
      "repository-file:src/auth.ts:handler keeps http://callback intact",
    );

    expect(evidence).toMatchObject({
      type: "repository-file",
      reference: "src/auth.ts",
      excerpt: "handler keeps http://callback intact",
      status: "verified",
    });
  });
});
