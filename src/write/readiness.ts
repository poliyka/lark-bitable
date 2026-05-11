import type {
  BitableRecord,
  BitableSource,
  Issue,
  LarkAuthSession,
  ValidationResult,
  WriteReadiness,
} from "../config/schema.js";
import { AuthStore } from "../config/auth-store.js";
import { ConfigStore } from "../config/store.js";
import { authStatusFor, ensureReadyAuthSession } from "../lark/auth.js";
import { LarkClient, createLarkSdkTransport } from "../lark/client.js";
import type { BitableFieldInfo } from "../lark/field-discovery.js";
import { resolveWorkflowMode } from "../mode/mode-config.js";
import { CliError } from "../cli/errors.js";

export interface EvaluateWriteReadinessInput {
  authReady: boolean;
  fieldsReadable?: boolean | "unknown";
  sourceConfigured: boolean;
  targetRecordReadable?: boolean | "unknown";
  writePermissionStatus?: WriteReadiness["writePermissionStatus"];
}

export interface WriteCommandContextInput {
  authPath: string;
  configCwd?: string;
  fixtureFields?: string;
  fixtureRecords?: string;
  recordId?: string;
  requireRecord?: boolean;
}

export function evaluateWriteReadiness(
  input: EvaluateWriteReadinessInput,
): WriteReadiness {
  const blockingIssues: Issue[] = [];
  const partialIssues: Issue[] = [];

  if (!input.authReady) {
    blockingIssues.push({
      code: "missing-auth",
      message: "Lark auth is missing or not ready.",
      remediation: "Run lark-bitable lark --login",
    });
  }

  if (!input.sourceConfigured) {
    blockingIssues.push({
      code: "missing-source",
      message: "No active Lark Bitable source is configured.",
      remediation: "Run lark-bitable configure <url>",
    });
  }

  if (input.fieldsReadable === false) {
    blockingIssues.push({
      code: "fields-unreadable",
      message: "Table fields could not be read for write validation.",
      remediation: "Run lark-bitable schema --json and fix Lark field access.",
    });
  }

  if (input.targetRecordReadable === false) {
    blockingIssues.push({
      code: "target-record-unreadable",
      message: "Target record could not be read before update.",
      remediation: "Run lark-bitable get <record-id> --json.",
    });
  }

  if (input.writePermissionStatus === "missing") {
    blockingIssues.push({
      code: "missing-write-permission",
      message: "Configured Lark access does not have write permission.",
      remediation:
        "Grant a write-capable Bitable permission, publish/approve the app if needed, then run lark-bitable lark --login again.",
    });
  }

  if (input.writePermissionStatus === "failed") {
    blockingIssues.push({
      code: "write-permission-check-failed",
      message: "Write permission check failed.",
      remediation:
        "Retry after network and Lark authorization are available, or inspect Lark permission errors from the failed write.",
    });
  }

  if (
    !input.writePermissionStatus ||
    input.writePermissionStatus === "unknown"
  ) {
    partialIssues.push({
      code: "write-permission-unverified",
      message: "Write permission has not been verified by a committed write.",
      remediation:
        "Preview first. Commit only against a known writable disposable table or after confirming write-capable Lark permissions.",
    });
  }

  return {
    sourceConfigured: input.sourceConfigured,
    authReady: input.authReady,
    fieldsReadable: input.fieldsReadable ?? "unknown",
    targetRecordReadable: input.targetRecordReadable ?? "unknown",
    writePermissionStatus: input.writePermissionStatus ?? "unknown",
    blockingIssues,
    partialIssues,
    status:
      blockingIssues.length > 0
        ? "blocked"
        : partialIssues.length > 0
          ? "partial"
          : "ready",
    nextSafeCommand:
      blockingIssues[0]?.remediation ??
      'lark-bitable write --op create --field "欄位=值" --json',
  };
}

