import type {
  BitableRecord,
  BitableSource,
  BugCandidate,
} from "../config/schema.js";

function fieldValue(record: BitableRecord, field?: string): unknown {
  return field ? record.fields[field] : undefined;
}

export function extractBugCandidates(
  records: BitableRecord[],
  source: BitableSource,
): BugCandidate[] {
  return records.map((record) => {
    const titleField = source.fieldAliases?.title;
    const missingFields: string[] = [];

    if (!titleField || fieldValue(record, titleField) === undefined) {
      missingFields.push("title");
    }
    if (
      !source.statusField ||
      fieldValue(record, source.statusField) === undefined
    ) {
      missingFields.push("status");
    }
    if (
      !source.priorityField ||
      fieldValue(record, source.priorityField) === undefined
    ) {
      missingFields.push("priority");
    }

    const title = fieldValue(record, titleField);
    return {
      record,
      title: typeof title === "string" ? title : undefined,
      status: fieldValue(record, source.statusField),
      priority: fieldValue(record, source.priorityField),
      owner: fieldValue(record, source.fieldAliases?.owner),
      reproductionSteps: fieldValue(
        record,
        source.fieldAliases?.reproductionSteps,
      ),
      expectedBehavior: fieldValue(
        record,
        source.fieldAliases?.expectedBehavior,
      ),
      actualBehavior: fieldValue(record, source.fieldAliases?.actualBehavior),
      links: fieldValue(record, source.fieldAliases?.links),
      missingFields,
    };
  });
}

export function filterActionableCandidates(
  candidates: BugCandidate[],
  actionableStatus = "待處理",
): BugCandidate[] {
  return candidates.filter(
    (candidate) => candidate.status === actionableStatus,
  );
}

export function sortCandidatesByPriority(
  candidates: BugCandidate[],
  priorityOrder: string[] = [],
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
