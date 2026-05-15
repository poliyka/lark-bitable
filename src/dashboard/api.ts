import type { Issue } from "../config/schema.js";
import {
  apiEnvelopeSchema,
  type ApiEnvelope,
  type DashboardDataSource,
  type DashboardStatus,
} from "./schemas.js";
import { redactDashboardPayload } from "./redaction.js";

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

export { redactDashboardPayload } from "./redaction.js";
