import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it, vi } from "vitest";

import SchemaCommand from "../../src/cli/commands/schema.js";
import { AuthStore } from "../../src/config/auth-store.js";
import { ConfigStore } from "../../src/config/store.js";
import { readyAuthSession } from "../fixtures/auth.js";
import { readAuditEntries } from "../fixtures/audit.js";
import { fixtureRecords, fixtureSource } from "../fixtures/lark.js";

describe("schema command", () => {
  it("prints only numbered headers in human mode", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "schema-human-"));
    const authPath = join(cwd, "auth.json");
    const auditPath = join(cwd, "logs", "audit.json");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    new ConfigStore({ cwd }).setSource({
      ...fixtureSource,
      fieldAliases: {
        ...fixtureSource.fieldAliases,
        owner: "負責人",
      },
    });

    const records = [
      {
        ...fixtureRecords[0],
        fields: {
          ...fixtureRecords[0].fields,
          負責人: [{ name: "openclaw" }],
        },
      },
    ];

    const stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    let rendered = "";

    try {
      await SchemaCommand.run([
        "--config-cwd",
        cwd,
        "--auth-path",
        authPath,
        "--audit-path",
        auditPath,
        "--fixture",
        JSON.stringify(records),
      ]);
      rendered = stdoutSpy.mock.calls.map(([chunk]) => String(chunk)).join("");
    } finally {
      stdoutSpy.mockRestore();
    }

    expect(rendered).toContain("headers:");
    expect(rendered).toContain("1. 標題");
    expect(rendered).toContain("2. 狀態");
    expect(rendered).not.toContain("observedValues");
    expect(rendered).not.toContain('"mappings"');

    const entries = await readAuditEntries(auditPath);
    expect(entries).toEqual([
      expect.objectContaining({
        command: "schema",
        status: "ok",
      }),
    ]);
  });

  it("returns field metadata summary and configured mappings", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "schema-"));
    const authPath = join(cwd, "auth.json");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    new ConfigStore({ cwd }).setSource({
      ...fixtureSource,
      fieldAliases: {
        ...fixtureSource.fieldAliases,
        owner: "負責人",
      },
    });

    const records = [
      {
        ...fixtureRecords[0],
        fields: {
          ...fixtureRecords[0].fields,
          負責人: [{ name: "openclaw" }],
        },
      },
    ];

    const result = await SchemaCommand.run([
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture",
      JSON.stringify(records),
      "--sample-limit",
      "5",
      "--json",
    ]);

    expect(result.data?.mappings).toMatchObject({
      statusField: "狀態",
      priorityField: "優先級",
      titleField: "標題",
      ownerField: "負責人",
    });
    expect(result.data?.sample).toMatchObject({
      limit: 5,
      sampledRecords: 1,
    });
    expect(JSON.stringify(result.data?.fields)).toContain("標題");
    expect(JSON.stringify(result.data?.fields)).toContain("負責人");
  });
});
