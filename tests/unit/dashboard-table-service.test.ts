import { describe, expect, it } from "vitest";

import {
  getDashboardRecords,
  getDashboardSchema,
} from "../../src/dashboard/table-service.js";
import { AuthStore } from "../../src/config/auth-store.js";
import { ConfigStore } from "../../src/config/store.js";
import { readyAuthSession } from "../fixtures/auth.js";
import { createDashboardTestPaths } from "../fixtures/dashboard.js";
import { fixtureRecords, fixtureSource } from "../fixtures/lark.js";

describe("dashboard table service", () => {
  it("reports blocked state when source or auth is missing", async () => {
    const paths = await createDashboardTestPaths("dashboard-table-");
    const schema = await getDashboardSchema({
      authPath: paths.authPath,
      configStore: new ConfigStore({ cwd: paths.configCwd }),
    });

    expect(schema.status).toBe("blocked");
    expect(schema.issues.map((issue) => issue.code)).toContain(
      "missing-source",
    );
  });

  it("projects schema mappings and fixture records when setup is ready", async () => {
    const paths = await createDashboardTestPaths("dashboard-table-");
    const authStore = new AuthStore(paths.authPath);
    const configStore = new ConfigStore({ cwd: paths.configCwd });
    await authStore.write({ ...readyAuthSession, storagePath: paths.authPath });
    configStore.setSource(fixtureSource);

    const schema = await getDashboardSchema({
      authPath: paths.authPath,
      configStore,
      fixtureRecords,
    });
    const records = await getDashboardRecords({
      authPath: paths.authPath,
      configStore,
      fixtureRecords,
    });

    expect(schema.status).toBe("ready");
    expect(schema.mappings.statusField).toBe("狀態");
    expect(records.records[0]?.recordId).toBe("recLogin");
  });
});
