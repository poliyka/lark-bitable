import type {
  BitableRecord,
  Issue,
  ResearchEvidence,
  WriteFieldChange,
  WriteOperation,
  WriteResult,
} from "../config/schema.js";
import { redactSecrets } from "../reporting/evidence.js";
import { valuesEqual } from "./operation.js";

export interface ConfirmedWriteResultInput {
  evidence?: ResearchEvidence[];
  record: BitableRecord;
}

export interface UnknownWriteResultInput {
  code?: string;
  evidence?: ResearchEvidence[];
  message: string;
  remediation?: string;
}

export function buildPreviewWriteResult(
  operation: WriteOperation,
): WriteResult {
  return {
    operationId: operation.operationId,
    type: operation.type,
    commitState: "previewed",
    confirmationStatus: "not-written",
    targetRecordId: operation.targetRecordId,
    clientToken: operation.clientToken,
    fieldChanges: operation.fieldChanges,
    issues: [],
    warnings: [
      "No table content was changed because --confirm was not provided.",
    ],
    evidence: [
      writeEvidence({
        reference: operation.operationId,
        excerpt: "Write request was validated and previewed without commit.",
        status: "not-run",
      }),
    ],
    nextActions: [confirmCommandFor(operation)],
  };
}

export function buildConfirmedWriteResult(
  operation: WriteOperation,
  input: ConfirmedWriteResultInput,
): WriteResult {
  const fieldChanges = operation.fieldChanges.map((change) =>
    classifyConfirmedFieldChange(change, input.record),
  );

  return {
    operationId: operation.operationId,
    type: operation.type,
    commitState: "committed",
    confirmationStatus: "confirmed",
    targetRecordId: input.record.recordId,
    clientToken: operation.clientToken,
    fieldChanges,
    createdRecord: operation.type === "create" ? input.record : undefined,
    updatedRecord: operation.type === "update" ? input.record : undefined,
    issues: [],
    warnings: [],
    evidence: [
      ...(input.evidence ?? []),
      writeEvidence({
        reference: input.record.recordId,
        excerpt:
          "Returned or confirmed record data supports final write state.",
        status: "verified",
      }),
    ],
    nextActions: [`lark-bitable get ${input.record.recordId} --json`],
  };
}

export function buildUnknownWriteResult(
  operation: WriteOperation,
  input: UnknownWriteResultInput,
): WriteResult {
  const issue: Issue = {
    code: input.code ?? "write-confirmation-unknown",
    message: input.message,
    remediation:
      input.remediation ??
      "Run lark-bitable get <record-id> --json or inspect the table before retrying.",
  };

  return {
    operationId: operation.operationId,
    type: operation.type,
    commitState:
      operation.commitState === "previewed" ? "blocked" : "committed",
    confirmationStatus: "unknown",
    targetRecordId: operation.targetRecordId,
    clientToken: operation.clientToken,
    fieldChanges: operation.fieldChanges.map((change) => ({
      ...change,
      status: change.status === "unchanged" ? "unchanged" : "unknown",
    })),
    issues: [issue],
    warnings: [
      "The final table state could not be confirmed from available evidence.",
    ],
    evidence: [
      ...(input.evidence ?? []),
      writeEvidence({
        reference: operation.operationId,
        excerpt: input.message,
        status: "partial",
      }),
    ],
    nextActions: [
      operation.targetRecordId
        ? `lark-bitable get ${operation.targetRecordId} --json`
        : "Inspect the target table before retrying the create request.",
    ],
  };
}

export function buildPartialWriteResult(
  operation: WriteOperation,
  input: UnknownWriteResultInput,
): WriteResult {
  const result = buildUnknownWriteResult(operation, input);
  return {
    ...result,
    confirmationStatus: "partial",
    warnings: [
      "The write outcome is partial; confirm the final table state before retrying.",
    ],
  };
}

export function buildFailedWriteResult(
  operation: WriteOperation,
  issue: Issue,
): WriteResult {
  return {
    operationId: operation.operationId,
    type: operation.type,
    commitState: "blocked",
    confirmationStatus: "failed",
    targetRecordId: operation.targetRecordId,
    clientToken: operation.clientToken,
    fieldChanges: operation.fieldChanges.map((change) => ({
      ...change,
      status: "rejected",
      validationIssues: [issue],
    })),
    issues: [issue],
    warnings: [],
    evidence: [
      writeEvidence({
        reference: operation.operationId,
        excerpt: issue.message,
        status: "failed",
      }),
    ],
    nextActions: issue.remediation ? [issue.remediation] : [],
  };
}

export function writeEvidence(input: {
  excerpt: string;
  reference: string;
  status: ResearchEvidence["status"];
  type?: ResearchEvidence["type"];
}): ResearchEvidence {
  return {
    type: input.type ?? "runtime-observation",
    reference: input.reference,
    excerpt: redactSecrets(input.excerpt),
    collectedAt: new Date().toISOString(),
    status: input.status,
  };
}

export function issueFromWriteError(error: unknown): Issue {
  const message = redactSecrets(
    error instanceof Error ? error.message : "Lark write request failed.",
  );
  const permissionLike =
    /\b(403|permission|Forbidden|denied|unauthorized|scope)\b/i.test(message);
  const invalidValueLike = /\b(invalid|value|field)\b/i.test(message);
  return {
    code: permissionLike
      ? "write-permission-denied"
      : invalidValueLike
        ? "write-value-rejected"
        : "write-request-failed",
    message,
    remediation: permissionLike
      ? "Grant a write-capable Bitable permission to the Lark app/user, publish the app version if needed, then run lark-bitable lark --login again."
      : "Check field names and values with lark-bitable schema --json, then retry from preview.",
  };
}

function classifyConfirmedFieldChange(
  change: WriteFieldChange,
  record: BitableRecord,
): WriteFieldChange {
  const resultValue = record.fields[change.fieldName];
  const unchanged =
    change.previousValue !== undefined &&
    valuesEqual(change.previousValue, resultValue);
  const changed = valuesEqual(change.requestedValue, resultValue) && !unchanged;
  return {
    ...change,
    resultValue,
    status: unchanged ? "unchanged" : changed ? "changed" : "unknown",
  };
}

function confirmCommandFor(operation: WriteOperation): string {
  const fieldJson = JSON.stringify(operation.requestedFields);
  const base =
    operation.type === "update"
      ? `lark-bitable write --op update --record-id ${operation.targetRecordId} --fields-json '${fieldJson}' --confirm --json`
      : `lark-bitable write --op create --fields-json '${fieldJson}' --confirm --json`;
  return operation.clientToken
    ? `${base} --client-token ${operation.clientToken}`
    : base;
}
