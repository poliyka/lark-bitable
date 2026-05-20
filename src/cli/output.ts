import Table from "cli-table3";

import type {
  OwnerCriteria,
  QueryLimit,
  Issue,
  ResearchEvidence,
  SourceMetadata,
  WorkflowMode,
} from "../config/schema.js";
import { redactSecrets } from "../reporting/evidence.js";

export type CommandStatus = "ok" | "partial" | "error";

export interface AuthOutput {
  status: "ready" | "missing" | "expired" | "invalid" | "insufficient-scope";
  storagePath?: string;
  domain?: string;
  accountLabel?: string;
  expiresAt?: string;
}

export interface CommandOutput<T = unknown> {
  command: string;
  status: CommandStatus;
  source?: SourceMetadata;
  auth?: AuthOutput;
  evidence?: ResearchEvidence[];
  issues?: Issue[];
  mode?: {
    active: WorkflowMode | null;
    source?: "explicit" | "defaulted" | "invalid";
  };
  ownerCriteria?: OwnerCriteria;
  queryLimit?: QueryLimit;
  data?: T;
}

export interface NormalizedCommandOutput<T = unknown> {
  command: string;
  status: CommandStatus;
  source: SourceMetadata | null;
  auth: AuthOutput | null;
  evidence: ResearchEvidence[];
  issues: Issue[];
  mode: CommandOutput["mode"] | null;
  ownerCriteria: OwnerCriteria | null;
  queryLimit: QueryLimit | null;
  data: T | null;
}

export function normalizeOutput<T>(
  output: CommandOutput<T>,
): NormalizedCommandOutput<T> {
  return {
    command: output.command,
    status: output.status,
    source: output.source ?? null,
    auth: output.auth ?? null,
    evidence: output.evidence ?? [],
    issues: output.issues ?? [],
    mode: output.mode ?? null,
    ownerCriteria: output.ownerCriteria ?? null,
    queryLimit: output.queryLimit ?? null,
    data: output.data ?? null,
  };
}

export function formatJson(output: CommandOutput): string {
  return redactSecrets(JSON.stringify(normalizeOutput(output), null, 2));
}

export function formatHuman(output: CommandOutput): string {
  const normalized = normalizeOutput(output);
  const lines = [
    `command: ${normalized.command}`,
    `status: ${normalized.status}`,
  ];

  if (normalized.auth) {
    lines.push(`auth: ${normalized.auth.status}`);
  }

  if (normalized.source) {
    lines.push(
      `source: app=${normalized.source.appToken} table=${normalized.source.tableId}` +
        (normalized.source.viewId ? ` view=${normalized.source.viewId}` : ""),
    );
  }

  if (normalized.mode) {
    lines.push(
      `mode: ${normalized.mode.active ?? "missing"}${normalized.mode.source ? ` (${normalized.mode.source})` : ""}`,
    );
  }

  if (normalized.ownerCriteria) {
    lines.push(
      `owner: ${normalized.ownerCriteria.value ?? "(none)"} applied=${normalized.ownerCriteria.applied}` +
        (normalized.ownerCriteria.notAppliedReason
          ? ` reason=${normalized.ownerCriteria.notAppliedReason}`
          : ""),
    );
  }

  if (normalized.queryLimit) {
    lines.push(
      `limit: ${normalized.queryLimit.limit} returned=${normalized.queryLimit.returned} hasMore=${normalized.queryLimit.hasMore}`,
    );
  }

  for (const issue of normalized.issues) {
    lines.push(`issue: ${issue.code} - ${issue.message}`);
    if (issue.remediation) lines.push(`remediation: ${issue.remediation}`);
  }

  if (normalized.evidence.length > 0) {
    lines.push(`evidence: ${normalized.evidence.length}`);
  }

  if (normalized.data !== null) {
    lines.push(...renderHumanData(normalized.data));
  }

  return redactSecrets(lines.join("\n"));
}

