import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import ResearchCommand from "../../src/cli/commands/research.js";
import { listDashboardResearchReports } from "../../src/dashboard/research-service.js";
import { ConfigStore } from "../../src/config/store.js";
import { createDashboardTestPaths } from "../fixtures/dashboard.js";
import { selectedBugFixture } from "../fixtures/research.js";

describe("research dashboard integration", () => {
  it("writes canonical JSON and links -o output paths", async () => {
    const paths = await createDashboardTestPaths("research-dashboard-");
    const out = join(paths.root, "current-research.json");
    new ConfigStore({ cwd: paths.configCwd }).setSelection(selectedBugFixture);

    const result = await ResearchCommand.run([
      "--config-cwd",
      paths.configCwd,
      "--research-dir",
      paths.researchDir,
      "-o",
      out,
      "--json",
    ]);
    const canonicalPath = result.data?.reportPath;
    const report = JSON.parse(await readFile(String(canonicalPath), "utf8"));
    const index = await listDashboardResearchReports({
      researchDir: paths.researchDir,
    });

    expect((await lstat(out)).isSymbolicLink()).toBe(true);
    expect(report.schemaVersion).toBe(1);
    expect(report.markdown).toContain("## Evidence");
    expect(result.data?.reportFile.outputLinkStatus).toBe("linked");
    expect(index.reports[0]?.canonicalPath).toBe(canonicalPath);
  });
});
