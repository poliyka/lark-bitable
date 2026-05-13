import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  appendAuditEntry,
  buildAuditEntry,
  defaultAuditPath,
  resolveAuditPath,
  sanitizeAuditArgv,
} from "../../src/audit/log.js";
import type { CommandOutput } from "../../src/cli/output.js";
import { readAuditEntries } from "../fixtures/audit.js";

const now = new Date("2026-05-13T07:00:00.000Z");

function output(overrides: Partial<CommandOutput> = {}): CommandOutput {
  return {
    command: "write",
    status: "ok",
    source: {
      appToken: "app-token",
      tableId: "table-id",
      retrievedAt: now.toISOString(),
    },
    evidence: [
      {
        id: "E1",
        type: "command-output",
        reference: "write",
        excerpt: "accessToken=secret should not persist",
        collectedAt: now.toISOString(),
        status: "verified",
      },
    ],
    issues: [
      {
        code: "write-value-rejected",
        message: "Lark 1254000 rejected token=secret",
        remediation: "Retry without accessToken=secret",
      },
    ],
    data: {
      clientToken: "manual-token",
      nested: {
        appSecret: "cli-secret",
        authorization: "Bearer access-secret",
      },
    },
    ...overrides,
  };
}

describe("audit log", () => {
  it("resolves the default path under ~/.lark-bitable/logs/audit.json", () => {
    expect(defaultAuditPath("/Users/tester")).toBe(
      "/Users/tester/.lark-bitable/logs/audit.json",
    );
  });

  it("allows an environment audit path override for tests and automation", () => {
    const previous = process.env.LARK_BITABLE_AUDIT_PATH;
    process.env.LARK_BITABLE_AUDIT_PATH = "/tmp/lark-audit.json";
    try {
      expect(resolveAuditPath("/Users/tester")).toBe("/tmp/lark-audit.json");
    } finally {
      if (previous === undefined) {
        delete process.env.LARK_BITABLE_AUDIT_PATH;
      } else {
        process.env.LARK_BITABLE_AUDIT_PATH = previous;
      }
    }
  });

  it("sanitizes argv secrets without removing non-secret command context", () => {
    const sanitized = sanitizeAuditArgv([
      "lark",
      "--login",
      "--app-secret",
      "cli-secret",
      "--code=auth-code",
      "--mock-access-token",
      "access-secret",
      "--client-token",
      "manual-token",
      "--json",
    ]);

    expect(sanitized).toEqual([
      "lark",
      "--login",
      "--app-secret",
      "[REDACTED]",
      "--code=[REDACTED]",
      "--mock-access-token",
      "[REDACTED]",
      "--client-token",
      "[REDACTED]",
      "--json",
    ]);
  });

  it("appends compact JSON entries with one log per line and redacted snapshots", async () => {
    const dir = await mkdtemp(join(tmpdir(), "audit-log-"));
    const path = join(dir, "logs", "audit.json");

    const entry = buildAuditEntry({
      argv: [
        "write",
        "--client-token",
        "manual-token",
        "--fields-json",
        '{"token":"access-secret"}',
      ],
      output: output(),
      startedAt: new Date("2026-05-13T06:59:59.000Z"),
      finishedAt: now,
    });

    const result = await appendAuditEntry(path, entry, { now });
    expect(result).toMatchObject({ ok: true, prunedEntries: 0 });

    const raw = await readFile(path, "utf8");
    const lines = raw.trimEnd().split("\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain("\n");
    expect(lines[0]).not.toContain("  ");

    const entries = await readAuditEntries(path);
    expect(entries).toEqual([
      expect.objectContaining({
        command: "write",
        status: "ok",
        source: expect.objectContaining({
          appToken: "app-token",
          tableId: "table-id",
        }),
        retentionApplied: {
          retentionDays: 14,
          prunedEntries: 0,
        },
      }),
    ]);
    const serialized = JSON.stringify(entries);
    expect(serialized).not.toContain("manual-token");
    expect(serialized).not.toContain("cli-secret");
    expect(serialized).not.toContain("access-secret");
    expect(serialized).toContain("write-value-rejected");
    expect((await stat(path)).mode & 0o777).toBe(0o600);
    expect((await stat(join(dir, "logs"))).mode & 0o777).toBe(0o700);
  });

  it("rotates the active audit log by day and keeps rotated logs for 14 days", async () => {
    const dir = await mkdtemp(join(tmpdir(), "audit-retention-"));
    const path = join(dir, "logs", "audit.json");
    const previousDayEntry = buildAuditEntry({
      argv: ["list"],
      output: output({ command: "list" }),
      startedAt: new Date("2026-05-12T07:00:00.000Z"),
      finishedAt: new Date("2026-05-12T07:00:00.000Z"),
    });
    const expiredEntry = buildAuditEntry({
      argv: ["get", "recExpired"],
      output: output({ command: "get" }),
      startedAt: new Date("2026-04-29T07:00:00.000Z"),
      finishedAt: new Date("2026-04-29T07:00:00.000Z"),
    });
    const retainedEntry = buildAuditEntry({
      argv: ["schema"],
      output: output({ command: "schema" }),
      startedAt: new Date("2026-04-30T07:00:00.000Z"),
      finishedAt: new Date("2026-04-30T07:00:00.000Z"),
    });

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(previousDayEntry)}\n`, "utf8");
    await writeFile(
      join(dirname(path), "audit-2026-04-29.json"),
      `${JSON.stringify(expiredEntry)}\n`,
      "utf8",
    );
    await writeFile(
      join(dirname(path), "audit-2026-04-30.json"),
      `${JSON.stringify(retainedEntry)}\n`,
      "utf8",
    );

    const result = await appendAuditEntry(
      path,
      buildAuditEntry({
        argv: ["help"],
        output: output({ command: "help" }),
        startedAt: now,
        finishedAt: now,
      }),
      { now },
    );

    const activeEntries = await readAuditEntries(path);
    const rotatedEntries = await readAuditEntries(
      join(dirname(path), "audit-2026-05-12.json"),
    );
    const files = await readdir(dirname(path));

    expect(result).toMatchObject({ ok: true, prunedEntries: 1 });
    expect(activeEntries).toEqual([
      expect.objectContaining({
        command: "help",
        retentionApplied: {
          retentionDays: 14,
          prunedEntries: 1,
        },
      }),
    ]);
    expect(rotatedEntries).toEqual([
      expect.objectContaining({ command: "list" }),
    ]);
    expect(files).toContain("audit-2026-04-30.json");
    expect(files).toContain("audit-2026-05-12.json");
    expect(files).not.toContain("audit-2026-04-29.json");
  });

  it("does not overwrite an invalid existing audit file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "audit-invalid-"));
    const path = join(dir, "audit.json");
    await writeFile(path, "not json", "utf8");

    const result = await appendAuditEntry(
      path,
      buildAuditEntry({
        argv: ["help"],
        output: output({ command: "help" }),
        startedAt: now,
        finishedAt: now,
      }),
      { now },
    );

    expect(result).toMatchObject({ ok: false });
    expect(await readFile(path, "utf8")).toBe("not json");
  });

  it("migrates a valid wrapped audit JSON file to one-line entries before appending", async () => {
    const dir = await mkdtemp(join(tmpdir(), "audit-legacy-"));
    const path = join(dir, "audit.json");
    const legacyEntry = buildAuditEntry({
      argv: ["list"],
      output: output({ command: "list" }),
      startedAt: now,
      finishedAt: now,
    });

    await writeFile(
      path,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          retentionDays: 14,
          entries: [legacyEntry],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await appendAuditEntry(
      path,
      buildAuditEntry({
        argv: ["help"],
        output: output({ command: "help" }),
        startedAt: now,
        finishedAt: now,
      }),
      { now },
    );

    const raw = await readFile(path, "utf8");
    const entries = await readAuditEntries(path);
    expect(result).toMatchObject({ ok: true, prunedEntries: 0 });
    expect(raw.trimEnd().split("\n")).toHaveLength(2);
    expect(raw).not.toContain('"entries"');
    expect(entries).toEqual([
      expect.objectContaining({ command: "list" }),
      expect.objectContaining({ command: "help" }),
    ]);
  });

  it("splits mixed-day active audit entries into rotated daily logs", async () => {
    const dir = await mkdtemp(join(tmpdir(), "audit-mixed-days-"));
    const path = join(dir, "logs", "audit.json");
    const previousDayEntry = buildAuditEntry({
      argv: ["list"],
      output: output({ command: "list" }),
      startedAt: new Date("2026-05-12T07:00:00.000Z"),
      finishedAt: new Date("2026-05-12T07:00:00.000Z"),
    });
    const currentDayEntry = buildAuditEntry({
      argv: ["schema"],
      output: output({ command: "schema" }),
      startedAt: now,
      finishedAt: now,
    });

    await mkdir(dirname(path), { recursive: true });
    await writeFile(
      path,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          retentionDays: 14,
          entries: [previousDayEntry, currentDayEntry],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await appendAuditEntry(
      path,
      buildAuditEntry({
        argv: ["help"],
        output: output({ command: "help" }),
        startedAt: now,
        finishedAt: now,
      }),
      { now },
    );

    const activeEntries = await readAuditEntries(path);
    const rotatedEntries = await readAuditEntries(
      join(dirname(path), "audit-2026-05-12.json"),
    );
    expect(result).toMatchObject({ ok: true, prunedEntries: 0 });
    expect(activeEntries).toEqual([
      expect.objectContaining({ command: "schema" }),
      expect.objectContaining({ command: "help" }),
    ]);
    expect(rotatedEntries).toEqual([
      expect.objectContaining({ command: "list" }),
    ]);
  });

  it("returns a non-blocking failure when the audit lock cannot be acquired", async () => {
    const dir = await mkdtemp(join(tmpdir(), "audit-lock-"));
    const path = join(dir, "logs", "audit.json");
    await mkdir(`${path}.lock`, { recursive: true });

    const result = await appendAuditEntry(
      path,
      buildAuditEntry({
        argv: ["help"],
        output: output({ command: "help" }),
        startedAt: now,
        finishedAt: now,
      }),
      { lockTimeoutMs: 1, now },
    );

    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(result.error.message).toContain("Timed out waiting");
    }
  });
});