export function writeOutput(output: CommandOutput, json = false): void {
  process.stdout.write(`${json ? formatJson(output) : formatHuman(output)}\n`);
}

function renderHumanData(data: unknown): string[] {
  if (!isRecord(data)) return [`data: ${renderInlineValue(data)}`];

  const entries = Object.entries(data);
  if (entries.length === 0) return ["data: (empty)"];

  const lines = ["data:"];
  for (const [key, value] of entries) {
    lines.push(...renderDataEntry(key, value, `data.${key}`));
  }
  return lines;
}

function renderDataEntry(
  key: string,
  value: unknown,
  sectionLabel: string,
): string[] {
  if (Array.isArray(value)) {
    return renderArraySection(sectionLabel, value);
  }

  if (isRecord(value)) {
    return renderObjectSection(key, value);
  }

  return [`${key}: ${renderInlineValue(value, key)}`];
}

function renderObjectSection(key: string, value: Record<string, unknown>) {
  const entries = Object.entries(value);
  if (entries.length === 0) return [`${key}: (empty)`];

  const lines = [`${key}:`];
  for (const [childKey, childValue] of entries) {
    if (Array.isArray(childValue)) {
      lines.push(...indentLines(renderArraySection(childKey, childValue)));
      continue;
    }
    if (isRecord(childValue)) {
      lines.push(...indentLines(renderObjectSection(childKey, childValue)));
      continue;
    }
    lines.push(`  ${childKey}: ${renderInlineValue(childValue, childKey)}`);
  }
  return lines;
}

function renderArraySection(label: string, value: unknown[]): string[] {
  if (value.length === 0) return [`${label}: (none)`];

  const table = tableForArray(label, value);
  if (table) return [`${label}:`, table];

  return [
    `${label}:`,
    ...value.map((item, index) => `  ${index + 1}. ${renderInlineValue(item)}`),
  ];
}

function tableForArray(label: string, value: unknown[]): string | null {
  const rows = value.filter(isRecord);
  if (rows.length !== value.length) return null;

  if (label.endsWith(".records") || label === "records") {
    return renderRecordsTable(rows);
  }

  if (label.endsWith(".candidates") || label === "candidates") {
    return renderCandidatesTable(rows);
  }

  if (label.endsWith(".fields") || label === "fields") {
    return renderFieldsTable(rows);
  }

  if (label.endsWith(".fieldChanges") || label === "fieldChanges") {
    return renderGenericTable(
      ["fieldName", "status", "requestedValue", "previousValue", "resultValue"],
      rows,
    );
  }

  if (label.endsWith(".issues") || label === "issues") {
    return renderGenericTable(["code", "message", "remediation"], rows);
  }

  if (label.endsWith(".evidence") || label === "evidence") {
    return renderGenericTable(
      ["id", "type", "status", "reference", "excerpt"],
      rows,
    );
  }

  return renderGenericObjectArrayTable(rows);
}

function renderRecordsTable(rows: Record<string, unknown>[]): string {
  const allFieldNames = uniqueStrings(
    rows.flatMap((row) =>
      isRecord(row.fields) ? Object.keys(row.fields) : [],
    ),
  );
  const fieldNames = allFieldNames.slice(0, 4);
  const hasHiddenFields = allFieldNames.length > fieldNames.length;
  const hasMatchedFields = rows.some(
    (row) => Array.isArray(row.matchedFields) && row.matchedFields.length > 0,
  );
  const headers = [
    "recordId",
    ...fieldNames,
    ...(hasHiddenFields ? ["moreFields"] : []),
    ...(hasMatchedFields ? ["matchedFields"] : []),
  ];
  const tableRows = rows.map((row) => {
    const fields = isRecord(row.fields) ? row.fields : {};
    const hiddenFieldCount = Object.keys(fields).filter(
      (fieldName) => !fieldNames.includes(fieldName),
    ).length;
    return {
      recordId: row.recordId,
      ...Object.fromEntries(
        fieldNames.map((fieldName) => [fieldName, fields[fieldName]]),
      ),
      ...(hasHiddenFields ? { moreFields: hiddenFieldCount } : {}),
      ...(hasMatchedFields ? { matchedFields: row.matchedFields } : {}),
    };
  });
  return renderGenericTable(headers, tableRows);
}

