import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildAuditEntry } from "../../src/audit/log.js";
import { getAuditEntry, queryAuditEntries } from "../../src/audit/query.js";
import { createDashboardTestPaths } from "../fixtures/dashboard.js";

describe("audit query", () => {
  it("reads active and rotated logs, filters, paginates, and reports malformed lines", async () => {
    const paths = await createDashboardTestPaths("audit-query-");
    await mkdir(dirname(paths.auditPath), { recursive: true });
    const activeEntry = buildAuditEntry({
      argv: ["valid", "--json"],
      finishedAt: new Date("2026-05-14T01:00:01.000Z"),
      output: { command: "valid", status: "ok" },
      startedAt: new Date("2026-05-14T01:00:00.000Z"),
    });
    const rotatedEntry = buildAuditEntry({
      argv: ["research", "--out", "report.json"],
      finishedAt: new Date("2026-05-13T01:00:01.000Z"),
      output: {
        command: "research",
        data: { appSecret: "secret-value" },
        status: "partial",
      },
      startedAt: new Date("2026-05-13T01:00:00.000Z"),
    });
    await writeFile(
      paths.auditPath,
      `${JSON.stringify(activeEntry)}\nnot-json\n`,
    );
    await writeFile(
      join(dirname(paths.auditPath), "audit-2026-05-13.json"),
      `${JSON.stringify(rotatedEntry)}\n`,
    );

    const result = await queryAuditEntries({
      auditPath: paths.auditPath,
      command: "research",
      limit: 1,
    });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.command).toBe("research");
    expect(result.skippedFiles[0]?.reason).toContain("invalid");
    expect(JSON.stringify(result)).not.toContain("secret-value");
  });

  it("loads a sanitized detail entry by id", async () => {
    const paths = await createDashboardTestPaths("audit-query-");
    await mkdir(dirname(paths.auditPath), { recursive: true });
    const entry = buildAuditEntry({
      argv: ["lark", "--code", "oauth-code"],
      output: {
        command: "lark",
        data: { accessToken: "secret-token" },
        status: "ok",
      },
    });
    await writeFile(paths.auditPath, `${JSON.stringify(entry)}\n`);

    const detail = await getAuditEntry({
      auditPath: paths.auditPath,
      id: entry.id,
    });

    expect(detail?.entry.id).toBe(entry.id);
    expect(JSON.stringify(detail)).not.toContain("oauth-code");
    expect(JSON.stringify(detail)).not.toContain("secret-token");
  });

  it("derives missing duration from started and finished timestamps", async () => {
    const paths = await createDashboardTestPaths("audit-query-");
    await mkdir(dirname(paths.auditPath), { recursive: true });
    const entry = buildAuditEntry({
      argv: ["valid", "--json"],
      finishedAt: new Date("2026-05-14T01:00:01.250Z"),
      output: { command: "valid", status: "ok" },
      startedAt: new Date("2026-05-14T01:00:00.000Z"),
    }) as Record<string, unknown>;
    delete entry.durationMs;
    await writeFile(paths.auditPath, `${JSON.stringify(entry)}\n`);

    const list = await queryAuditEntries({
      auditPath: paths.auditPath,
      limit: 10,
    });
    const detail = await getAuditEntry({
      auditPath: paths.auditPath,
      id: String(entry.id),
    });

    expect(list.skippedFiles).toEqual([]);
    expect(list.entries[0]?.durationMs).toBe(1250);
    expect(detail?.entry.durationMs).toBe(1250);
  });

  it("filters by issue code and finished-at boundary after redaction", async () => {
    const paths = await createDashboardTestPaths("audit-query-");
    await mkdir(dirname(paths.auditPath), { recursive: true });
    const before = buildAuditEntry({
      argv: ["valid", "--json"],
      finishedAt: new Date("2026-05-14T00:59:59.000Z"),
      output: {
        command: "valid",
        issues: [{ code: "missing-source", message: "before" }],
        status: "partial",
      },
      startedAt: new Date("2026-05-14T00:59:58.000Z"),
    });
    const after = buildAuditEntry({
      argv: ["valid", "--json"],
      finishedAt: new Date("2026-05-14T01:00:01.000Z"),
      output: {
        command: "valid",
        issues: [{ code: "missing-auth", message: "after" }],
        status: "partial",
      },
      startedAt: new Date("2026-05-14T01:00:00.000Z"),
    });
    await writeFile(
      paths.auditPath,
      `${JSON.stringify(before)}\n${JSON.stringify(after)}\n`,
    );

    const result = await queryAuditEntries({
      auditPath: paths.auditPath,
      from: "2026-05-14T01:00:00.000Z",
      issueCode: "missing-auth",
    });

    expect(result.entries.map((entry) => entry.id)).toEqual([after.id]);
    expect(result.entries[0]?.issues[0]?.code).toBe("missing-auth");
  });
});
