import type {
  OwnerCriteria,
  ResearchEvidence,
  ResearchReport,
  TriageSelection,
  WorkflowMode,
} from "../config/schema.js";
import { assertClaimsHaveEvidence, redactSecrets } from "./evidence.js";

export interface RenderResearchReportInput {
  assumptions?: string[];
  evidence: ResearchEvidence[];
  likelyCauses?: string[];
  nextActions?: string[];
  recommendedFixes?: string[];
  repositoryFindings?: string[];
  risks?: string[];
  selectedBug: TriageSelection;
}

export interface StructuredResearchReportMetadata {
  name?: string;
  ownerCriteria?: OwnerCriteria | null;
  selectionMode?: WorkflowMode | null;
}

function list(items: string[]): string {
  return items.length > 0
    ? items.map((item) => `- ${redactSecrets(item)}`).join("\n")
    : "- None recorded.";
}

export function renderResearchReport(input: RenderResearchReportInput): string {
  return renderStructuredResearchReport(buildStructuredResearchReport(input));
}

export function buildStructuredResearchReport(
  input: RenderResearchReportInput,
  metadata: StructuredResearchReportMetadata = {},
): ResearchReport & {
  name: string;
  ownerCriteria: OwnerCriteria | null;
  selectedRecordId: string;
  selectionMode: WorkflowMode | null;
} {
  const evidenceIds = input.evidence
    .map((item) => item.id)
    .filter((id): id is string => Boolean(id));
  const factualClaims = [
    `Selected bug record: ${input.selectedBug.selectedRecordId} [E1]`,
    ...(input.repositoryFindings ?? []),
  ];
  assertClaimsHaveEvidence(factualClaims, evidenceIds);

  return {
    name: metadata.name ?? input.selectedBug.selectedRecordId,
    ownerCriteria:
      metadata.ownerCriteria ??
      (input.selectedBug.selectionEvidence.ownerCriteria as OwnerCriteria) ??
      null,
    selectedRecordId: input.selectedBug.selectedRecordId,
    selectionMode: metadata.selectionMode ?? input.selectedBug.mode ?? null,
    bugSummary: `Selected record: ${input.selectedBug.selectedRecordId}`,
    observedFacts: factualClaims.map(redactSecrets),
    assumptions: (input.assumptions ?? []).map(redactSecrets),
    analysis: (
      input.repositoryFindings ?? ["Repository analysis has not been run."]
    ).map(redactSecrets),
    likelyCauses: (
      input.likelyCauses ?? ["Unconfirmed until more evidence is collected."]
    ).map(redactSecrets),
    recommendedFixes: (input.recommendedFixes ?? []).map(redactSecrets),
    risks: (
      input.risks ?? [
        "Cause remains unconfirmed without reproduction evidence.",
      ]
    ).map(redactSecrets),
    nextActions: (
      input.nextActions ?? ["Collect missing repository and runtime evidence."]
    ).map(redactSecrets),
    evidence: input.evidence.map((item) => ({
      ...item,
      excerpt: redactSecrets(item.excerpt),
      reference: redactSecrets(item.reference),
    })),
  };
}

export function renderStructuredResearchReport(report: ResearchReport): string {
  const sections = [
    "# Selected Bug Research Report",
    "",
    "## Bug Summary",
    `- ${report.bugSummary}`,
    "",
    "## Observed Facts",
    list(report.observedFacts),
    "",
    "## Assumptions",
    list(report.assumptions),
    "",
    "## Analysis",
    list(report.analysis),
    "",
    "## Likely Causes",
    list(report.likelyCauses),
    "",
    "## Recommended Fixes",
    list(report.recommendedFixes),
    "",
    "## Risks",
    list(report.risks),
    "",
    "## Next Actions",
    list(report.nextActions),
    "",
    "## Evidence",
    ...report.evidence.map(
      (item) =>
        `- [${item.id}] ${item.type}: ${item.reference} (${item.status}) - ${redactSecrets(
          item.excerpt,
        )}`,
    ),
  ];

  return `${sections.join("\n")}\n`;
}
