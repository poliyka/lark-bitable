import type { QaVerificationResult } from "../config/schema.js";
import { redactSecrets } from "../reporting/evidence.js";

function list(items: string[]): string {
  return items.length > 0
    ? items.map((item) => `- ${redactSecrets(item)}`).join("\n")
    : "- None recorded.";
}

export function renderQaVerificationReport(
  result: QaVerificationResult,
): string {
  return `${[
    "# QA Verification Report",
    "",
    "## Task Summary",
    `- Record: ${String(result.taskSummary.recordId ?? "unknown")}`,
    `- Title: ${String(result.taskSummary.title ?? "(unknown)")}`,
    "",
    "## Observed Facts",
    list(result.observedFacts),
    "",
    "## Executed Checks",
    result.executedChecks.length > 0
      ? result.executedChecks
          .map(
            (check) =>
              `- ${check.command.join(" ")}: ${check.status} exit=${check.exitCode ?? "null"}`,
          )
          .join("\n")
      : "- None executed.",
    "",
    "## Skipped Checks",
    result.skippedChecks.length > 0
      ? result.skippedChecks
          .map(
            (check) =>
              `- ${check.reason}; manual next step: ${check.manualNextStep}`,
          )
          .join("\n")
      : "- None skipped.",
    "",
    "## Assumptions",
    list(result.assumptions),
    "",
    "## Risks",
    list(result.risks),
    "",
    "## Manual Next Steps",
    list(result.manualNextSteps),
    "",
    "## Next Actions",
    list(result.nextActions),
    "",
    "## Evidence",
    ...result.evidence.map(
      (item) =>
        `- [${item.id}] ${item.type}: ${item.reference} (${item.status}) - ${redactSecrets(
          item.excerpt,
        )}`,
    ),
  ].join("\n")}\n`;
}
