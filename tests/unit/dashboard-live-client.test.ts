import { describe, expect, it, vi } from "vitest";

import { deliverCommandLiveEvent } from "../../src/dashboard/live-client.js";
import { writeDashboardRuntimeSession } from "../../src/dashboard/live-runtime.js";
import { createDashboardTestPaths } from "../fixtures/dashboard.js";

const readyBinding = {
  host: "127.0.0.1",
  origin: "http://127.0.0.1:48731",
  port: 48731,
  requestedPort: 48731,
  startedAt: "2026-05-15T00:00:00.000Z",
  status: "ready" as const,
};

const startedEvent = {
  changedSurfaces: ["shell", "overview", "audit"],
  command: "valid",
  commandRunId: "run_01",
  dataSource: "live" as const,
  evidenceCount: 0,
  issues: [],
  phase: "started" as const,
  startedAt: "2026-05-15T00:00:01.000Z",
  status: "ok" as const,
  trigger: "terminal" as const,
};

describe("dashboard live client", () => {
  it("skips delivery when no runtime session exists", async () => {
    const paths = await createDashboardTestPaths("dashboard-live-client-");

    await expect(
      deliverCommandLiveEvent({
        event: startedEvent,
        runtimePath: paths.runtimePath,
      }),
    ).resolves.toMatchObject({
      result: "skipped-no-session",
      silent: true,
    });
  });

  it("skips delivery when the runtime session is stale", async () => {
    const paths = await createDashboardTestPaths("dashboard-live-client-");
    const fetchImpl = vi.fn();
    await writeDashboardRuntimeSession({
      binding: readyBinding,
      deliveryToken: "runtime-token",
      lastHeartbeatAt: "2026-05-15T00:00:00.000Z",
      pid: 4321,
      runtimePath: paths.runtimePath,
      sessionId: "dash_01",
      startedAt: "2026-05-15T00:00:00.000Z",
    });

    await expect(
      deliverCommandLiveEvent({
        event: startedEvent,
        fetchImpl,
        now: new Date("2026-05-15T00:00:20.000Z"),
        runtimePath: paths.runtimePath,
        staleAfterMs: 5_000,
      }),
    ).resolves.toMatchObject({
      result: "skipped-stale-session",
      silent: true,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("treats request timeouts as best-effort failures", async () => {
    const paths = await createDashboardTestPaths("dashboard-live-client-");
    await writeDashboardRuntimeSession({
      binding: readyBinding,
      deliveryToken: "runtime-token",
      pid: 4321,
      runtimePath: paths.runtimePath,
      sessionId: "dash_01",
    });

    await expect(
      deliverCommandLiveEvent({
        event: startedEvent,
        fetchImpl: async () => new Promise<Response>(() => undefined),
        runtimePath: paths.runtimePath,
        timeoutMs: 5,
      }),
    ).resolves.toMatchObject({
      result: "failed",
    });
  });

  it("returns a rejected result when the dashboard ingress refuses the event", async () => {
    const paths = await createDashboardTestPaths("dashboard-live-client-");
    await writeDashboardRuntimeSession({
      binding: readyBinding,
      deliveryToken: "runtime-token",
      pid: 4321,
      runtimePath: paths.runtimePath,
      sessionId: "dash_01",
    });

    await expect(
      deliverCommandLiveEvent({
        event: startedEvent,
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              dataSource: "failed",
              issues: [
                {
                  code: "dashboard-live-event-rejected",
                  message: "Live event was rejected.",
                },
              ],
              status: "error",
            }),
            {
              headers: { "content-type": "application/json" },
              status: 403,
            },
          ),
        runtimePath: paths.runtimePath,
      }),
    ).resolves.toMatchObject({
      result: "rejected",
    });
  });

  it("skips delivery silently when the dashboard origin is unreachable", async () => {
    const paths = await createDashboardTestPaths("dashboard-live-client-");
    await writeDashboardRuntimeSession({
      binding: readyBinding,
      deliveryToken: "runtime-token",
      pid: 4321,
      runtimePath: paths.runtimePath,
      sessionId: "dash_01",
    });

    await expect(
      deliverCommandLiveEvent({
        event: startedEvent,
        fetchImpl: async () => {
          throw new TypeError("fetch failed");
        },
        runtimePath: paths.runtimePath,
      }),
    ).resolves.toMatchObject({
      result: "skipped-unreachable",
      silent: true,
    });
  });

  it("delivers redacted payloads to the running dashboard service", async () => {
    const paths = await createDashboardTestPaths("dashboard-live-client-");
    await writeDashboardRuntimeSession({
      binding: readyBinding,
      deliveryToken: "runtime-token",
      pid: 4321,
      runtimePath: paths.runtimePath,
      sessionId: "dash_01",
    });

    let body = "";
    const result = await deliverCommandLiveEvent({
      event: {
        ...startedEvent,
        issues: [
          {
            code: "bad-token",
            message: "authorization=Bearer super-secret",
            remediation: "replace appSecret=secret-value",
          },
        ],
      },
      fetchImpl: async (_input, init) => {
        body = String(init?.body ?? "");
        return new Response(
          JSON.stringify({
            data: { accepted: true, eventId: "evt_01", sequence: 3 },
            dataSource: "live",
            issues: [],
            status: "ok",
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        );
      },
      runtimePath: paths.runtimePath,
    });

    expect(result.result).toBe("delivered");
    expect(body).not.toContain("super-secret");
    expect(body).not.toContain("secret-value");
    expect(body).toContain('"commandRunId":"run_01"');
  });
});
