import type { ResearchEvidence, TriageSelection } from "../config/schema.js";
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

function list(items: string[]): string {
  return items.length > 0
    ? items.map((item) => `- ${redactSecrets(item)}`).join("\n")
    : "- None recorded.";
}

export function renderResearchReport(input: RenderResearchReportInput): string {
  const evidenceIds = input.evidence
    .map((item) => item.id)
    .filter((id): id is string => Boolean(id));
  const factualClaims = [
    `Selected bug record: ${input.selectedBug.selectedRecordId} [E1]`,
    ...(input.repositoryFindings ?? []),
  ];
  assertClaimsHaveEvidence(factualClaims, evidenceIds);

  const sections = [
    "# Selected Bug Research Report",
    "",
    "## Bug Summary",
    `- Selected record: ${input.selectedBug.selectedRecordId} [E1]`,
    `- Selected at: ${input.selectedBug.selectedAt} [E1]`,
    "",
    "## Observed Facts",
    list(factualClaims),
    "",
    "## Assumptions",
    list(input.assumptions ?? []),
    "",
    "## Analysis",
    list(input.repositoryFindings ?? ["Repository analysis has not been run."]),
    "",
    "## Likely Causes",
    list(
      input.likelyCauses ?? ["Unconfirmed until more evidence is collected."],
    ),
    "",
    "## Recommended Fixes",
    list(input.recommendedFixes ?? []),
    "",
    "## Risks",
    list(
      input.risks ?? [
        "Cause remains unconfirmed without reproduction evidence.",
      ],
    ),
    "",
    "## Next Actions",
    list(
      input.nextActions ?? ["Collect missing repository and runtime evidence."],
    ),
    "",
    "## Evidence",
    ...input.evidence.map(
      (item) =>
        `- [${item.id}] ${item.type}: ${item.reference} (${item.status}) - ${redactSecrets(
          item.excerpt,
        )}`,
    ),
  ];

  return `${sections.join("\n")}\n`;
}
