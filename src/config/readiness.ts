import type { ConfigStore } from "./store.js";
import type { AuthStore } from "./auth-store.js";
import type { Issue, ValidationResult } from "./schema.js";
import { authStatusFor, ensureReadyAuthSession } from "../lark/auth.js";
import { resolveWorkflowMode } from "../mode/mode-config.js";

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
  const checkedPrerequisites =
    workflow === "dashboard"
      ? ["install", "dashboard-server", "config", "auth", "audit", "research"]
      : workflow === "write"
        ? [
            "install",
            "bootstrap",
            "auth",
            "source",
            "fields",
            "write-permission",
          ]
        : ["install", "bootstrap", "auth", "source"];
  const blockingIssues: Issue[] = [];
  const partialIssues: Issue[] = [];
  const remediationSteps: string[] = [];
  const mode = context.configStore
    ? resolveWorkflowMode(context.configStore)
    : undefined;

  const bootstrapInstalled =
    context.bootstrap?.installed ?? context.bootstrapInstalled;
  const bootstrapStale =
    context.bootstrap?.installed && context.bootstrap.stale;

  if (bootstrapInstalled === false && workflow !== "dashboard") {
    blockingIssues.push({
      code: "missing-bootstrap",
      message: "Bootstrap skill guidance is not installed.",
      remediation: "Run lark-bitable doctor --install-skill",
    });
    remediationSteps.push("Run lark-bitable doctor --install-skill");
  }

  if (bootstrapStale && workflow !== "dashboard") {
    blockingIssues.push({
      code: "stale-bootstrap",
      message: "Bootstrap skill guidance is installed but out of date.",
      remediation: "Run lark-bitable doctor --install-skill",
    });
    remediationSteps.push("Run lark-bitable doctor --install-skill");
  }

  const { auth, refreshError } = await readAuthForReadiness(context);
  const authStatus = authStatusFor(auth);
  if (refreshError) {
    const remediation =
      "Retry the command; if it still fails, run lark-bitable lark --login";
    const authIssue = {
      code: "auth-refresh-failed",
      message: `Lark auth refresh failed: ${refreshError}`,
      remediation,
    };
    if (workflow === "dashboard") {
      partialIssues.push({
        ...authIssue,
        message: `${authIssue.message} Lark-backed dashboard pages are blocked until login completes.`,
      });
    } else {
      blockingIssues.push(authIssue);
    }
    remediationSteps.push(remediation);
  } else if (authStatus.status !== "ready") {
    const authIssue = {
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
    };
    if (workflow === "dashboard") {
      partialIssues.push({
        ...authIssue,
        message: `${authIssue.message} Lark-backed dashboard pages are blocked until login completes.`,
      });
    } else {
      blockingIssues.push(authIssue);
    }
    remediationSteps.push(
      authStatus.status === "expired" && auth?.refreshToken
        ? "Run lark-bitable configure to store Lark app credentials, or run lark-bitable lark --login again."
        : "Run lark-bitable lark --login",
    );
  }

  const source = context.configStore?.getSource();
  if (!source) {
    const sourceIssue = {
      code: "missing-source",
      message: "No active Lark Bitable source is configured.",
      remediation: "Run lark-bitable configure <url>",
    };
    if (workflow === "dashboard") {
      partialIssues.push({
        ...sourceIssue,
        message:
          "No active Lark Bitable source is configured. The dashboard can start, but table-backed pages are blocked until configuration is saved.",
      });
    } else {
      blockingIssues.push(sourceIssue);
    }
    remediationSteps.push("Run lark-bitable configure <url>");
  }

  if (workflow === "research" && !context.configStore?.getSelection()) {
    blockingIssues.push({
      code: "missing-selection",
      message: "Research requires a previous triage selection.",
      remediation: "Run lark-bitable triage",
    });
    remediationSteps.push("Run lark-bitable triage");
  }

  if (workflow === "verify" && mode?.active !== "QA") {
    blockingIssues.push({
      code: "wrong-mode",
      message: "QA verification requires active mode QA.",
      remediation: "Run lark-bitable configure --mode QA",
    });
    remediationSteps.push("Run lark-bitable configure --mode QA");
  }

  if (workflow === "verify" && !context.configStore?.getSelection()) {
    partialIssues.push({
      code: "missing-selection",
      message:
        "Verify can run with a record id, but no previous triage selection exists.",
      remediation: "Run lark-bitable triage or lark-bitable verify <record-id>",
    });
  }

  if (workflow === "write" && blockingIssues.length === 0) {
    partialIssues.push({
      code: "write-permission-not-probed",
      message:
        "valid --workflow write does not perform a committed write, so it cannot prove write permission non-destructively.",
      remediation:
        "Run preview first, then commit only against an explicit target after confirming write-capable Lark permissions.",
    });
  }

  if (workflow === "research" && mode?.active === "QA") {
    partialIssues.push({
      code: "qa-mode-research",
      message:
        "Research is Developer-oriented; QA mode should normally use verify.",
      remediation:
        "Run lark-bitable verify, or switch with lark-bitable configure --mode Developer.",
    });
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
        : workflow === "dashboard"
          ? "lark-bitable dashboard"
          : workflow === "write"
            ? 'lark-bitable write --op create --field "欄位=值" --json'
            : workflow === "verify"
              ? "lark-bitable verify"
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
    activeMode: mode?.active,
    modeSource: mode?.source,
    checkedAt: new Date().toISOString(),
  };
}

async function readAuthForReadiness(context: ReadinessContext): Promise<{
  auth: Awaited<ReturnType<NonNullable<ReadinessContext["authStore"]>["read"]>>;
  refreshError?: string;
}> {
  const auth = await context.authStore?.read();
  if (!auth || !context.authStore) return { auth };
  if (authStatusFor(auth).status !== "expired" || !auth.refreshToken) {
    return { auth };
  }

  const app = context.configStore?.getLarkApp();
  try {
    const refreshed = await ensureReadyAuthSession({
      appId: app?.appId,
      appSecret: app?.appSecret,
      domain: app?.domain ?? auth.domain,
      session: auth,
      storagePath: context.authStore.path,
    });
    if (refreshed !== auth && authStatusFor(refreshed).status === "ready") {
      return context.authStore.write(refreshed).then((auth) => ({ auth }));
    }
  } catch (error) {
    let summary = "Unknown error";
    if (error instanceof Error) {
      summary = error.message;
      const secrets = [
        auth.accessToken,
        auth.refreshToken,
        app?.appSecret,
        process.env.LARK_APP_SECRET,
      ].filter((value): value is string => Boolean(value));
      for (const secret of secrets.sort((a, b) => b.length - a.length)) {
        summary = summary.split(secret).join("[REDACTED]");
      }
      if (
        !summary.trim() ||
        /access[_\s-]?token|refresh[_\s-]?token|app[_\s-]?secret|authorization|bearer/i.test(
          summary,
        ) ||
        /[A-Za-z0-9._~+/=-]{32,}/.test(summary)
      ) {
        summary = error instanceof TypeError ? "TypeError" : "Error";
      }
    } else if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "number" &&
      Number.isFinite(error.code)
    ) {
      summary = String(error.code);
    }
    return { auth, refreshError: summary };
  }
  return { auth };
}
