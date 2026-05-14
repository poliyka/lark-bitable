import { describe, expect, it } from "vitest";

import { startDashboardServer } from "../../src/dashboard/server.js";
import {
  configDraftFixture,
  createDashboardTestPaths,
  fetchDashboardJson,
} from "../fixtures/dashboard.js";

describe("dashboard HTTP server", () => {
  it("serves the dashboard shell, assets, and status without web login", async () => {
    const paths = await createDashboardTestPaths("dashboard-http-");
    const server = await startDashboardServer({
      auditPath: paths.auditPath,
      authPath: paths.authPath,
      configCwd: paths.configCwd,
      host: "127.0.0.1",
      port: 0,
      researchDir: paths.researchDir,
    });

    try {
      const html = await fetch(new URL("/", server.binding.origin)).then((r) =>
        r.text(),
      );
      const js = await fetch(new URL("/assets/app.js", server.binding.origin));
      const css = await fetch(
        new URL("/assets/styles.css", server.binding.origin),
      );
      const status = await fetchDashboardJson<{
        data: { binding: { port: number }; dashboardLoginRequired: boolean };
        status: string;
      }>(server.binding.origin, "/api/status");

      expect(html).toContain("lark-bitable-dashboard");
      expect(await js.text()).toContain("localStorage");
      expect(css.headers.get("content-type")).toContain("text/css");
      expect(status.status).toBe("ok");
      expect(status.data.binding.port).toBe(server.binding.port);
      expect(status.data.dashboardLoginRequired).toBe(false);
    } finally {
      await server.stop();
    }
  });

  it("saves live configuration and redacts responses", async () => {
    const paths = await createDashboardTestPaths("dashboard-http-");
    const server = await startDashboardServer({
      auditPath: paths.auditPath,
      authPath: paths.authPath,
      configCwd: paths.configCwd,
      host: "127.0.0.1",
      port: 0,
      researchDir: paths.researchDir,
    });

    try {
      const saved = await fetchDashboardJson<{ data: unknown; status: string }>(
        server.binding.origin,
        "/api/config",
        {
          body: JSON.stringify(configDraftFixture),
          method: "POST",
        },
      );

      expect(saved.status).toBe("ok");
      expect(JSON.stringify(saved)).not.toContain("cli-secret-value");
      expect(
        await fetchDashboardJson(server.binding.origin, "/api/config"),
      ).toMatchObject({ status: "ok" });
    } finally {
      await server.stop();
    }
  });

  it("passes requested login scopes from the dashboard login API", async () => {
    const paths = await createDashboardTestPaths("dashboard-http-");
    const server = await startDashboardServer({
      auditPath: paths.auditPath,
      authPath: paths.authPath,
      configCwd: paths.configCwd,
      host: "127.0.0.1",
      port: 0,
      researchDir: paths.researchDir,
    });

    try {
      await fetchDashboardJson(server.binding.origin, "/api/config", {
        body: JSON.stringify(configDraftFixture),
        method: "POST",
      });

      const login = await fetchDashboardJson<{
        data: { authorizationUrl: string; status: string };
        status: string;
      }>(server.binding.origin, "/api/auth/login/start", {
        body: JSON.stringify({
          openBrowser: false,
          scopes: ["bitable:app", "im:message"],
        }),
        method: "POST",
      });

      expect(login.status).toBe("ok");
      expect(login.data.status).toBe("waiting");
      expect(
        new URL(login.data.authorizationUrl).searchParams.get("scope"),
      ).toBe("bitable:app im:message");
    } finally {
      await server.stop();
    }
  });

  it("exposes auth, audit, playground, research, and table routes with safe envelopes", async () => {
    const paths = await createDashboardTestPaths("dashboard-http-");
    const server = await startDashboardServer({
      auditPath: paths.auditPath,
      authPath: paths.authPath,
      configCwd: paths.configCwd,
      host: "127.0.0.1",
      port: 0,
      researchDir: paths.researchDir,
    });

    try {
      await fetchDashboardJson(server.binding.origin, "/api/auth/logout", {
        body: "{}",
        method: "POST",
      });
      await expect(
        fetchDashboardJson(server.binding.origin, "/api/audit"),
      ).resolves.toMatchObject({ status: "ok" });
      await expect(
        fetchDashboardJson(server.binding.origin, "/api/research"),
      ).resolves.toMatchObject({ status: "ok" });
      await expect(
        fetchDashboardJson(server.binding.origin, "/api/table/schema"),
      ).resolves.toMatchObject({ status: "partial" });
      await expect(
        fetchDashboardJson(server.binding.origin, "/api/playground/run", {
          body: JSON.stringify({
            command: "valid",
            parameters: { workflow: "dashboard" },
          }),
          method: "POST",
        }),
      ).resolves.toMatchObject({ status: "partial" });
    } finally {
      await server.stop();
    }
  });
});
