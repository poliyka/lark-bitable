import type { ConfigStore } from "./store.js";
import type { AuthStore } from "./auth-store.js";
import type { Issue, ValidationResult } from "./schema.js";
import { authStatusFor } from "../lark/auth.js";

export type Workflow = ValidationResult["workflow"];

export interface ReadinessContext {
  authStore?: AuthStore;
  configStore?: ConfigStore;
  bootstrap?: {
    installed: boolean;
    skillPath?: string;
    stale?: boolean;
  };
  bootstrapInstalled?: boolean;
  liveAccessStatus?: "verified" | "partial" | "failed" | "skipped";
}

export async function checkReadiness(
  workflow: Workflow = "global",
  context: ReadinessContext = {},
): Promise<ValidationResult> {
  const checkedPrerequisites = ["install", "bootstrap", "auth", "source"];
  const blockingIssues: Issue[] = [];
  const partialIssues: Issue[] = [];
  const remediationSteps: string[] = [];

  const bootstrapInstalled =
    context.bootstrap?.installed ?? context.bootstrapInstalled;
  const bootstrapStale =
    context.bootstrap?.installed && context.bootstrap.stale;

  if (bootstrapInstalled === false) {
    blockingIssues.push({
      code: "missing-bootstrap",
      message: "Bootstrap skill guidance is not installed.",
      remediation: "Run lark-bitable doctor --install-skill",
    });
    remediationSteps.push("Run lark-bitable doctor --install-skill");
  }

  if (bootstrapStale) {
    blockingIssues.push({
      code: "stale-bootstrap",
      message: "Bootstrap skill guidance is installed but out of date.",
      remediation: "Run lark-bitable doctor --install-skill",
    });
    remediationSteps.push("Run lark-bitable doctor --install-skill");
  }

  const auth = await context.authStore?.read();
  const authStatus = authStatusFor(auth);
  if (authStatus.status !== "ready") {
    blockingIssues.push({
      code:
        authStatus.status === "missing"
          ? "missing-auth"
          : `auth-${authStatus.status}`,
      message:
        authStatus.status === "missing"
          ? "Lark auth is missing or not ready."
          : `Lark auth is ${authStatus.status}.`,
      remediation:
        authStatus.status === "expired" && auth?.refreshToken
          ? "Run lark-bitable configure to store Lark app credentials, or run lark-bitable lark --login again."
          : "Run lark-bitable lark --login",
    });
    remediationSteps.push(
      authStatus.status === "expired" && auth?.refreshToken
        ? "Run lark-bitable configure to store Lark app credentials, or run lark-bitable lark --login again."
        : "Run lark-bitable lark --login",
    );
  }

  const source = context.configStore?.getSource();
  if (!source) {
    blockingIssues.push({
      code: "missing-source",
      message: "No active Lark Bitable source is configured.",
      remediation: "Run lark-bitable configure <url>",
    });
    remediationSteps.push("Run lark-bitable configure <url>");
  }

  if (
    workflow === "triage" &&
    source &&
    (!source.statusField || !source.priorityField)
  ) {
    blockingIssues.push({
      code: "missing-field-mapping",
      message: "Triage requires status and priority field mappings.",
      remediation:
        "Run lark-bitable configure with --status-field and --priority-field",
    });
    remediationSteps.push(
      "Run lark-bitable configure with --status-field and --priority-field",
    );
  }

  if (workflow === "research" && !context.configStore?.getSelection()) {
    blockingIssues.push({
      code: "missing-selection",
      message: "Research requires a previous triage selection.",
      remediation: "Run lark-bitable triage",
    });
    remediationSteps.push("Run lark-bitable triage");
  }

  if (
    context.liveAccessStatus === "partial" ||
    context.liveAccessStatus === "failed"
  ) {
    partialIssues.push({
      code: "live-access-inconclusive",
      message: "Live Lark access could not be fully verified.",
      remediation:
        "Retry after network and Lark authorization are available. If Lark reports error 20027 or a missing scope, open Lark Developer Console > Permissions, add the user-identity bitable:app:readonly permission, publish the app version, wait for enterprise approval if required, then run lark-bitable lark --login again.",
    });
  }

  const readyCommand =
    workflow === "global"
      ? "lark-bitable list"
      : workflow === "inspect"
        ? "lark-bitable list"
        : `lark-bitable ${workflow}`;

  return {
    workflow,
    status:
      blockingIssues.length > 0
        ? "blocked"
        : partialIssues.length > 0
          ? "partial"
          : "ready",
    checkedPrerequisites,
    blockingIssues,
    partialIssues,
    remediationSteps,
    nextSafeCommand: remediationSteps[0] ?? readyCommand,
    evidence: [],
    checkedAt: new Date().toISOString(),
  };
}
