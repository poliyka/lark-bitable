import { describe, expect, it } from "vitest";

import {
  loadConfigDraft,
  saveConfigDraft,
} from "../../src/dashboard/config-service.js";
import { ConfigStore } from "../../src/config/store.js";
import {
  configDraftFixture,
  createDashboardTestPaths,
} from "../fixtures/dashboard.js";
import { fixtureSource } from "../fixtures/lark.js";

describe("dashboard config service", () => {
  it("loads a redacted draft from the config store", async () => {
    const paths = await createDashboardTestPaths("dashboard-config-");
    const store = new ConfigStore({ cwd: paths.configCwd });
    store.setSource(fixtureSource);
    store.setLarkApp({
      appId: "cli-app",
      appSecret: "stored-secret",
      callbackPort: 14543,
      domain: "larksuite.com",
      redirectUri: "http://127.0.0.1:14543/callback",
      scopes: ["bitable:app:readonly"],
      updatedAt: "2026-05-14T00:00:00.000Z",
    });

    const draft = await loadConfigDraft({ configStore: store });

    expect(draft.draft.larkAppSecretState).toBe("stored-redacted");
    expect(JSON.stringify(draft)).not.toContain("stored-secret");
  });

  it("saves source, workflow, mappings, and preserves stored app secret", async () => {
    const paths = await createDashboardTestPaths("dashboard-config-");
    const store = new ConfigStore({ cwd: paths.configCwd });
    store.setLarkApp({
      appId: "cli-app",
      appSecret: "stored-secret",
      callbackPort: 14543,
      domain: "larksuite.com",
      scopes: ["bitable:app:readonly"],
      updatedAt: "2026-05-14T00:00:00.000Z",
    });

    const saved = await saveConfigDraft({
      configStore: store,
      draft: {
        ...configDraftFixture,
        larkAppId: "cli-app",
        larkAppSecret: undefined,
      },
    });

    expect(store.getSource()?.tableId).toBe(fixtureSource.tableId);
    expect(store.getLarkApp()?.appSecret).toBe("stored-secret");
    expect(saved.readiness.workflow).toBe("dashboard");
    expect(JSON.stringify(saved)).not.toContain("stored-secret");
  });

  it("returns validation issues for invalid source URLs", async () => {
    const paths = await createDashboardTestPaths("dashboard-config-");
    await expect(
      saveConfigDraft({
        configStore: new ConfigStore({ cwd: paths.configCwd }),
        draft: { ...configDraftFixture, sourceUrl: "not-a-url" },
      }),
    ).rejects.toThrow("Invalid Lark Bitable URL");
  });
});
