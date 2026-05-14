import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  getDashboardResearchReport,
  listDashboardResearchReports,
} from "../../src/dashboard/research-service.js";
import { writeCanonicalResearchReport } from "../../src/reporting/research-store.js";
import { createDashboardTestPaths } from "../fixtures/dashboard.js";
import { canonicalResearchReportFixture } from "../fixtures/research.js";

describe("dashboard research service", () => {
  it("lists, searches, and loads canonical research reports", async () => {
    const paths = await createDashboardTestPaths("dashboard-research-");
    const written = await writeCanonicalResearchReport({
      report: canonicalResearchReportFixture,
      researchDir: paths.researchDir,
    });
    await writeFile(join(paths.researchDir, "broken.json"), "{");

    const list = await listDashboardResearchReports({
      researchDir: paths.researchDir,
      text: "recLogin",
    });
    const detail = await getDashboardResearchReport({
      reportId: list.reports[0]?.reportId ?? "",
      researchDir: paths.researchDir,
    });

    expect(list.reports[0]?.canonicalPath).toBe(written.canonicalPath);
    expect(list.skippedFiles[0]?.reason).toContain("invalid");
    expect(detail.report.observedFacts[0]).toContain("[E1]");
  });

  it("rejects unsafe report ids", async () => {
    const paths = await createDashboardTestPaths("dashboard-research-");
    await expect(
      getDashboardResearchReport({
        reportId: "../config",
        researchDir: paths.researchDir,
      }),
    ).rejects.toThrow("Unsafe research report id");
  });
});
