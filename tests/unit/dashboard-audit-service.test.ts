import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { describe, expect, it } from "vitest";

import { buildAuditEntry } from "../../src/audit/log.js";
import {
  getDashboardAuditEntry,
  listDashboardAuditEntries,
} from "../../src/dashboard/audit-service.js";
import { createDashboardTestPaths } from "../fixtures/dashboard.js";

describe("dashboard audit service", () => {
  it("returns redacted summaries and detail views", async () => {
    const paths = await createDashboardTestPaths("dashboard-audit-");
    await mkdir(dirname(paths.auditPath), { recursive: true });
    const entry = buildAuditEntry({
      argv: ["configure", "--lark-app-secret", "secret-value"],
      output: {
        command: "configure",
        data: { nested: { appSecret: "secret-value" } },
        status: "ok",
      },
    });
    await writeFile(paths.auditPath, `${JSON.stringify(entry)}\n`);

    const list = await listDashboardAuditEntries({
      auditPath: paths.auditPath,
      limit: 10,
    });
    const detail = await getDashboardAuditEntry({
      auditPath: paths.auditPath,
      id: entry.id,
    });

    expect(list.entries[0]?.id).toBe(entry.id);
    expect(detail.entry.id).toBe(entry.id);
    expect(JSON.stringify({ list, detail })).not.toContain("secret-value");
  });
});