export async function loadWriteCommandContext(input: WriteCommandContextInput) {
  const authStore = new AuthStore(input.authPath);
  const auth = await authStore.read();
  if (!auth) {
    throw new CliError({
      code: "missing-auth",
      message: "Lark auth is missing or not ready.",
      remediation: "Run lark-bitable lark --login",
    });
  }
  const configStore = new ConfigStore({ cwd: input.configCwd });
  const readyAuth = await ensureReadyAuth(auth, authStore, configStore);
  const source = configStore.getSource();
  if (!source) {
    throw new CliError({
      code: "missing-source",
      message: "No active Lark Bitable source is configured.",
      remediation: "Run lark-bitable configure <url>",
    });
  }

  const client = new LarkClient(createLarkSdkTransport(readyAuth));
  const fields = input.fixtureFields
    ? (JSON.parse(input.fixtureFields) as BitableFieldInfo[])
    : await client.listFields(source);
  const records = input.fixtureRecords
    ? (JSON.parse(input.fixtureRecords) as BitableRecord[])
    : undefined;
  const targetRecord =
    input.recordId && input.requireRecord
      ? await loadTargetRecord({
          client,
          records,
          recordId: input.recordId,
          source,
        })
      : undefined;
  const mode = resolveWorkflowMode(configStore);

  return {
    auth: readyAuth,
    client,
    fields,
    mode,
    records,
    source,
    targetRecord,
  };
}

export function writeValidationResult(input: {
  authReady: boolean;
  modeSource?: ValidationResult["modeSource"];
  sourceConfigured: boolean;
  activeMode?: ValidationResult["activeMode"];
  writePermissionStatus?: WriteReadiness["writePermissionStatus"];
}): ValidationResult {
  const readiness = evaluateWriteReadiness(input);
  return {
    workflow: "write",
    status: readiness.status,
    checkedPrerequisites: [
      "install",
      "bootstrap",
      "auth",
      "source",
      "fields",
      "write-permission",
    ],
    blockingIssues: readiness.blockingIssues,
    partialIssues: readiness.partialIssues,
    remediationSteps: [
      ...readiness.blockingIssues,
      ...readiness.partialIssues,
    ].flatMap((issue) => (issue.remediation ? [issue.remediation] : [])),
    nextSafeCommand: readiness.nextSafeCommand,
    evidence: [],
    activeMode: input.activeMode,
    modeSource: input.modeSource,
    checkedAt: new Date().toISOString(),
  };
}

async function loadTargetRecord(input: {
  client: LarkClient;
  records?: BitableRecord[];
  recordId: string;
  source: BitableSource;
}): Promise<BitableRecord> {
  const record =
    input.records?.find((item) => item.recordId === input.recordId) ??
    (input.records
      ? undefined
      : await input.client.getRecord(input.source, input.recordId));
  if (!record) {
    throw new CliError({
      code: "record-not-found",
      message: "Target record not found.",
      remediation: "Run lark-bitable list --json to inspect available records.",
    });
  }
  return record;
}

async function ensureReadyAuth(
  auth: LarkAuthSession,
  authStore: AuthStore,
  configStore: ConfigStore,
) {
  const status = authStatusFor(auth);
  if (status.status === "ready") return auth;

  if (status.status === "expired" && auth.refreshToken) {
    const configured = configStore.getLarkApp();
    const appId =
      process.env.LARK_APP_ID ?? configured?.appId ?? auth.appIdentity;
    const appSecret = process.env.LARK_APP_SECRET ?? configured?.appSecret;
    if (appId && appSecret) {
      const refreshed = await ensureReadyAuthSession({
        appId,
        appSecret,
        domain: auth.domain,
        session: auth,
        storagePath: authStore.path,
      });
      return authStore.write(refreshed);
    }
  }

  throw new CliError({
    code: `auth-${status.status}`,
    message: `Lark auth is ${status.status}.`,
    remediation:
      status.status === "expired" && auth.refreshToken
        ? "Run lark-bitable configure to store Lark app credentials, or run lark-bitable lark --login again."
        : "Run lark-bitable lark --login",
  });
}
