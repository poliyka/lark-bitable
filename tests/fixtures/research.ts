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
