import { lstat, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createResearchOutputLink,
  listResearchReports,
  safeResearchName,
  writeCanonicalResearchReport,
} from "../../src/reporting/research-store.js";
import { createDashboardTestPaths } from "../fixtures/dashboard.js";
import { canonicalResearchReportFixture } from "../fixtures/research.js";

describe("research store", () => {
  it("sanitizes names and writes canonical JSON without overwriting collisions", async () => {
    const paths = await createDashboardTestPaths("research-store-");

    expect(safeResearchName("../Login Bug")).toBe("Login-Bug");
    const first = await writeCanonicalResearchReport({
      report: { ...canonicalResearchReportFixture, name: "../Login Bug" },
      researchDir: paths.researchDir,
      now: new Date("2026-05-14T01:02:03.004Z"),
    });
    const second = await writeCanonicalResearchReport({
      report: { ...canonicalResearchReportFixture, name: "../Login Bug" },
      researchDir: paths.researchDir,
      now: new Date("2026-05-14T01:02:03.004Z"),
    });

    expect(first.canonicalPath).not.toBe(second.canonicalPath);
    expect(JSON.parse(await readFile(first.canonicalPath, "utf8")).name).toBe(
      "Login-Bug",
    );
  });

  it("creates safe symlinks and reports unsafe existing paths", async () => {
    const paths = await createDashboardTestPaths("research-store-");
    const canonical = await writeCanonicalResearchReport({
      report: canonicalResearchReportFixture,
      researchDir: paths.researchDir,
    });
    const linkPath = join(paths.root, "current-research.json");

    const linked = await createResearchOutputLink({
      canonicalPath: canonical.canonicalPath,
      outputPath: linkPath,
    });
    expect(linked.outputLinkStatus).toBe("linked");
    expect((await lstat(linkPath)).isSymbolicLink()).toBe(true);

    const unsafePath = join(paths.root, "unsafe.json");
    await writeFile(unsafePath, "{}");
    const failed = await createResearchOutputLink({
      canonicalPath: canonical.canonicalPath,
      outputPath: unsafePath,
    });
    expect(failed.outputLinkStatus).toBe("failed");
  });

  it("indexes reports newest first and records skipped malformed files", async () => {
    const paths = await createDashboardTestPaths("research-store-");
    await writeCanonicalResearchReport({
      report: canonicalResearchReportFixture,
      researchDir: paths.researchDir,
      now: new Date("2026-05-14T01:02:03.004Z"),
    });
    await writeFile(join(paths.researchDir, "broken.json"), "not-json");

    const result = await listResearchReports({
      researchDir: paths.researchDir,
    });

    expect(result.reports[0]?.name).toBe("recLogin");
    expect(result.skippedFiles[0]?.reason).toContain("invalid");
  });
});
