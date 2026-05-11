import type {
  BitableRecord,
  BitableSource,
  OwnerCriteria,
  QueryLimit,
  WorkflowConfig,
  WorkflowMode,
} from "../config/schema.js";
import { CliError } from "../cli/errors.js";
import { defaultOwnerForMode } from "./mode-config.js";

export interface OwnerResolutionInput {
  commandOwner?: string;
  ignoreDefaultOwner?: boolean;
  mode: WorkflowMode;
  source: BitableSource;
  workflowConfig?: WorkflowConfig;
}

export interface OwnerFilterResult {
  criteria: OwnerCriteria;
  records: BitableRecord[];
}

export function resolveOwnerCriteria(
  input: OwnerResolutionInput,
): OwnerCriteria {
  const commandOwner = input.commandOwner?.trim();
  const defaultOwner =
    input.ignoreDefaultOwner || commandOwner
      ? undefined
      : defaultOwnerForMode(input.workflowConfig, input.mode)?.trim();
  const value = commandOwner || defaultOwner || undefined;
  const valueSource = commandOwner
    ? "command"
    : defaultOwner
      ? "mode-default"
      : "none";
  const field = input.source.fieldAliases?.owner ?? null;

  if (!value) {
    return {
      applied: false,
      field,
      matchedRecords: 0,
      mode: input.mode,
      source: "none",
      totalRecordsBeforeFilter: 0,
    };
  }

  if (!field) {
    return {
      applied: false,
      field: null,
      matchedRecords: 0,
      mode: input.mode,
      notAppliedReason: "missing-owner-field",
      source: valueSource,
      totalRecordsBeforeFilter: 0,
      value,
    };
  }

  return {
    applied: true,
    field,
    matchedRecords: 0,
    mode: input.mode,
    source: valueSource,
    totalRecordsBeforeFilter: 0,
    value,
  };
}

export function applyOwnerFilter(
  records: BitableRecord[],
  criteria: OwnerCriteria,
): OwnerFilterResult {
  const totalRecordsBeforeFilter = records.length;
  if (!criteria.value || !criteria.field || !criteria.applied) {
    return {
      criteria: {
        ...criteria,
        matchedRecords: records.length,
        totalRecordsBeforeFilter,
      },
      records,
    };
  }

  const filtered = records.filter((record) =>
    extractVisibleOwnerValues(record.fields[criteria.field!]).includes(
      criteria.value!,
    ),
  );
  return {
    criteria: {
      ...criteria,
      matchedRecords: filtered.length,
      totalRecordsBeforeFilter,
    },
    records: filtered,
  };
}

export function extractVisibleOwnerValues(value: unknown): string[] {
  const values = new Set<string>();
  collectVisibleValues(value, values);
  return [...values].filter(Boolean);
}

function collectVisibleValues(value: unknown, values: Set<string>): void {
  if (value === null || value === undefined || value === "") return;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    values.add(String(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectVisibleValues(item, values);
    return;
  }
  if (typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  const valueCountBeforeRecord = values.size;
  for (const key of [
    "name",
    "text",
    "displayName",
    "display_name",
    "email",
    "en_name",
    "zh_name",
    "value",
  ]) {
    const visible = record[key];
    if (
      typeof visible === "string" ||
      typeof visible === "number" ||
      typeof visible === "boolean"
    ) {
      values.add(String(visible));
    }
  }
  for (const key of ["option", "options", "users", "members"]) {
    if (key in record) collectVisibleValues(record[key], values);
  }
  if (values.size > valueCountBeforeRecord) return;

  for (const key of [
    "id",
    "open_id",
    "openId",
    "union_id",
    "unionId",
    "user_id",
    "userId",
    "member_id",
    "memberId",
  ]) {
    const fallback = record[key];
    if (
      typeof fallback === "string" ||
      typeof fallback === "number" ||
      typeof fallback === "boolean"
    ) {
      values.add(String(fallback));
    }
  }
}

export function parsePositiveLimit(input: {
  defaultLimit?: number;
  flagLimit?: number;
}): { limit: number; source: "command" | "default" } {
  const limit = input.flagLimit ?? input.defaultLimit;
  const source = input.flagLimit === undefined ? "default" : "command";
  if (!Number.isInteger(limit) || !limit || limit <= 0) {
    throw new CliError({
      code: "invalid-limit",
      message: "Limit must be a positive integer.",
      remediation:
        "Run the command with --limit 10 or another positive integer.",
    });
  }
  return { limit, source };
}

export function applyQueryLimit<T>(
  items: T[],
  input: {
    appliedAfter: string[];
    limit: number;
    source: "command" | "default";
  },
): { items: T[]; queryLimit: QueryLimit } {
  const limited = items.slice(0, input.limit);
  return {
    items: limited,
    queryLimit: {
      appliedAfter: input.appliedAfter,
      hasMore: items.length > limited.length,
      limit: input.limit,
      returned: limited.length,
      source: input.source,
    },
  };
}
