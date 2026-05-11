import { describe, expect, it } from "vitest";

import type { QaVerificationResult } from "../../src/config/schema.js";
import { renderQaVerificationReport } from "../../src/qa/verification-report.js";

describe("QA verification report", () => {
  it("renders executed checks, skipped checks, evidence, and redacts tokens", () => {
    const result: QaVerificationResult = {
      assumptions: ["Cause remains unconfirmed."],
      checkCandidates: [],
      evidence: [
        {
          id: "E1",
          type: "bug-record",
          reference: "recLogin",
          excerpt: "accessToken=secret",
          collectedAt: "2026-05-11T10:00:00.000Z",
          status: "verified",
        },
      ],
      executedChecks: [
        {
          candidateId: "script-test",
          command: ["pnpm", "test"],
          cwd: "/repo",
          evidence: [],
          exitCode: 0,
          finishedAt: "2026-05-11T10:01:00.000Z",
          outputExcerpt: "passed",
          startedAt: "2026-05-11T10:00:00.000Z",
          status: "passed",
        },
      ],
      manualNextSteps: ["Inspect media manually."],
      mode: "QA",
      nextActions: ["Download media."],
      observedFacts: ["Record was read. [E1]"],
      risks: ["Media not inspected."],
      skippedChecks: [
        {
          candidateId: "media",
          evidence: [],
          manualNextStep: "Download image with media download.",
          reason: "Media was not downloaded.",
        },
      ],
      taskSummary: {
        recordId: "recLogin",
        title: "Login bug",
      },
      workspaceEvidence: [],
    };

    const report = renderQaVerificationReport(result);

    expect(report).toContain("# QA Verification Report");
    expect(report).toContain("pnpm test: passed");
    expect(report).toContain("Media was not downloaded");
    expect(report).toContain("[E1] bug-record");
    expect(report).not.toContain("accessToken=secret");
    expect(report).toContain("accessToken=[REDACTED]");
  });
});
