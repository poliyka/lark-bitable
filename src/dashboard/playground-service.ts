import type { Issue } from "../config/schema.js";
import { redactDashboardPayload } from "./api.js";
import {
  runDashboardCommand,
  type RunDashboardCommandInput,
} from "./command-runner.js";

export async function runPlaygroundWorkflow(
  input: RunDashboardCommandInput,
): Promise<{
  auditEntryId?: string;
  command: string;
  evidence: unknown[];
  humanOutput: string;
  issues: Issue[];
  nextSafeActions: string[];
  status: "ok" | "partial" | "error";
  structuredOutput: unknown;
}> {
  if (
    input.command === "write" &&
    input.parameters?.confirm === true &&
    !input.confirmWrite
  ) {
    return {
      command: "write",
      evidence: [],
      humanOutput: "Write confirmation is required before committed writes.",
      issues: [
        {
          code: "write-confirmation-required",
          message:
            "Dashboard write requests default to preview and require explicit confirmation before mutation.",
          remediation:
            "Run a preview first, then confirm only after reviewing the planned field changes.",
        },
      ],
      nextSafeActions: ["Run write preview without confirmation."],
      status: "partial",
      structuredOutput: null,
    };
  }

  const result = await runDashboardCommand(input);
  return redactDashboardPayload(result);
}
