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
  originalDetails?: string[];
  recommendedFixes?: string[];
  repositoryFindings?: string[];
  risks?: string[];
  selectedBug: TriageSelection;
  title?: string;
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
  const reportName =
    stringValue(input.title) ??
    metadata.name ??
    input.selectedBug.selectedRecordId;
  const originalDetails = [
    ...(input.originalDetails ?? []),
    ...originalDetailsFromSelection(input.selectedBug),
  ];
  const selectedBugEvidenceId =
    input.evidence.find(
      (item) =>
        item.type === "bug-record" &&
        item.reference === input.selectedBug.selectedRecordId,
    )?.id ??
    input.evidence.find((item) => item.type === "bug-record")?.id ??
    evidenceIds[0] ??
    "E1";
  const factualClaims = [
    `Selected bug record: ${input.selectedBug.selectedRecordId} [${selectedBugEvidenceId}]`,
    ...(input.repositoryFindings ?? []),
  ];
  assertClaimsHaveEvidence(factualClaims, evidenceIds);

  return {
    name: reportName,
    ownerCriteria:
      metadata.ownerCriteria ??
      (input.selectedBug.selectionEvidence.ownerCriteria as OwnerCriteria) ??
      null,
    selectedRecordId: input.selectedBug.selectedRecordId,
    selectionMode: metadata.selectionMode ?? input.selectedBug.mode ?? null,
    bugSummary: `${reportName} (${input.selectedBug.selectedRecordId})`,
    originalDetails: originalDetails.map(redactSecrets),
    observedFacts: factualClaims.map(redactSecrets),
    assumptions: (input.assumptions ?? []).map(redactSecrets),
    analysis: (
      input.repositoryFindings ?? ["Repository analysis has not been run."]
    ).map(redactSecrets),
    likelyCauses: (input.likelyCauses ?? []).map(redactSecrets),
    recommendedFixes: (input.recommendedFixes ?? []).map(redactSecrets),
    risks: (input.risks ?? []).map(redactSecrets),
    nextActions: (input.nextActions ?? []).map(redactSecrets),
    evidence: input.evidence.map((item) => ({
      ...item,
      excerpt: redactSecrets(item.excerpt),
      reference: redactSecrets(item.reference),
    })),
  };
}

export function renderStructuredResearchReport(report: ResearchReport): string {
  const sections = [
    `# ${redactSecrets(report.bugSummary.replace(/\s+\([^)]*\)$/, ""))}`,
    "",
    "## Bug Summary",
    `- ${report.bugSummary}`,
    "",
    "## Original Details",
    list(report.originalDetails),
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

function originalDetailsFromSelection(selection: TriageSelection): string[] {
  const snapshot = selection.candidateSnapshot;
  const detailFields: Array<[string, unknown]> = [
    ["originalDescription", snapshot.originalDescription],
    ["原始詳細敘述", snapshot["原始詳細敘述"]],
    ["原始詳細描述", snapshot["原始詳細描述"]],
    ["詳細敘述", snapshot["詳細敘述"]],
    ["詳細描述", snapshot["詳細描述"]],
    ["原始描述", snapshot["原始描述"]],
    ["描述", snapshot["描述"]],
    ["說明", snapshot["說明"]],
    ["description", snapshot.description],
    ["detail", snapshot.detail],
    ["details", snapshot.details],
    ["reproductionSteps", snapshot.reproductionSteps],
    ["expectedBehavior", snapshot.expectedBehavior],
    ["actualBehavior", snapshot.actualBehavior],
    ["links", snapshot.links],
    ["notes", snapshot.notes],
  ];
  return detailFields.flatMap(([label, value]) => formatDetail(label, value));
}

function formatDetail(label: string, value: unknown): string[] {
  if (value === undefined || value === null || value === "") return [];
  return [
    `${label}: ${typeof value === "string" ? value : JSON.stringify(value)}`,
  ];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
