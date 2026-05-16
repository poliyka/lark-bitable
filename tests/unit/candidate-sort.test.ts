import { describe, expect, it } from "vitest";

import {
  extractBugCandidates,
  filterActionableCandidates,
  sortCandidatesByPriority,
} from "../../src/triage/candidate-sort.js";
import { fixtureRecords, fixtureSource } from "../fixtures/lark.js";

describe("bug candidate sorting", () => {
  it("extracts candidates from configured field aliases and reports missing fields", () => {
    const candidates = extractBugCandidates(fixtureRecords, fixtureSource);

    expect(candidates[0]?.title).toBe("Login error");
    expect(candidates[0]?.status).toBe("待處理");
    expect(candidates[0]?.priority).toBe("P0");
  });

  it("keeps original detail text from common Bitable description fields", () => {
    const candidates = extractBugCandidates(
      [
        {
          ...fixtureRecords[0]!,
          fields: {
            ...fixtureRecords[0]!.fields,
            原始詳細敘述: "使用者送出登入表單後 spinner 一直轉。",
          },
        },
      ],
      fixtureSource,
    );

    expect(candidates[0]?.originalDescription).toBe(
      "使用者送出登入表單後 spinner 一直轉。",
    );
  });

  it("filters by actionable status and sorts known priorities first", () => {
    const candidates = extractBugCandidates(
      [
        ...fixtureRecords,
        {
          ...fixtureRecords[0]!,
          recordId: "recP2",
          fields: {
            ...fixtureRecords[0]!.fields,
            標題: "Low priority",
            優先級: "P2",
          },
        },
      ],
      {
        ...fixtureSource,
        priorityOrder: ["P0", "P1", "P2"],
      },
    );

    const actionable = filterActionableCandidates(candidates, "待處理");
    const sorted = sortCandidatesByPriority(actionable, ["P0", "P1", "P2"]);

    expect(actionable.map((item) => item.record.recordId)).not.toContain(
      "recDone",
    );
    expect(sorted.map((item) => item.record.recordId)).toEqual([
      "recLogin",
      "recP2",
    ]);
  });
});
