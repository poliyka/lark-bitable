import { describe, expect, it } from "vitest";

import { CliError, missingPrerequisite } from "../../src/cli/errors.js";
import {
  formatHuman,
  formatJson,
  normalizeOutput,
} from "../../src/cli/output.js";
import {
  authSessionSchema,
  bitableRecordSchema,
  bitableSourceSchema,
  validationResultSchema,
} from "../../src/config/schema.js";
import { redactSecrets, toEvidence } from "../../src/reporting/evidence.js";
import { parseBitableUrl } from "../../src/lark/url-parser.js";
import {
  filterRecords,
  mapRecord,
  searchRecords,
} from "../../src/lark/record-mapper.js";

describe("foundation schemas", () => {
  it("applies defaults and validates source configuration", () => {
    const parsed = bitableSourceSchema.parse({
      sourceUrl:
        "https://u5ijellsw5.sg.larksuite.com/base/TypDbjKBfaJcaSsoEI1lZjHsgIY?table=tblp8ig36Itp0yOU&view=vewb6FrjBe",
      appToken: "TypDbjKBfaJcaSsoEI1lZjHsgIY",
      tableId: "tblp8ig36Itp0yOU",
    });

    expect(parsed.actionableStatus).toBe("待處理");
    expect(parsed.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("rejects incomplete auth sessions and accepts redacted-ready metadata", () => {
    expect(() =>
      authSessionSchema.parse({
        storagePath: "~/.lark-bitable-cli/auth.json",
        status: "ready",
        accessToken: "",
      }),
    ).toThrow();

    expect(
      authSessionSchema.parse({
        storagePath: "~/.lark-bitable-cli/auth.json",
        domain: "larksuite.com",
        accountLabel: "user@example.com",
        appIdentity: "cli-app",
        scopes: ["bitable:app:readonly"],
        accessToken: "secret-access",
        refreshToken: "secret-refresh",
        expiresAt: "2026-05-07T12:00:00.000Z",
        status: "ready",
        updatedAt: "2026-05-07T11:00:00.000Z",
      }).status,
    ).toBe("ready");
  });

  it("validates records and workflow readiness status", () => {
    const record = bitableRecordSchema.parse({
      recordId: "recA",
      fields: { title: "Login error" },
      source: {
        appToken: "app",
        tableId: "tbl",
        viewId: "view",
        retrievedAt: "2026-05-07T10:00:00.000Z",
      },
    });

    const validation = validationResultSchema.parse({
      workflow: "triage",
      status: "blocked",
      checkedPrerequisites: ["auth", "source", "field-mapping"],
      blockingIssues: [
        {
          code: "missing-auth",
          message: "Lark auth is missing",
          remediation: "Run lark-bitable lark --login",
        },
      ],
      remediationSteps: ["Run lark-bitable lark --login"],
      checkedAt: "2026-05-07T10:00:00.000Z",
    });

    expect(record.recordId).toBe("recA");
    expect(validation.status).toBe("blocked");
  });
});

describe("foundation output and redaction", () => {
  it("normalizes output and keeps JSON field order stable", () => {
    const output = normalizeOutput({
      command: "valid",
      status: "blocked",
      issues: [
        {
          code: "missing-auth",
          message: "Lark auth is missing",
          remediation: "Run lark-bitable lark --login",
        },
      ],
    });

    expect(Object.keys(output)).toEqual([
      "command",
      "status",
      "source",
      "auth",
      "evidence",
      "issues",
      "data",
    ]);
    expect(formatJson(output)).toContain('"status": "blocked"');
    expect(formatHuman(output)).toContain("missing-auth");
  });

  it("redacts raw tokens and creates citable evidence", () => {
    const redacted = redactSecrets(
      "accessToken=abc123 refresh_token=def456 ~/.lark-bitable-cli/auth.json",
    );

    expect(redacted).not.toContain("abc123");
    expect(redacted).not.toContain("def456");
    expect(redacted).toContain("~/.lark-bitable-cli/auth.json");

    expect(
      toEvidence({
        type: "command-output",
        reference: "pnpm test",
        excerpt: "3 passed",
        status: "verified",
      }).id,
    ).toBe("E1");
  });

  it("represents fail-closed CLI errors with remediation", () => {
    const error = missingPrerequisite("auth", "Run lark-bitable lark --login");

    expect(error).toBeInstanceOf(CliError);
    expect(error.code).toBe("missing-auth");
    expect(error.remediation).toBe("Run lark-bitable lark --login");
  });
});

describe("foundation Lark parsing and record mapping", () => {
  it("parses app token, table id, view id, and domain from a Lark Base URL", () => {
    const parsed = parseBitableUrl(
      "https://u5ijellsw5.sg.larksuite.com/base/TypDbjKBfaJcaSsoEI1lZjHsgIY?table=tblp8ig36Itp0yOU&view=vewb6FrjBe",
    );

    expect(parsed).toMatchObject({
      appToken: "TypDbjKBfaJcaSsoEI1lZjHsgIY",
      tableId: "tblp8ig36Itp0yOU",
      viewId: "vewb6FrjBe",
      domain: "u5ijellsw5.sg.larksuite.com",
    });
  });

  it("maps records, filters criteria, and reports matched search fields", () => {
    const source = {
      appToken: "app",
      tableId: "tbl",
      viewId: "view",
      retrievedAt: "2026-05-07T10:00:00.000Z",
    };
    const records = [
      mapRecord({
        record_id: "recA",
        fields: { title: "Login error", status: "待處理", count: 2 },
        source,
      }),
      mapRecord({
        record_id: "recB",
        fields: { title: "Done bug", status: "完成" },
        source,
      }),
    ];

    expect(filterRecords(records, "status", "equals", "待處理")).toHaveLength(
      1,
    );
    expect(searchRecords(records, "login")[0]?.matchedFields).toEqual([
      "title",
    ]);
  });
});
