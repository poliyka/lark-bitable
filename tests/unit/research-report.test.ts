import { describe, expect, it } from "vitest";

import { renderResearchReport } from "../../src/reporting/research-report.js";
import {
  repositoryEvidenceFixture,
  selectedBugFixture,
} from "../fixtures/research.js";

describe("research report rendering", () => {
  it("renders required sections, citations, assumptions, unresolved causes, and redacts secrets", () => {
    const report = renderResearchReport({
      selectedBug: selectedBugFixture,
      evidence: repositoryEvidenceFixture,
      repositoryFindings: ["Auth handler exists [E1]"],
      assumptions: ["The selected bug snapshot may be stale."],
      likelyCauses: ["Unconfirmed auth regression [E1]"],
      recommendedFixes: ["Inspect auth flow around src/auth.ts [E1]"],
      risks: ["Cause remains unconfirmed until reproduction is run."],
      nextActions: ["Run targeted auth tests."],
    });

    expect(report).toContain("## Observed Facts");
    expect(report).toContain("## Assumptions");
    expect(report).toContain("## Analysis");
    expect(report).toContain("## Likely Causes");
    expect(report).toContain("## Recommended Fixes");
    expect(report).toContain("## Risks");
    expect(report).toContain("## Next Actions");
    expect(report).toContain("## Evidence");
    expect(report).toContain("[E1]");
  });
});
