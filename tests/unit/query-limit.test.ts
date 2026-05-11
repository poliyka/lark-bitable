import { describe, expect, it } from "vitest";

import {
  applyQueryLimit,
  parsePositiveLimit,
} from "../../src/mode/owner-filter.js";

describe("query limit", () => {
  it("accepts explicit command limits and records command source", () => {
    expect(parsePositiveLimit({ flagLimit: 5 })).toEqual({
      limit: 5,
      source: "command",
    });
  });

  it("uses the default limit when no command limit is provided", () => {
    expect(parsePositiveLimit({ defaultLimit: 20 })).toEqual({
      limit: 20,
      source: "default",
    });
  });

  it("rejects missing, zero, negative, and non-integer limits", () => {
    for (const input of [
      {},
      { flagLimit: 0 },
      { flagLimit: -1 },
      { flagLimit: 1.5 },
    ]) {
      expect(() => parsePositiveLimit(input)).toThrow(
        "Limit must be a positive integer.",
      );
    }
  });

  it("limits after earlier criteria and reports hasMore", () => {
    const result = applyQueryLimit(["rec1", "rec2", "rec3"], {
      appliedAfter: ["owner", "search"],
      limit: 2,
      source: "command",
    });

    expect(result.items).toEqual(["rec1", "rec2"]);
    expect(result.queryLimit).toEqual({
      appliedAfter: ["owner", "search"],
      hasMore: true,
      limit: 2,
      returned: 2,
      source: "command",
    });
  });

  it("reports hasMore false when the limit does not truncate results", () => {
    const result = applyQueryLimit(["rec1", "rec2"], {
      appliedAfter: ["owner"],
      limit: 5,
      source: "default",
    });

    expect(result.items).toEqual(["rec1", "rec2"]);
    expect(result.queryLimit).toMatchObject({
      hasMore: false,
      returned: 2,
    });
  });
});
