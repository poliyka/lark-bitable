import { describe, expect, it } from "vitest";

import {
  createDashboardAuthService,
  projectAuthState,
} from "../../src/dashboard/auth-service.js";
import { AuthStore } from "../../src/config/auth-store.js";
import { ConfigStore } from "../../src/config/store.js";
import { readyAuthSession } from "../fixtures/auth.js";
import { createDashboardTestPaths } from "../fixtures/dashboard.js";

describe("dashboard auth service", () => {
  it("projects safe auth state without exposing tokens", async () => {
    const paths = await createDashboardTestPaths("dashboard-auth-");
    const authStore = new AuthStore(paths.authPath);
    await authStore.write({ ...readyAuthSession, storagePath: paths.authPath });

    const projected = await projectAuthState(authStore);

    expect(projected.status).toBe("ready");
    expect(JSON.stringify(projected)).not.toContain("access-secret");
    expect(JSON.stringify(projected)).not.toContain("refresh-secret");
  });

  it("starts a login flow and exposes only authorization metadata", async () => {
    const paths = await createDashboardTestPaths("dashboard-auth-");
    const configStore = new ConfigStore({ cwd: paths.configCwd });
    configStore.setLarkApp({
      appId: "cli-app",
      appSecret: "stored-secret",
      callbackPort: 14543,
      domain: "larksuite.com",
      redirectUri: "http://127.0.0.1:14543/callback",
      scopes: ["bitable:app:readonly"],
      updatedAt: "2026-05-14T00:00:00.000Z",
    });
    const service = createDashboardAuthService({
      authStore: new AuthStore(paths.authPath),
      configStore,
    });

    const flow = await service.startLogin({
      callbackMode: "manual",
      openBrowser: false,
    });

    expect(flow.authorizationUrl).toContain("client_id=cli-app");
    expect(flow.status).toBe("waiting");
    expect(JSON.stringify(flow)).not.toContain("stored-secret");
    expect((await service.loginStatus(flow.flowId)).status).toBe("waiting");
  });

  it("logs out and reports missing auth state", async () => {
    const paths = await createDashboardTestPaths("dashboard-auth-");
    const authStore = new AuthStore(paths.authPath);
    await authStore.write({ ...readyAuthSession, storagePath: paths.authPath });

    const service = createDashboardAuthService({
      authStore,
      configStore: new ConfigStore({ cwd: paths.configCwd }),
    });

    expect((await service.logout()).auth.status).toBe("missing");
    expect(await authStore.exists()).toBe(false);
  });
});
