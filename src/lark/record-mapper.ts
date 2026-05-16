import type { BitableRecord, SourceMetadata } from "../config/schema.js";

export type FilterOperator = "equals" | "contains";

export interface FilterCriterion {
  field: string;
  operator: FilterOperator;
  value: string;
}

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

export function filterRecordsByCriteria(
  records: BitableRecord[],
  criteria: FilterCriterion[],
): BitableRecord[] {
  return criteria.reduce(
    (current, criterion) =>
      filterRecords(
        current,
        criterion.field,
        criterion.operator,
        criterion.value,
      ),
    records,
  );
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

export interface MediaReference {
  contentType?: string;
  field: string;
  fileToken: string;
  name?: string;
  size?: number;
  url?: string;
}

export function extractMediaReferences(
  record: BitableRecord,
): MediaReference[] {
  const refs: MediaReference[] = [];
  for (const [field, value] of Object.entries(record.fields)) {
    collectMediaReferences(field, value, refs);
  }
  return refs;
}

function collectMediaReferences(
  field: string,
  value: unknown,
  refs: MediaReference[],
): void {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const item of value) collectMediaReferences(field, item, refs);
    return;
  }
  if (typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  const fileToken =
    stringValue(record.file_token) ??
    stringValue(record.fileToken) ??
    tokenFromUrl(stringValue(record.url));
  if (fileToken) {
    refs.push({
      contentType: stringValue(record.type) ?? stringValue(record.mime_type),
      field,
      fileToken,
      name: stringValue(record.name),
      size: numberValue(record.size),
      url: stringValue(record.url),
    });
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function tokenFromUrl(value: string | undefined): string | undefined {
  const match = value?.match(/\/medias\/([^/]+)\/download/);
  return match?.[1];
}
