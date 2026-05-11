import type {
  QaCheckCandidate,
  QaVerificationResult,
} from "../../src/config/schema.js";
import { toEvidence } from "../../src/reporting/evidence.js";

export const qaTaskFixture = {
  recordId: "recQaTask",
  title: "QA verification task",
};

export const workspaceEvidenceFixture = toEvidence({
  type: "repository-file",
  reference: "package.json",
  excerpt: "package.json scripts: test, test:e2e, lint",
  status: "verified",
});

export const safeQaCheckFixture: QaCheckCandidate = {
  command: ["pnpm", "run", "test"],
  confidence: "high",
  cwd: "/repo",
  evidence: [workspaceEvidenceFixture],
  id: "script-test",
  kind: "unit-test",
  safety: "safe",
};

export const unsafeQaCheckFixture: QaCheckCandidate = {
  command: ["pnpm", "run", "deploy"],
  confidence: "low",
  cwd: "/repo",
  evidence: [workspaceEvidenceFixture],
  id: "script-deploy",
  kind: "other",
  safety: "blocked",
  skipReason: "Script contains unsafe command text: git push",
};

export const qaVerificationFixture: QaVerificationResult = {
  assumptions: ["Root cause is not confirmed by QA verification."],
  checkCandidates: [safeQaCheckFixture, unsafeQaCheckFixture],
  evidence: [workspaceEvidenceFixture],
  executedChecks: [],
  manualNextSteps: ["Run manual reproduction and attach command output."],
  mode: "QA",
  nextActions: ["Download listed media before using it as evidence."],
  observedFacts: ["Selected task record recQaTask was read from Lark. [E1]"],
  risks: ["No automated QA check was executed."],
  skippedChecks: [
    {
      candidateId: "script-deploy",
      evidence: [workspaceEvidenceFixture],
      manualNextStep: "Use a safe local check instead.",
      reason: "Script contains unsafe command text: git push",
    },
  ],
  taskSummary: qaTaskFixture,
  workspaceEvidence: [workspaceEvidenceFixture],
};
