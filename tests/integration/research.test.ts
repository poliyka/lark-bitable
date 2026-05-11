import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import ResearchCommand from "../../src/cli/commands/research.js";
import { ConfigStore } from "../../src/config/store.js";
import { selectedBugFixture } from "../fixtures/research.js";

describe("research command", () => {
  it("writes an evidence-backed report for the previous selection", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "research-"));
    const out = join(cwd, "report.md");
    new ConfigStore({ cwd }).setSelection(selectedBugFixture);

    const result = await ResearchCommand.run([
      "--config-cwd",
      cwd,
      "--out",
      out,
      "--evidence",
      "repository-file:src/auth.ts:auth handler exists",
      "--json",
    ]);

    const report = await readFile(out, "utf8");
    expect(JSON.stringify(result)).toContain(out);
    expect(report).toContain("## Evidence");
    expect(report).toContain("recLogin");
  });

  it("fails when no selected bug is available", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "research-"));

    await expect(ResearchCommand.run(["--config-cwd", cwd])).rejects.toThrow(
      "Research requires a selected bug",
    );
  });
});
