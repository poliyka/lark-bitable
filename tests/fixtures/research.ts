import type { ResearchEvidence } from "../../src/config/schema.js";

export const selectedBugFixture = {
  selectedRecordId: "recLogin",
  selectedAt: "2026-05-07T10:10:00.000Z",
  selectionEvidence: {
    filter: "狀態 equals 待處理",
    sort: "優先級 ascending",
  },
  candidateSnapshot: {
    title: "Login error",
    status: "待處理",
    priority: "P0",
  },
};

export const repositoryEvidenceFixture: ResearchEvidence[] = [
  {
    id: "E1",
    type: "repository-file",
    reference: "src/auth.ts",
    excerpt: "login handler reads credentials",
    collectedAt: "2026-05-07T10:11:00.000Z",
    status: "verified",
  },
];

export const canonicalResearchReportFixture = {
  schemaVersion: 1,
  name: "recLogin",
  createdAt: "2026-05-14T01:02:03.004Z",
  canonicalPath: "/tmp/recLogin-20260514T010203004Z.json",
  outputLinkPath: null,
  outputLinkStatus: "none",
  selectionMode: "Developer",
  selectedRecordId: "recLogin",
  ownerCriteria: null,
  bugSummary: "Selected record: recLogin",
  observedFacts: ["Selected bug record: recLogin [E1]"],
  assumptions: ["Repository analysis is limited to provided evidence."],
  analysis: ["Repository analysis has not been run."],
  likelyCauses: ["Unconfirmed until reproduction evidence is collected."],
  recommendedFixes: ["Inspect cited repository areas before editing."],
  risks: ["Missing runtime reproduction can hide the actual cause."],
  nextActions: ["Collect command-output evidence before implementation."],
  evidence: repositoryEvidenceFixture,
  markdown: "# Selected Bug Research Report\n",
};
