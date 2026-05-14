import { lstat, mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import ResearchCommand from "../../src/cli/commands/research.js";
import { ConfigStore } from "../../src/config/store.js";
import { selectedBugFixture } from "../fixtures/research.js";

describe("research command", () => {
  it("writes an evidence-backed report for the previous selection", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "research-"));
    const out = join(cwd, "report.json");
    const researchDir = join(cwd, "research");
    new ConfigStore({ cwd }).setSelection(selectedBugFixture);

    const result = await ResearchCommand.run([
      "--config-cwd",
      cwd,
      "--out",
      out,
      "--research-dir",
      researchDir,
      "--evidence",
      "repository-file:src/auth.ts:auth handler exists",
      "--json",
    ]);

    const reportPath = String(result.data?.reportPath);
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    expect(JSON.stringify(result)).toContain(out);
    expect((await lstat(out)).isSymbolicLink()).toBe(true);
    expect(report.markdown).toContain("## Evidence");
    expect(report.markdown).toContain("recLogin");
    expect(result.data?.reportFile.outputLinkStatus).toBe("linked");
  });

  it("fails when no selected bug is available", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "research-"));

    await expect(ResearchCommand.run(["--config-cwd", cwd])).rejects.toThrow(
      "Research requires a selected bug",
    );
  });
});
