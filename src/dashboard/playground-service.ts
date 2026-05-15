import type { Issue } from "../config/schema.js";
import { isCliError } from "../cli/errors.js";
import type { CommandOutput } from "../cli/output.js";
import { formatHuman } from "../cli/output.js";
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

  const previousTrigger = process.env.LARK_BITABLE_LIVE_TRIGGER;
  try {
    process.env.LARK_BITABLE_LIVE_TRIGGER = "dashboard";
    const result = await runDashboardCommand(input);
    return redactDashboardPayload(result);
  } catch (error) {
    const issue = commandFailureIssue(error);
    const structuredOutput: CommandOutput = {
      command: input.command,
      evidence: [],
      issues: [issue],
      status: isCliError(error) ? error.status : "error",
    };
    return redactDashboardPayload({
      command: input.command,
      evidence: [],
      humanOutput: formatHuman(structuredOutput),
      issues: [issue],
      nextSafeActions: [
        issue.remediation ??
          "Review the command parameters in Playground, then run a preview again.",
      ],
      status: structuredOutput.status,
      structuredOutput,
    });
  } finally {
    if (previousTrigger === undefined) {
      delete process.env.LARK_BITABLE_LIVE_TRIGGER;
    } else {
      process.env.LARK_BITABLE_LIVE_TRIGGER = previousTrigger;
    }
  }
}

function commandFailureIssue(error: unknown): Issue {
  if (isCliError(error)) {
    return {
      code: error.code,
      message: error.message,
      ...(error.remediation ? { remediation: error.remediation } : {}),
    };
  }
  return {
    code: "playground-command-failed",
    message: error instanceof Error ? error.message : String(error),
    remediation:
      "Review the command parameters in Playground, then run a preview again.",
  };
}
