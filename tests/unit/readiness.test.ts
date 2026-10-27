import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it, vi } from "vitest";

import { AuthStore } from "../../src/config/auth-store.js";
import { checkReadiness } from "../../src/config/readiness.js";
import { ConfigStore } from "../../src/config/store.js";
import * as larkAuth from "../../src/lark/auth.js";
import { expiredAuthSession, readyAuthSession } from "../fixtures/auth.js";
import { fixtureSource } from "../fixtures/lark.js";
import { selectedBugFixture } from "../fixtures/research.js";

describe("checkReadiness", () => {
  it("keeps dashboard refresh failures partial without blocking local features", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "readiness-"));
    const authPath = join(cwd, "auth.json");
    const authStore = new AuthStore(authPath);
    const configStore = new ConfigStore({ cwd });
    await authStore.write({ ...expiredAuthSession, storagePath: authPath });
    configStore.setSource(fixtureSource);
    configStore.setLarkApp({
      appId: "cli-app",
      appSecret: "cli-secret",
      callbackPort: 14543,
      domain: "larksuite.com",
      updatedAt: "2026-10-27T00:00:00.000Z",
    });
    const refresh = vi
      .spyOn(larkAuth, "ensureReadyAuthSession")
      .mockRejectedValue(new Error("refresh denied"));
    try {
      const result = await checkReadiness("dashboard", {
        authStore,
        configStore,
      });
      expect(result.status).toBe("partial");
      expect(result.blockingIssues).toEqual([]);
      expect(result.partialIssues).toEqual([
        {
          code: "auth-refresh-failed",
          message:
            "Lark auth refresh failed: refresh denied Lark-backed dashboard pages are blocked until login completes.",
          remediation:
            "Retry the command; if it still fails, run lark-bitable lark --login",
        },
      ]);
    } finally {
      refresh.mockRestore();
    }
  });
  it("orders missing bootstrap, auth, and source remediation", async () => {
    const result = await checkReadiness("global", {
      bootstrapInstalled: false,
    });

    expect(result.status).toBe("blocked");
    expect(result.blockingIssues.map((issue) => issue.code)).toEqual([
      "missing-bootstrap",
      "missing-auth",
      "missing-source",
    ]);
  });

  it("does not require configured field mappings for triage readiness", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "readiness-"));
    const authPath = join(cwd, "auth.json");
    const authStore = new AuthStore(authPath);
    const configStore = new ConfigStore({ cwd });
    await authStore.write({ ...readyAuthSession, storagePath: authPath });
    configStore.setSource(fixtureSource);

    const result = await checkReadiness("triage", {
      authStore,
      bootstrapInstalled: true,
      configStore,
    });

    expect(result.status).toBe("ready");
    expect(result.blockingIssues.map((issue) => issue.code)).not.toContain(
      "missing-field-mapping",
    );
  });

  it("marks live access uncertainty as partial when required setup is ready", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "readiness-"));
    const authPath = join(cwd, "auth.json");
    const authStore = new AuthStore(authPath);
    const configStore = new ConfigStore({ cwd });
    await authStore.write({ ...readyAuthSession, storagePath: authPath });
    configStore.setSource(fixtureSource);

    const result = await checkReadiness("inspect", {
      authStore,
      bootstrapInstalled: true,
      configStore,
      liveAccessStatus: "partial",
    });

    expect(result.status).toBe("partial");
    expect(result.partialIssues[0]?.code).toBe("live-access-inconclusive");
    expect(result.partialIssues[0]?.remediation).toContain(
      "bitable:app:readonly",
    );
    expect(result.partialIssues[0]?.remediation).toContain(
      "publish the app version",
    );
  });

  it("requires a selected bug for research readiness", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "readiness-"));
    const authPath = join(cwd, "auth.json");
    const authStore = new AuthStore(authPath);
    const configStore = new ConfigStore({ cwd });
    await authStore.write({ ...readyAuthSession, storagePath: authPath });
    configStore.setSource(fixtureSource);

    expect(
      (await checkReadiness("research", { authStore, configStore })).status,
    ).toBe("blocked");

    configStore.setSelection(selectedBugFixture);
    expect(
      (
        await checkReadiness("research", {
          authStore,
          bootstrapInstalled: true,
          configStore,
        })
      ).status,
    ).toBe("ready");
  });

  it("refreshes expired auth before reporting readiness when app credentials are stored", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "readiness-"));
    const authPath = join(cwd, "auth.json");
    const authStore = new AuthStore(authPath);
    const configStore = new ConfigStore({ cwd });
    await authStore.write({ ...expiredAuthSession, storagePath: authPath });
    configStore.setSource(fixtureSource);
    configStore.setLarkApp({
      appId: "cli-app",
      appSecret: "cli-secret",
      callbackPort: 14543,
      domain: "larksuite.com",
      updatedAt: "2026-05-11T08:00:00.000Z",
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          code: 0,
          data: {
            access_token: "refreshed-access",
            expires_in: 3600,
            refresh_token: "refreshed-refresh",
          },
        }),
      )) as typeof fetch;
    try {
      const result = await checkReadiness("inspect", {
        authStore,
        bootstrapInstalled: true,
        configStore,
      });

      expect(result.status).toBe("ready");
      expect((await authStore.read())?.accessToken).toBe("refreshed-access");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
