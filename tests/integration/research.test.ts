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

  it("accepts explicit research section inputs instead of relying on placeholder defaults", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "research-"));
    const researchDir = join(cwd, "research");
    new ConfigStore({ cwd }).setSelection(selectedBugFixture);

    const result = await ResearchCommand.run([
      "--config-cwd",
      cwd,
      "--research-dir",
      researchDir,
      "--title",
      "OAuth callback investigation",
      "--original-detail",
      "Original ticket says the login spinner never stops.",
      "--original-detail",
      "User reproduced the issue on Safari.",
      "--evidence",
      "repository-file:src/auth.ts:login handler sets loading state",
      "--assumption",
      "Production OAuth config may differ from local fixtures.",
      "--likely-cause",
      "Loading state is not cleared after OAuth callback failure [E2]",
      "--recommended-fix",
      "Reset loading state in the OAuth failure branch [E2]",
      "--risk",
      "Fix may hide a separate token refresh failure.",
      "--next-action",
      "Run the login integration test with callback failure evidence.",
      "--json",
    ]);

    const reportPath = String(result.data?.reportPath);
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    expect(report.name).toBe("OAuth callback investigation");
    expect(report.originalDetails).toEqual([
      "Original ticket says the login spinner never stops.",
      "User reproduced the issue on Safari.",
    ]);
    expect(report.assumptions).toEqual([
      "Production OAuth config may differ from local fixtures.",
    ]);
    expect(report.likelyCauses).toEqual([
      "Loading state is not cleared after OAuth callback failure [E2]",
    ]);
    expect(report.recommendedFixes).toEqual([
      "Reset loading state in the OAuth failure branch [E2]",
    ]);
    expect(report.risks).toEqual([
      "Fix may hide a separate token refresh failure.",
    ]);
    expect(report.nextActions).toEqual([
      "Run the login integration test with callback failure evidence.",
    ]);
    expect(report.markdown).not.toContain(
      "Repository analysis is limited to provided evidence.",
    );
    expect(report.markdown).not.toContain(
      "Unconfirmed until reproduction evidence is collected.",
    );
    expect(report.markdown).not.toContain(
      "Inspect cited repository areas before editing.",
    );
    expect(report.markdown).not.toContain(
      "Missing runtime reproduction can hide the actual cause.",
    );
    expect(report.markdown).not.toContain(
      "Collect command-output evidence before implementation.",
    );
  });

  it("fails when no selected bug is available", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "research-"));

    await expect(ResearchCommand.run(["--config-cwd", cwd])).rejects.toThrow(
      "Research requires a selected bug",
    );
  });
});
