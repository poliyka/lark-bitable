import { describe, expect, it } from "vitest";

import {
  buildStructuredResearchReport,
  renderResearchReport,
} from "../../src/reporting/research-report.js";
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

  it("uses the selected ticket id as the default report title and includes original detail fields", () => {
    const selectedBug = {
      ...selectedBugFixture,
      candidateSnapshot: {
        ...selectedBugFixture.candidateSnapshot,
        title: "登入頁送出後卡住",
        originalDescription: "使用者按下登入後 spinner 持續轉動。",
        reproductionSteps: "1. 開啟登入頁\n2. 輸入帳密\n3. 按下送出",
        expectedBehavior: "成功進入首頁。",
        actualBehavior: "停留在登入頁且沒有錯誤訊息。",
      },
    };

    const structured = buildStructuredResearchReport({
      selectedBug,
      evidence: repositoryEvidenceFixture,
      repositoryFindings: ["Auth handler exists [E1]"],
    });
    const markdown = renderResearchReport({
      selectedBug,
      evidence: repositoryEvidenceFixture,
      repositoryFindings: ["Auth handler exists [E1]"],
    });

    expect(structured.name).toBe("recLogin");
    expect(structured.bugSummary).toContain("recLogin");
    expect(markdown).toContain("# recLogin");
    expect(markdown).toContain("## Original Details");
    expect(markdown).toContain(
      "originalDescription: 使用者按下登入後 spinner 持續轉動。",
    );
    expect(markdown).toContain("reproductionSteps: 1. 開啟登入頁");
    expect(markdown).toContain("expectedBehavior: 成功進入首頁。");
    expect(markdown).toContain("actualBehavior: 停留在登入頁且沒有錯誤訊息。");
  });

  it("accepts an explicit report title and original detail entries", () => {
    const structured = buildStructuredResearchReport({
      selectedBug: selectedBugFixture,
      evidence: repositoryEvidenceFixture,
      repositoryFindings: ["Auth handler exists [E1]"],
      title: "登入流程研究報告",
      originalDetails: [
        "使用者回報登入按鈕點擊後沒有轉跳。",
        "原始 ticket 補充：只在 Safari 重現。",
      ],
    });
    const markdown = renderResearchReport({
      selectedBug: selectedBugFixture,
      evidence: repositoryEvidenceFixture,
      repositoryFindings: ["Auth handler exists [E1]"],
      title: "登入流程研究報告",
      originalDetails: [
        "使用者回報登入按鈕點擊後沒有轉跳。",
        "原始 ticket 補充：只在 Safari 重現。",
      ],
    });

    expect(structured.name).toBe("登入流程研究報告");
    expect(structured.originalDetails).toEqual([
      "使用者回報登入按鈕點擊後沒有轉跳。",
      "原始 ticket 補充：只在 Safari 重現。",
    ]);
    expect(markdown).toContain("# 登入流程研究報告");
    expect(markdown).toContain("使用者回報登入按鈕點擊後沒有轉跳。");
    expect(markdown).toContain("原始 ticket 補充：只在 Safari 重現。");
  });

  it("includes original details saved under localized Bitable field names", () => {
    const selectedBug = {
      ...selectedBugFixture,
      candidateSnapshot: {
        ...selectedBugFixture.candidateSnapshot,
        標題: "登入錯誤單",
        原始詳細敘述: "表單送出後沒有回應，使用者只能重整頁面。",
      },
    };

    const markdown = renderResearchReport({
      selectedBug,
      evidence: repositoryEvidenceFixture,
      repositoryFindings: ["Auth handler exists [E1]"],
    });

    expect(markdown).toContain("# recLogin");
    expect(markdown).toContain(
      "原始詳細敘述: 表單送出後沒有回應，使用者只能重整頁面。",
    );
  });
});
