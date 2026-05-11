import type { BitableRecord } from "../config/schema.js";
import { AuthStore } from "../config/auth-store.js";
import { ConfigStore } from "../config/store.js";
import { authStatusFor, ensureReadyAuthSession } from "../lark/auth.js";
import { LarkClient, createLarkSdkTransport } from "../lark/client.js";
import { resolveWorkflowMode } from "../mode/mode-config.js";
import {
  applyOwnerFilter,
  resolveOwnerCriteria,
  type OwnerFilterResult,
} from "../mode/owner-filter.js";
import { CliError } from "./errors.js";

export interface RecordCommandContext {
  authPath: string;
  configCwd?: string;
  fixture?: string;
}

export async function loadRecordCommandData(context: RecordCommandContext) {
  const auth = await new AuthStore(context.authPath).read();
  if (!auth) {
    throw new CliError({
      code: "missing-auth",
      message: "Lark auth is missing or not ready.",
      remediation: "Run lark-bitable lark --login",
    });
  }
  const configStore = new ConfigStore({ cwd: context.configCwd });
  const readyAuth = await ensureReadyAuth(
    auth,
    new AuthStore(context.authPath),
    configStore,
  );

  const source = configStore.getSource();
  if (!source) {
    throw new CliError({
      code: "missing-source",
      message: "No active Lark Bitable source is configured.",
      remediation: "Run lark-bitable configure <url>",
    });
  }

  const records = context.fixture
    ? (JSON.parse(context.fixture) as BitableRecord[])
    : await new LarkClient(createLarkSdkTransport(readyAuth)).listRecords(
        source,
      );

  const mode = resolveWorkflowMode(configStore);
  return { auth: readyAuth, configStore, mode, records, source };
}

export function applyOwnerCriteria(
  input: {
    commandOwner?: string;
    ignoreDefaultOwner?: boolean;
  } & Pick<
    Awaited<ReturnType<typeof loadRecordCommandData>>,
    "configStore" | "mode" | "records" | "source"
  >,
): OwnerFilterResult {
  const criteria = resolveOwnerCriteria({
    commandOwner: input.commandOwner,
    ignoreDefaultOwner: input.ignoreDefaultOwner,
    mode: input.mode.active,
    source: input.source,
    workflowConfig: input.configStore.getWorkflowConfig(),
  });
  return applyOwnerFilter(input.records, criteria);
}

async function ensureReadyAuth(
  auth: NonNullable<Awaited<ReturnType<AuthStore["read"]>>>,
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

export function selectFields(
  records: BitableRecord[],
  fields: string[],
): BitableRecord[] {
  if (fields.length === 0) return records;

  return records.map((record) => ({
    ...record,
    fields: Object.fromEntries(
      fields
        .filter((field) => Object.hasOwn(record.fields, field))
        .map((field) => [field, record.fields[field]]),
    ),
  }));
}
