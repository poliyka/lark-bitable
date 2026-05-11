import type { BitableRecord, SourceMetadata } from "../config/schema.js";

export type FilterOperator = "equals" | "contains";

export interface RawBitableRecord {
  fields?: Record<string, unknown>;
  record_id?: string;
  recordId?: string;
  source: SourceMetadata;
}

export function mapRecord(input: RawBitableRecord): BitableRecord {
  const recordId = input.recordId ?? input.record_id;
  if (!recordId) {
    throw new Error("Bitable record is missing record id");
  }

  return {
    recordId,
    fields: input.fields ?? {},
    source: input.source,
    matchedFields: [],
  };
}

export function renderFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "(empty)";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function filterRecords(
  records: BitableRecord[],
  field: string,
  operator: FilterOperator,
  value: string,
): BitableRecord[] {
  return records.filter((record) => {
    const rendered = renderFieldValue(record.fields[field]);
    if (operator === "equals") return rendered === value;
    if (operator === "contains") {
      return rendered.toLowerCase().includes(value.toLowerCase());
    }
    return false;
  });
}

export function searchRecords(
  records: BitableRecord[],
  query: string,
  fields?: string[],
): BitableRecord[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  return records
    .map((record) => {
      const selectedFields = fields ?? Object.keys(record.fields);
      const matchedFields = selectedFields.filter((field) => {
        const value = record.fields[field];
        if (typeof value !== "string") return false;
        return value.toLowerCase().includes(trimmed);
      });

      return {
        ...record,
        matchedFields,
      };
    })
    .filter((record) => record.matchedFields.length > 0);
}
