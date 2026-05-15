import { describe, expect, it } from "vitest";

import {
  createDashboardRuntimeSessionManager,
  isDashboardRuntimeSessionStale,
  readDashboardRuntimeSession,
  writeDashboardRuntimeSession,
} from "../../src/dashboard/live-runtime.js";
import { createDashboardTestPaths } from "../fixtures/dashboard.js";

const readyBinding = {
  host: "127.0.0.1",
  origin: "http://127.0.0.1:48731",
  port: 48731,
  requestedPort: 48731,
  startedAt: "2026-05-15T00:00:00.000Z",
  status: "ready" as const,
};

describe("dashboard live runtime session", () => {
  it("writes and reads runtime sessions with delivery tokens", async () => {
    const paths = await createDashboardTestPaths("dashboard-live-runtime-");
    const session = await writeDashboardRuntimeSession({
      binding: readyBinding,
      deliveryToken: "runtime-token",
      pid: 4321,
      runtimePath: paths.runtimePath,
      sessionId: "dash_01",
    });

    await expect(
      readDashboardRuntimeSession(paths.runtimePath),
    ).resolves.toEqual(session);
  });

  it("updates heartbeat timestamps without replacing the session id", async () => {
    const paths = await createDashboardTestPaths("dashboard-live-runtime-");
    const manager = createDashboardRuntimeSessionManager({
      binding: readyBinding,
      deliveryToken: "runtime-token",
      pid: 4321,
      runtimePath: paths.runtimePath,
      sessionId: "dash_01",
    });

    await manager.start(new Date("2026-05-15T00:00:00.000Z"));
    const initial = await readDashboardRuntimeSession(paths.runtimePath);
    await manager.heartbeat(new Date("2026-05-15T00:00:10.000Z"));
    const updated = await readDashboardRuntimeSession(paths.runtimePath);

    expect(updated?.sessionId).toBe("dash_01");
    expect(updated?.lastHeartbeatAt).not.toBe(initial?.lastHeartbeatAt);

    await manager.stop();
  });

  it("detects stale sessions from heartbeat age", async () => {
    const session = await writeDashboardRuntimeSession({
      binding: readyBinding,
      deliveryToken: "runtime-token",
      lastHeartbeatAt: "2026-05-15T00:00:00.000Z",
      pid: 4321,
      runtimePath: (await createDashboardTestPaths("dashboard-live-runtime-"))
        .runtimePath,
      sessionId: "dash_01",
      startedAt: "2026-05-15T00:00:00.000Z",
    });

    expect(
      isDashboardRuntimeSessionStale(session, {
        now: new Date("2026-05-15T00:00:20.000Z"),
        staleAfterMs: 5_000,
      }),
    ).toBe(true);
  });

  it("preserves a replacement session when the older manager stops", async () => {
    const paths = await createDashboardTestPaths("dashboard-live-runtime-");
    const first = createDashboardRuntimeSessionManager({
      binding: readyBinding,
      deliveryToken: "token-1",
      pid: 1111,
      runtimePath: paths.runtimePath,
      sessionId: "dash_first",
    });
    const second = createDashboardRuntimeSessionManager({
      binding: readyBinding,
      deliveryToken: "token-2",
      pid: 2222,
      runtimePath: paths.runtimePath,
      sessionId: "dash_second",
    });

    await first.start(new Date("2026-05-15T00:00:00.000Z"));
    await second.start(new Date("2026-05-15T00:00:01.000Z"));
    await first.stop();

    await expect(
      readDashboardRuntimeSession(paths.runtimePath),
    ).resolves.toMatchObject({
      deliveryToken: "token-2",
      sessionId: "dash_second",
    });

    await second.stop();
  });

  it("cleans up the runtime session file on stop", async () => {
    const paths = await createDashboardTestPaths("dashboard-live-runtime-");
    const manager = createDashboardRuntimeSessionManager({
      binding: readyBinding,
      deliveryToken: "runtime-token",
      pid: 4321,
      runtimePath: paths.runtimePath,
      sessionId: "dash_01",
    });

    await manager.start(new Date("2026-05-15T00:00:00.000Z"));
    await manager.stop();

    await expect(readDashboardRuntimeSession(paths.runtimePath)).resolves.toBe(
      undefined,
    );
  });
});
