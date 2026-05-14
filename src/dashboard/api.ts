import type { Issue } from "../config/schema.js";
import { redactSecrets } from "../reporting/evidence.js";
import {
  apiEnvelopeSchema,
  type ApiEnvelope,
  type DashboardDataSource,
  type DashboardStatus,
} from "./schemas.js";

const REDACTED = "[REDACTED]";
const sensitiveKeyPattern =
  /(access[_-]?token|accessToken|app[_-]?secret|appSecret|authorization|client[_-]?token|clientToken|code|refresh[_-]?token|refreshToken|secret|tenant[_-]?access[_-]?token|tenant_access_token|token)$/i;

export interface DashboardErrorEnvelope {
  body: ApiEnvelope;
  statusCode: number;
}

export function dashboardOk<T>(
  data: T,
  dataSource: DashboardDataSource = "live",
): ApiEnvelope {
  return apiEnvelopeSchema.parse({
    data: redactDashboardPayload(data),
    dataSource,
    issues: [],
    status: "ok",
  });
}

export function dashboardPartial<T>(
  data: T,
  issues: Issue[],
  dataSource: DashboardDataSource = "partial",
): ApiEnvelope {
  return apiEnvelopeSchema.parse({
    data: redactDashboardPayload(data),
    dataSource,
    issues: redactDashboardPayload(issues),
    status: "partial" satisfies DashboardStatus,
  });
}

export function dashboardError(
  issue: Issue,
  statusCode = 500,
  dataSource: DashboardDataSource = "failed",
): DashboardErrorEnvelope {
  return {
    body: apiEnvelopeSchema.parse({
      dataSource,
      issues: redactDashboardPayload([issue]),
      status: "error",
    }),
    statusCode,
  };
}

export function redactDashboardPayload<T>(payload: T): T {
  return redactValue(payload) as T;
}

function redactValue(value: unknown, key?: string): unknown {
  if (key && sensitiveKeyPattern.test(key)) return REDACTED;
  if (typeof value === "string") return redactString(value);
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null ||
    value === undefined
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }
  if (typeof value === "object") {
    if (isIssueLike(value)) return redactIssueValue(value);
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(
        ([entryKey, entryValue]) => [
          entryKey,
          redactValue(entryValue, entryKey),
        ],
      ),
    );
  }
  return typeof value;
}

function isIssueLike(value: unknown): value is Issue {
  if (!value || typeof value !== "object") return false;
  return (
    typeof (value as { code?: unknown }).code === "string" &&
    typeof (value as { message?: unknown }).message === "string" &&
    ("remediation" in value
      ? typeof (value as { remediation?: unknown }).remediation === "string"
      : true)
  );
}

function redactIssueValue(issue: Issue): Issue {
  return {
    code: redactString(issue.code),
    message: redactString(issue.message),
    ...(issue.remediation
      ? { remediation: redactString(issue.remediation) }
      : {}),
  };
}

function redactString(value: string): string {
  return redactSecrets(value)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`)
    .replace(
      /(access[_-]?token|accessToken|app[_-]?secret|appSecret|authorization|client[_-]?token|clientToken|code|refresh[_-]?token|refreshToken|secret|tenant[_-]?access[_-]?token|tenant_access_token|token)\s*[:=]\s*["']?[^"',\s}]+/gi,
      "$1=[REDACTED]",
    );
}
