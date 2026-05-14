import {
  getAuditEntry,
  queryAuditEntries,
  type AuditQueryInput,
} from "../audit/query.js";
import { redactDashboardPayload } from "./api.js";

export async function listDashboardAuditEntries(input: AuditQueryInput) {
  return redactDashboardPayload(await queryAuditEntries(input));
}

export async function getDashboardAuditEntry(input: {
  auditPath: string;
  id: string;
}) {
  const detail = await getAuditEntry(input);
  if (!detail) {
    throw new Error(`Audit entry not found: ${input.id}`);
  }
  return redactDashboardPayload(detail);
}