function renderCandidatesTable(rows: Record<string, unknown>[]): string {
  const tableRows = rows.map((row) => ({
    recordId: isRecord(row.record) ? row.record.recordId : undefined,
    title: row.title,
    status: row.status,
    priority: row.priority,
    owner: row.owner,
    missingFields: row.missingFields,
  }));
  return renderGenericTable(
    ["recordId", "title", "status", "priority", "owner", "missingFields"],
    tableRows,
  );
}

function renderFieldsTable(rows: Record<string, unknown>[]): string {
  const tableRows = rows.map((row) => ({
    fieldName: row.fieldName,
    type: row.type,
    uiType: row.uiType,
    options: namesFromArray(row.options),
    nonEmpty: row.nonEmptyInSample,
    observedValues: row.observedValues,
  }));
  return renderGenericTable(
    ["fieldName", "type", "uiType", "options", "nonEmpty", "observedValues"],
    tableRows,
  );
}

function renderGenericObjectArrayTable(rows: Record<string, unknown>[]) {
  const headers = uniqueStrings(
    rows.flatMap((row) =>
      Object.entries(row)
        .filter(([, value]) => !isRecord(value) && !Array.isArray(value))
        .map(([key]) => key),
    ),
  ).slice(0, 6);

  if (headers.length === 0) {
    return renderGenericTable(
      ["index", "value"],
      rows.map((row, index) => ({ index: index + 1, value: row })),
    );
  }

  return renderGenericTable(headers, rows);
}

function renderGenericTable(
  headers: string[],
  rows: Record<string, unknown>[],
): string {
  const table = new Table({
    colWidths: columnWidths(headers),
    head: headers,
    style: {
      border: [],
      head: [],
    },
    wordWrap: true,
    wrapOnWordBoundary: false,
  });

  table.push(
    ...rows.map((row) =>
      headers.map((header) => renderInlineValue(row[header], header)),
    ),
  );

  return table.toString();
}

function columnWidths(headers: string[]): number[] {
  const terminalWidth = process.stdout.columns
    ? Math.min(process.stdout.columns, 120)
    : 100;
  const separators = headers.length + 1;
  const usableWidth = Math.max(48, terminalWidth - separators);
  const baseWidth = Math.floor(usableWidth / Math.max(headers.length, 1));
  return headers.map((header) =>
    Math.max(8, Math.min(Math.max(header.length + 2, baseWidth), 28)),
  );
}

function renderInlineValue(value: unknown, key?: string): string {
  if (value === null || value === undefined || value === "") return "(empty)";
  if (typeof value === "string") {
    if (shouldOmitString(key, value)) {
      return `(omitted, ${value.length} chars)`;
    }
    return truncate(value.replace(/\s+/g, " ").trim());
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "(none)";
    return truncate(
      value
        .map((item) =>
          isRecord(item) && typeof item.name === "string"
            ? item.name
            : renderInlineValue(item),
        )
        .join(", "),
    );
  }
  return truncate(safeJson(value));
}

function shouldOmitString(key: string | undefined, value: string): boolean {
  const isLongMultiline = value.length > 500 && value.includes("\n");
  if (!key) return isLongMultiline;

  const normalizedKey = key.toLowerCase();
  return (
    isLongMultiline ||
    ((normalizedKey.includes("report") || normalizedKey.includes("markdown")) &&
      (value.length > 240 || value.includes("\n")))
  );
}

function namesFromArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) =>
    isRecord(item) && typeof item.name === "string"
      ? item.name
      : renderInlineValue(item),
  );
}

function indentLines(lines: string[]): string[] {
  return lines.map((line) => `  ${line}`);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function truncate(value: string): string {
  return value.length > 180 ? `${value.slice(0, 177)}...` : value;
}
