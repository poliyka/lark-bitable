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

  it("renders record arrays as a readable table in human output", () => {
    const human = formatHuman({
      command: "list",
      status: "ok",
      data: {
        records: [
          {
            recordId: "recLogin",
            fields: {
              標題: "Login error",
              狀態: "待處理",
              優先級: "P0",
            },
            source: {
              appToken: "app",
              tableId: "tbl",
              retrievedAt: "2026-05-20T00:00:00.000Z",
            },
            matchedFields: ["標題"],
          },
        ],
      },
    });

    expect(human).toContain("data.records:");
    expect(human).toContain("┌");
    expect(human).toContain("recordId");
    expect(human).toContain("recLogin");
    expect(human).toContain("Login error");
    expect(human).not.toContain('data: {"records"');
  });

  it("renders per-record hidden field counts for sparse record tables", () => {
    const human = formatHuman({
      command: "list",
      status: "ok",
      data: {
        records: [
          {
            recordId: "recSparse",
            fields: {
              A: "one",
            },
          },
          {
            recordId: "recWide",
            fields: {
              A: "one",
              B: "two",
              C: "three",
              D: "four",
              E: "five",
            },
          },
        ],
      },
    });

    const sparseLine = human
      .split("\n")
      .find((line) => line.includes("recSparse"));
    const wideLine = human.split("\n").find((line) => line.includes("recWide"));

    expect(human).toContain("moreFields");
    expect(sparseLine).toContain("0");
    expect(wideLine).toContain("1");
  });

  it("preserves matched field names in record tables for search output", () => {
    const human = formatHuman({
      command: "search",
      status: "ok",
      data: {
        records: [
          {
            recordId: "recLogin",
            fields: {
              標題: "Login error",
              描述: "Cannot sign in",
            },
            matchedFields: ["標題", "描述"],
          },
        ],
      },
    });

    expect(human).toContain("matchedFields");
    expect(human).toContain("標題, 描述");
  });

  it("renders schema fields as a readable table in human output", () => {
    const human = formatHuman({
      command: "schema",
      status: "ok",
      data: {
        fields: [
          {
            fieldName: "狀態",
            type: 3,
            uiType: "SingleSelect",
            options: [{ name: "待處理" }, { name: "完成" }],
            nonEmptyInSample: 2,
            observedValues: ["待處理", "完成"],
          },
        ],
      },
    });

    expect(human).toContain("data.fields:");
    expect(human).toContain("fieldName");
    expect(human).toContain("SingleSelect");
    expect(human).toContain("待處理, 完成");
  });

  it("summarizes long report strings instead of dumping markdown into human output", () => {
    const human = formatHuman({
      command: "research",
      status: "ok",
      data: {
        report: "# Report\n\n".repeat(80),
        reportFile: {
          canonicalPath: "/tmp/canonical-research.json",
          markdown: "# Nested Report\n\n".repeat(80),
        },
        reportPath: "/tmp/current-research.json",
      },
    });

    expect(human).toContain("data:");
    expect(human).toContain("reportPath: /tmp/current-research.json");
    expect(human).toContain("markdown: (omitted");
    expect(human).toContain("report: (omitted");
    expect(human.length).toBeLessThan(1000);
  });
});
