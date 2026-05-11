import { describe, expect, it } from "vitest";

import {
  formatHuman,
  formatJson,
  normalizeOutput,
} from "../../src/cli/output.js";

describe("command output formatting", () => {
  it("normalizes mode, owner criteria, and query limit metadata", () => {
    const output = normalizeOutput({
      command: "list",
      status: "ok",
      mode: {
        active: "Developer",
        source: "explicit",
      },
      ownerCriteria: {
        applied: false,
        field: null,
        matchedRecords: 2,
        mode: "Developer",
        notAppliedReason: "missing-owner-field",
        source: "command",
        totalRecordsBeforeFilter: 2,
        value: "openclaw",
      },
      queryLimit: {
        appliedAfter: ["owner"],
        hasMore: true,
        limit: 1,
        returned: 1,
        source: "command",
      },
    });

    expect(output.mode).toEqual({
      active: "Developer",
      source: "explicit",
    });
    expect(output.ownerCriteria).toMatchObject({
      applied: false,
      notAppliedReason: "missing-owner-field",
      value: "openclaw",
    });
    expect(output.queryLimit).toMatchObject({
      hasMore: true,
      limit: 1,
      returned: 1,
    });
  });

  it("renders human mode metadata and redacts raw secrets in JSON output", () => {
    const output = {
      command: "verify",
      status: "partial" as const,
      auth: {
        status: "ready" as const,
        storagePath: "~/.lark-bitable/auth.json",
      },
      mode: {
        active: "QA" as const,
        source: "explicit" as const,
      },
      ownerCriteria: {
        applied: true,
        field: "負責人",
        matchedRecords: 1,
        mode: "QA" as const,
        source: "command" as const,
        totalRecordsBeforeFilter: 2,
        value: "openclaw",
      },
      queryLimit: {
        appliedAfter: ["owner", "record-validation"],
        hasMore: false,
        limit: 10,
        returned: 1,
        source: "command" as const,
      },
      data: {
        token: "accessToken=abc123",
      },
    };

    const human = formatHuman(output);
    const json = formatJson(output);

    expect(human).toContain("mode: QA (explicit)");
    expect(human).toContain("owner: openclaw applied=true");
    expect(human).toContain("limit: 10 returned=1 hasMore=false");
    expect(json).not.toContain("abc123");
  });
});
