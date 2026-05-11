import { randomUUID } from "node:crypto";

import { CliError } from "../cli/errors.js";
import type {
  BitableRecord,
  BitableSource,
  WriteFieldChange,
  WriteOperation,
} from "../config/schema.js";
import type { BitableFieldInfo } from "../lark/field-discovery.js";

export interface CreateWriteOperationInput {
  clientToken?: string;
  confirm?: boolean;
  currentRecord?: BitableRecord;
  fields: Record<string, unknown>;
  now?: Date;
  operationId?: string;
  recordId?: string;
  requestedBy?: WriteOperation["requestedBy"];
  source: BitableSource;
  tableFields: BitableFieldInfo[];
  type: "create" | "update";
}

export function createWriteOperation(
  input: CreateWriteOperationInput,
): WriteOperation {
  validateOperationShape(input);

  const source = sourceMetadataFor(input.source, input.now);
  const fieldChanges = Object.entries(input.fields).map(
    ([fieldName, requestedValue]): WriteFieldChange => {
      const previousValue =
        input.type === "update"
          ? input.currentRecord?.fields[fieldName]
          : undefined;
      return {
        fieldName,
        requestedValue,
        previousValue,
        status:
          input.type === "update" && valuesEqual(previousValue, requestedValue)
            ? "unchanged"
            : "pending",
        validationIssues: [],
      };
    },
  );

  return {
    operationId: input.operationId ?? randomUUID(),
    type: input.type,
    source,
    targetRecordId: input.type === "update" ? input.recordId : undefined,
    requestedFields: input.fields,
    fieldChanges,
    previewedAt: (input.now ?? new Date()).toISOString(),
    commitState: input.confirm ? "confirmed-request" : "previewed",
    clientToken: input.clientToken,
    requestedBy: input.requestedBy ?? "unknown",
  };
}

export function sourceMetadataFor(
  source: Pick<BitableSource, "appToken" | "tableId" | "viewId">,
  now = new Date(),
): WriteOperation["source"] {
  return {
    appToken: source.appToken,
    tableId: source.tableId,
    viewId: source.viewId,
    retrievedAt: now.toISOString(),
  };
}

export function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validateOperationShape(input: CreateWriteOperationInput): void {
  if (input.type !== "create" && input.type !== "update") {
    throw new CliError({
      code: "unsupported-write-operation",
      message: `Unsupported write operation: ${String(input.type)}`,
      remediation: "Use --op create or --op update.",
    });
  }

  if (input.type === "update" && !input.recordId?.trim()) {
    throw new CliError({
      code: "missing-record-id",
      message: "Record id is required for update writes.",
      remediation:
        "Run lark-bitable write --op update --record-id <record-id>.",
    });
  }

  if (input.type === "create" && input.recordId?.trim()) {
    throw new CliError({
      code: "invalid-record-id",
      message: "Record id is not valid for create writes.",
      remediation: "Remove --record-id when using --op create.",
    });
  }

  if (input.type !== "create" && input.clientToken) {
    throw new CliError({
      code: "invalid-client-token",
      message: "Client token is only valid for create writes.",
      remediation: "Use --client-token only with --op create --confirm.",
    });
  }

  if (Object.keys(input.fields).length === 0) {
    throw new CliError({
      code: "empty-write-fields",
      message: "At least one field value is required.",
      remediation: 'Pass --field "欄位=值" or --fields-json \'{"欄位":"值"}\'.',
    });
  }

  const knownFields = new Set(
    input.tableFields.map((field) => field.fieldName),
  );
  for (const fieldName of Object.keys(input.fields)) {
    if (!knownFields.has(fieldName)) {
      throw new CliError({
        code: "unknown-field",
        message: `Unknown field: ${fieldName}`,
        remediation:
          "Run lark-bitable schema --json to inspect current field names.",
      });
    }
  }
}
