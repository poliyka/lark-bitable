import { describe, expect, it } from "vitest";

import {
  applyOwnerFilter,
  applyQueryLimit,
  extractVisibleOwnerValues,
  parsePositiveLimit,
  resolveOwnerCriteria,
} from "../../src/mode/owner-filter.js";
import { fixtureRecords, fixtureSource } from "../fixtures/lark.js";

describe("owner filtering", () => {
  it("extracts visible labels from common Bitable owner shapes", () => {
    expect(
      extractVisibleOwnerValues([
        "openclaw",
        { name: "Alice" },
        { display_name: "Bob" },
        { options: [{ value: "QA" }] },
        { users: [{ email: "dev@example.com" }] },
        "",
      ]),
    ).toEqual(["openclaw", "Alice", "Bob", "QA", "dev@example.com"]);
  });

  it("falls back to stable internal ids when no visible owner label exists", () => {
    expect(
      extractVisibleOwnerValues([
        { open_id: "ou_123" },
        { userId: "user_456" },
        { members: [{ union_id: "on_789" }] },
        { id: "ignored_when_name_exists", name: "Visible owner" },
      ]),
    ).toEqual(["ou_123", "user_456", "on_789", "Visible owner"]);
  });

  it("does not block when owner value is requested without an owner field", () => {
    const criteria = resolveOwnerCriteria({
      commandOwner: "openclaw",
      mode: "Developer",
      source: fixtureSource,
    });
    const result = applyOwnerFilter(fixtureRecords, criteria);

    expect(result.criteria).toMatchObject({
      applied: false,
      notAppliedReason: "missing-owner-field",
      value: "openclaw",
    });
    expect(result.records).toHaveLength(fixtureRecords.length);
  });

  it("applies exact visible-label matching when owner field is configured", () => {
    const source = {
      ...fixtureSource,
      fieldAliases: { ...fixtureSource.fieldAliases, owner: "負責人" },
    };
    const records = [
      {
        ...fixtureRecords[0],
        fields: { ...fixtureRecords[0].fields, 負責人: [{ name: "openclaw" }] },
      },
      {
        ...fixtureRecords[1],
        fields: { ...fixtureRecords[1].fields, 負責人: [{ name: "other" }] },
      },
    ];

    const result = applyOwnerFilter(
      records,
      resolveOwnerCriteria({
        commandOwner: "openclaw",
        mode: "Developer",
        source,
      }),
    );

    expect(result.records.map((record) => record.recordId)).toEqual([
      "recLogin",
    ]);
    expect(result.criteria.matchedRecords).toBe(1);
  });
});

describe("query limit", () => {
  it("parses command and default limits", () => {
    expect(parsePositiveLimit({ defaultLimit: 20 })).toEqual({
      limit: 20,
      source: "default",
    });
    expect(parsePositiveLimit({ defaultLimit: 20, flagLimit: 2 })).toEqual({
      limit: 2,
      source: "command",
    });
  });

  it("rejects invalid limits", () => {
    for (const flagLimit of [0, -1, 1.5]) {
      expect(() => parsePositiveLimit({ flagLimit })).toThrow(
        "Limit must be a positive integer.",
      );
    }
  });

  it("limits after criteria and reports hasMore", () => {
    const result = applyQueryLimit(["a", "b", "c"], {
      appliedAfter: ["owner", "search"],
      limit: 2,
      source: "command",
    });

    expect(result.items).toEqual(["a", "b"]);
    expect(result.queryLimit).toMatchObject({
      appliedAfter: ["owner", "search"],
      hasMore: true,
      returned: 2,
    });
  });
});
