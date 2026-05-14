import { AuthStore } from "../config/auth-store.js";
import type { BitableRecord, Issue } from "../config/schema.js";
import type { ConfigStore } from "../config/store.js";
import { authStatusFor } from "../lark/auth.js";
import { LarkClient, createLarkSdkTransport } from "../lark/client.js";
import { redactDashboardPayload } from "./api.js";

export async function getDashboardSchema(input: {
  authPath: string;
  configStore: ConfigStore;
  fixtureRecords?: BitableRecord[];
}) {
  const blocked = await tableBlockedIssues(input);
  if (blocked.length > 0) {
    return {
      fields: [],
      issues: blocked,
      mappings: {},
      status: "blocked" as const,
    };
  }
  const source = input.configStore.getSource();
  const auth = await new AuthStore(input.authPath).read();
  const records =
    input.fixtureRecords ??
    (source && auth
      ? await new LarkClient(createLarkSdkTransport(auth)).listRecords(source, {
          limit: 20,
        })
      : []);
  const fieldNames = [
    ...new Set(records.flatMap((record) => Object.keys(record.fields))),
  ];
  return redactDashboardPayload({
    fields: fieldNames.map((fieldName) => ({
      fieldName,
      nonEmptyInSample: records.filter(
        (record) =>
          record.fields[fieldName] !== undefined &&
          record.fields[fieldName] !== null &&
          record.fields[fieldName] !== "",
      ).length,
      observedValues: [
        ...new Set(
          records
            .map((record) => String(record.fields[fieldName] ?? ""))
            .filter(Boolean),
        ),
      ].slice(0, 10),
    })),
    issues: [],
    mappings: {
      actionableStatus: source?.actionableStatus,
      ownerField: source?.fieldAliases.owner ?? null,
      priorityField: source?.priorityField ?? null,
      statusField: source?.statusField ?? null,
      titleField: source?.fieldAliases.title ?? null,
    },
    status: "ready" as const,
  });
}

export async function getDashboardRecords(input: {
  authPath: string;
  configStore: ConfigStore;
  fixtureRecords?: BitableRecord[];
  limit?: number;
}) {
  const blocked = await tableBlockedIssues(input);
  if (blocked.length > 0) {
    return { issues: blocked, records: [], status: "blocked" as const };
  }
  const source = input.configStore.getSource();
  const auth = await new AuthStore(input.authPath).read();
  const records =
    input.fixtureRecords ??
    (source && auth
      ? await new LarkClient(createLarkSdkTransport(auth)).listRecords(source, {
          limit: input.limit ?? 20,
        })
      : []);
  return redactDashboardPayload({
    issues: [],
    records: records.slice(0, input.limit ?? 20),
    status: "ready" as const,
  });
}

async function tableBlockedIssues(input: {
  authPath: string;
  configStore: ConfigStore;
}): Promise<Issue[]> {
  const issues: Issue[] = [];
  const source = input.configStore.getSource();
  if (!source) {
    issues.push({
      code: "missing-source",
      message: "No active Lark Bitable source is configured.",
      remediation: "Save a source URL on the dashboard config page.",
    });
  }
  const auth = await new AuthStore(input.authPath).read();
  const authStatus = authStatusFor(auth);
  if (authStatus.status !== "ready") {
    issues.push({
      code:
        authStatus.status === "missing"
          ? "missing-auth"
          : `auth-${authStatus.status}`,
      message: `Lark auth is ${authStatus.status}.`,
      remediation: "Complete Lark login from the dashboard auth page.",
    });
  }
  return issues;
}
