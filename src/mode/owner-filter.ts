import type {
  BitableRecord,
  OwnerCriteria,
  QueryLimit,
  WorkflowMode,
} from "../config/schema.js";
import { CliError } from "../cli/errors.js";

export interface OwnerResolutionInput {
  commandOwner?: string;
  mode: WorkflowMode;
}

export interface OwnerFilterResult {
  criteria: OwnerCriteria;
  records: BitableRecord[];
}

export function resolveOwnerCriteria(
  input: OwnerResolutionInput,
): OwnerCriteria {
  const value = input.commandOwner?.trim() || undefined;
  const valueSource = value ? "command" : "none";

  if (!value) {
    return {
      applied: false,
      field: null,
      matchedRecords: 0,
      mode: input.mode,
      source: "none",
      totalRecordsBeforeFilter: 0,
    };
  }

  return {
    applied: true,
    field: null,
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
  if (!criteria.value || !criteria.applied) {
    return {
      criteria: {
        ...criteria,
        matchedRecords: records.length,
        totalRecordsBeforeFilter,
      },
      records,
    };
  }

  const field = criteria.field ?? inferOwnerField(records);
  if (!field) {
    return {
      criteria: {
        ...criteria,
        applied: false,
        field: null,
        matchedRecords: records.length,
        notAppliedReason: "missing-owner-field",
        totalRecordsBeforeFilter,
      },
      records,
    };
  }

  const filtered = records.filter((record) =>
    extractVisibleOwnerValues(record.fields[field]).includes(criteria.value!),
  );
  return {
    criteria: {
      ...criteria,
      field,
      matchedRecords: filtered.length,
      totalRecordsBeforeFilter,
    },
    records: filtered,
  };
}

function inferOwnerField(records: BitableRecord[]): string | null {
  const candidates = [
    "處理人",
    "处理人",
    "負責人",
    "负责人",
    "owner",
    "assignee",
  ];
  for (const field of candidates) {
    if (records.some((record) => Object.hasOwn(record.fields, field))) {
      return field;
    }
  }
  return null;
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
