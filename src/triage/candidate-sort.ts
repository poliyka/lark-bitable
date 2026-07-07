import type { BitableRecord, BugCandidate } from "../config/schema.js";

function fieldValue(record: BitableRecord, field?: string): unknown {
  return field ? record.fields[field] : undefined;
}

const originalDescriptionFieldNames = [
  "原始詳細敘述",
  "原始詳細描述",
  "詳細敘述",
  "詳細描述",
  "原始描述",
  "描述",
  "說明",
  "description",
  "details",
  "detail",
  "originalDescription",
];

const titleFieldNames = [
  "問題名稱",
  "问题名称",
  "標題",
  "标题",
  "title",
  "name",
  "summary",
];

const statusFieldNames = [
  "當前狀態",
  "当前状态",
  "目前狀態",
  "目前状态",
  "狀態",
  "状态",
  "status",
];

const priorityFieldNames = [
  "優先級",
  "优先级",
  "優先度",
  "优先度",
  "priority",
  "severity",
];

const ownerFieldNames = [
  "處理人",
  "处理人",
  "負責人",
  "负责人",
  "owner",
  "assignee",
];

const defaultPriorityOrder = [
  "P0",
  "P1",
  "P2",
  "P3",
  "最高",
  "高",
  "中",
  "低",
  "High",
  "Medium",
  "Low",
];

export function extractBugCandidates(records: BitableRecord[]): BugCandidate[] {
  return records.map((record) => {
    const titleField = firstPresentField(record, titleFieldNames);
    const statusField = firstPresentField(record, statusFieldNames);
    const priorityField = firstPresentField(record, priorityFieldNames);
    const ownerField = firstPresentField(record, ownerFieldNames);
    const missingFields: string[] = [];

    if (!titleField || fieldValue(record, titleField) === undefined) {
      missingFields.push("title");
    }
    if (!statusField || fieldValue(record, statusField) === undefined) {
      missingFields.push("status");
    }
    if (!priorityField || fieldValue(record, priorityField) === undefined) {
      missingFields.push("priority");
    }

    const title = fieldValue(record, titleField);
    return {
      record,
      title: typeof title === "string" ? title : undefined,
      status: fieldValue(record, statusField),
      priority: fieldValue(record, priorityField),
      owner: fieldValue(record, ownerField),
      originalDescription: firstDefinedFieldValue(record, [
        ...originalDescriptionFieldNames,
      ]),
      reproductionSteps: undefined,
      expectedBehavior: undefined,
      actualBehavior: undefined,
      links: undefined,
      notes: undefined,
      missingFields,
    };
  });
}

function firstPresentField(
  record: BitableRecord,
  fieldNames: string[],
): string | undefined {
  return fieldNames.find((fieldName) =>
    Object.hasOwn(record.fields, fieldName),
  );
}

function firstDefinedFieldValue(
  record: BitableRecord,
  fields: Array<string | undefined>,
): unknown {
  for (const field of fields) {
    const value = fieldValue(record, field);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

export function filterActionableCandidates(
  candidates: BugCandidate[],
  actionableStatus?: string,
): BugCandidate[] {
  if (!actionableStatus) return candidates;
  return candidates.filter(
    (candidate) => candidate.status === actionableStatus,
  );
}

export function observedStatusValues(candidates: BugCandidate[]): string[] {
  return [
    ...new Set(
      candidates
        .map((candidate) => candidate.status)
        .filter((status): status is string => typeof status === "string"),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function sortCandidatesByPriority(
  candidates: BugCandidate[],
  priorityOrder: string[] = defaultPriorityOrder,
): BugCandidate[] {
  const priorityIndex = new Map(
    priorityOrder.map((priority, index) => [priority, index]),
  );

  return [...candidates].sort((a, b) => {
    const left =
      typeof a.priority === "string" && priorityIndex.has(a.priority)
        ? priorityIndex.get(a.priority)!
        : Number.MAX_SAFE_INTEGER;
    const right =
      typeof b.priority === "string" && priorityIndex.has(b.priority)
        ? priorityIndex.get(b.priority)!
        : Number.MAX_SAFE_INTEGER;

    return left - right || a.record.recordId.localeCompare(b.record.recordId);
  });
}
