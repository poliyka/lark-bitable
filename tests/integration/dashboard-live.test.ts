import { rm, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

import { Flags } from "@oclif/core";
import WebSocket from "ws";
import { describe, expect, it, vi } from "vitest";

import { ConfigStore } from "../../src/config/store.js";
import { AuthStore } from "../../src/config/auth-store.js";
import ResearchCommand from "../../src/cli/commands/research.js";
import { CliError } from "../../src/cli/errors.js";
import { BaseCommand } from "../../src/cli/base-command.js";
import ValidCommand from "../../src/cli/commands/valid.js";
import { startDashboardServer } from "../../src/dashboard/server.js";
import {
  closeWebSocket,
  createWebSocketMessageCollector,
  waitForWebSocketOpen,
} from "../fixtures/dashboard-live.js";
import {
  configDraftFixture,
  createDashboardTestPaths,
  fetchDashboardJson,
} from "../fixtures/dashboard.js";
import { fixtureSource } from "../fixtures/lark.js";
import { selectedBugFixture } from "../fixtures/research.js";

function liveWebSocketUrl(origin: string, lastSequence?: number): string {
  const url = new URL("/api/live/ws", origin.replace(/^http/, "ws"));
  if (typeof lastSequence === "number" && lastSequence > 0) {
    url.searchParams.set("lastSequence", String(lastSequence));
  }
  return url.toString();
}

async function captureProcessOutput<T>(
  operation: () => Promise<T>,
): Promise<{ stderr: string; stdout: string; value: T }> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(((
    chunk: unknown,
  ) => {
    stdout.push(String(chunk));
    return true;
  }) as typeof process.stdout.write);
  const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(((
    chunk: unknown,
  ) => {
    stderr.push(String(chunk));
    return true;
  }) as typeof process.stderr.write);

  try {
    const value = await operation();
    return {
      stderr: stderr.join(""),
      stdout: stdout.join(""),
      value,
    };
  } finally {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  }
}

async function nextMessageMatching<T>(
  collector: ReturnType<typeof createWebSocketMessageCollector>,
  predicate: (message: { type?: string }) => message is T,
  maxMessages = 8,
): Promise<T> {
  for (let index = 0; index < maxMessages; index += 1) {
    const message = await collector.next<{ type?: string }>();
    if (predicate(message)) return message;
  }
  throw new Error("Expected live message was not delivered.");
}

class DelayedOutcomeCommand extends BaseCommand {
  static description =
    "Test-only command that keeps running long enough to stop the dashboard.";
  static flags = {
    ...BaseCommand.baseFlags,
    delay: Flags.integer({
      default: 50,
      hidden: true,
    }),
  };

  async run() {
    const { flags } = await this.parse(DelayedOutcomeCommand);
    await delay(flags.delay);
    const output = {
      command: "delayed-outcome",
      data: { completed: true },
      status: "ok" as const,
    };
    this.emit(output, true);
    return output;
  }
}

class FailingLiveCommand extends BaseCommand {
  static description =
    "Test-only command that fails after live start delivery.";
  static flags = {
    ...BaseCommand.baseFlags,
  };

  async run() {
    throw new CliError({
      code: "expected-failure",
      message: "Expected command failure.",
      remediation: "This is a test command.",
      status: "error",
    });
  }
}

describe("dashboard live updates", () => {
  it("delivers live.connected, terminal command activity, and audit invalidation", async () => {
    const paths = await createDashboardTestPaths("dashboard-live-");
    const server = await startDashboardServer({
      auditPath: paths.auditPath,
      authPath: paths.authPath,
      configCwd: paths.configCwd,
      host: "127.0.0.1",
      port: 0,
      researchDir: paths.researchDir,
      runtimePath: paths.runtimePath,
    });
    const socket = new WebSocket(liveWebSocketUrl(server.binding.origin));
    const collector = createWebSocketMessageCollector(socket);

    try {
      await waitForWebSocketOpen(socket);
      const connected = await collector.next<{
        payload: { catchUpRequired: boolean; sessionId: string };
        type: string;
      }>();

      await ValidCommand.run([
        "--json",
        "--audit-path",
        paths.auditPath,
        "--auth-path",
        paths.authPath,
        "--config-cwd",
        paths.configCwd,
        "--workflow",
        "dashboard",
      ]);

      const started = await collector.next<{
        payload: {
          command: string;
          commandRunId: string;
          phase: string;
          status: string;
          trigger: string;
        };
        type: string;
      }>();
      const startedInvalidate = await collector.next<{
        payload: {
          resources: string[];
          sourceEventId?: string;
          surfaces: string[];
        };
        type: string;
      }>();
      const outcome = await collector.next<{
        payload: {
          changedSurfaces: string[];
          command: string;
          commandRunId: string;
          evidenceCount: number;
          phase: string;
          status: string;
          trigger: string;
        };
        type: string;
      }>();
      const outcomeInvalidate = await collector.next<{
        dataSource: string;
        payload: {
          resources: string[];
          sourceEventId?: string;
          surfaces: string[];
        };
        type: string;
      }>();
      const audit = await fetchDashboardJson<{
        data: { entries: Array<{ command: string }> };
        status: string;
      }>(server.binding.origin, "/api/audit");

      expect(connected.type).toBe("live.connected");
      expect(connected.payload.catchUpRequired).toBe(true);
      expect(connected.payload.sessionId).toMatch(/^dash_/);

      expect(started.type).toBe("command.activity");
      expect(started.payload.command).toBe("valid");
      expect(started.payload.phase).toBe("started");
      expect(started.payload.status).toBe("running");
      expect(started.payload.trigger).toBe("terminal");

      expect(startedInvalidate.type).toBe("state.invalidate");
      expect(startedInvalidate.payload.surfaces).toContain("audit");
      expect(startedInvalidate.payload.resources).toContain("/api/audit");

      expect(outcome.type).toBe("command.activity");
      expect(outcome.payload.command).toBe("valid");
      expect(outcome.payload.commandRunId).toBe(started.payload.commandRunId);
      expect(outcome.payload.phase).toBe("partial");
      expect(outcome.payload.status).toBe("partial");
      expect(outcome.payload.changedSurfaces).toContain("audit");

      expect(outcomeInvalidate.type).toBe("state.invalidate");
      expect(outcomeInvalidate.dataSource).toBe("partial");
      expect(outcomeInvalidate.payload.resources).toContain("/api/audit");
      expect(outcomeInvalidate.payload.sourceEventId).toBeTruthy();

      expect(audit.status).toBe("ok");
      expect(audit.data.entries[0]?.command).toBe("valid");
    } finally {
      collector.stop();
      await closeWebSocket(socket);
      await server.stop();
    }
  });

  it("delivers dashboard-triggered playground activity with the dashboard trigger", async () => {
    const paths = await createDashboardTestPaths("dashboard-live-");
    const server = await startDashboardServer({
      auditPath: paths.auditPath,
      authPath: paths.authPath,
      configCwd: paths.configCwd,
      host: "127.0.0.1",
      port: 0,
      researchDir: paths.researchDir,
      runtimePath: paths.runtimePath,
    });
    let socket: WebSocket | undefined;
    let collector:
      | ReturnType<typeof createWebSocketMessageCollector>
      | undefined;

    try {
      await fetchDashboardJson(server.binding.origin, "/api/config", {
        body: JSON.stringify(configDraftFixture),
        method: "POST",
      });
      socket = new WebSocket(liveWebSocketUrl(server.binding.origin));
      collector = createWebSocketMessageCollector(socket);
      await waitForWebSocketOpen(socket);
      await collector.next();

      const run = await fetchDashboardJson<{
        data: { run: { command: string; status: string } };
        status: string;
      }>(server.binding.origin, "/api/playground/run", {
        body: JSON.stringify({
          command: "valid",
          parameters: { workflow: "dashboard" },
        }),
        method: "POST",
      });

      const started = await nextMessageMatching(
        collector,
        (
          message,
        ): message is {
          payload: { command: string; phase: string; trigger: string };
          type: string;
        } => message.type === "command.activity",
      );
      const outcome = await nextMessageMatching(
        collector,
        (
          message,
        ): message is {
          payload: {
            command: string;
            phase: string;
            status: string;
            trigger: string;
          };
          type: string;
        } =>
          message.type === "command.activity" &&
          message.payload?.phase === "partial",
      );

      expect(run.status).toBe("partial");
      expect(run.data.run.command).toBe("valid");

      expect(started.type).toBe("command.activity");
      expect(started.payload.command).toBe("valid");
      expect(started.payload.phase).toBe("started");
      expect(started.payload.trigger).toBe("dashboard");

      expect(outcome.type).toBe("command.activity");
      expect(outcome.payload.command).toBe("valid");
      expect(outcome.payload.phase).toBe("partial");
      expect(outcome.payload.status).toBe("partial");
      expect(outcome.payload.trigger).toBe("dashboard");
    } finally {
      collector?.stop();
      if (socket) {
        await closeWebSocket(socket);
      }
      await server.stop();
    }
  });

  it("broadcasts configure and logout dashboard actions to connected clients", async () => {
    const paths = await createDashboardTestPaths("dashboard-live-");
    const server = await startDashboardServer({
      auditPath: paths.auditPath,
      authPath: paths.authPath,
      configCwd: paths.configCwd,
      host: "127.0.0.1",
      port: 0,
      researchDir: paths.researchDir,
      runtimePath: paths.runtimePath,
    });
    const socket = new WebSocket(liveWebSocketUrl(server.binding.origin));
    const collector = createWebSocketMessageCollector(socket);

    try {
      await waitForWebSocketOpen(socket);
      await collector.next();

      await fetchDashboardJson(server.binding.origin, "/api/config", {
        body: JSON.stringify(configDraftFixture),
        method: "POST",
      });

      const configureEvent = await collector.next<{
        payload: {
          changedSurfaces: string[];
          command: string;
          trigger: string;
        };
        type: string;
      }>();
      const configureInvalidate = await collector.next<{
        payload: { resources: string[]; surfaces: string[] };
        type: string;
      }>();

      await fetchDashboardJson(server.binding.origin, "/api/auth/logout", {
        body: "{}",
        method: "POST",
      });

      const logoutEvent = await collector.next<{
        payload: {
          changedSurfaces: string[];
          command: string;
          trigger: string;
        };
        type: string;
      }>();
      const logoutInvalidate = await collector.next<{
        payload: { resources: string[]; surfaces: string[] };
        type: string;
      }>();

      expect(configureEvent.type).toBe("command.activity");
      expect(configureEvent.payload.command).toBe("configure");
      expect(configureEvent.payload.trigger).toBe("dashboard");
      expect(configureEvent.payload.changedSurfaces).toEqual(
        expect.arrayContaining(["config", "overview", "table", "audit"]),
      );
      expect(configureInvalidate.type).toBe("state.invalidate");
      expect(configureInvalidate.payload.resources).toEqual(
        expect.arrayContaining([
          "/api/config",
          "/api/status",
          "/api/table/schema",
          "/api/table/records",
          "/api/audit",
        ]),
      );

      expect(logoutEvent.type).toBe("command.activity");
      expect(logoutEvent.payload.command).toBe("logout");
      expect(logoutEvent.payload.trigger).toBe("dashboard");
      expect(logoutEvent.payload.changedSurfaces).toEqual(
        expect.arrayContaining(["auth", "overview", "table", "audit"]),
      );
      expect(logoutInvalidate.type).toBe("state.invalidate");
      expect(logoutInvalidate.payload.resources).toEqual(
        expect.arrayContaining([
          "/api/status",
          "/api/audit",
          "/api/table/schema",
          "/api/table/records",
        ]),
      );
    } finally {
      collector.stop();
      await closeWebSocket(socket);
      await server.stop();
    }
  });

  it("broadcasts state invalidation when local config or auth files are deleted outside the dashboard", async () => {
    const paths = await createDashboardTestPaths("dashboard-live-");
    const store = new ConfigStore({ cwd: paths.configCwd });
    store.setSource(fixtureSource);
    store.setLarkApp({
      appId: "cli-app-id",
      appSecret: "cli-secret-value",
      callbackPort: 14543,
      domain: "larksuite.com",
      redirectUri: "http://127.0.0.1:14543/callback",
      scopes: ["bitable:app:readonly"],
      updatedAt: "2026-05-15T00:00:00.000Z",
    });
    await new AuthStore(paths.authPath).write({
      accessToken: "test-access-token",
      accountLabel: "qa-user@example.com",
      domain: "larksuite.com",
      expiresAt: "2099-05-07T12:00:00.000Z",
      scopes: ["bitable:app:readonly"],
      status: "ready",
      storagePath: paths.authPath,
    });
    const server = await startDashboardServer({
      auditPath: paths.auditPath,
      authPath: paths.authPath,
      configCwd: paths.configCwd,
      host: "127.0.0.1",
      port: 0,
      researchDir: paths.researchDir,
      runtimePath: paths.runtimePath,
    });
    const socket = new WebSocket(liveWebSocketUrl(server.binding.origin));
    const collector = createWebSocketMessageCollector(socket);

    try {
      await waitForWebSocketOpen(socket);
      await collector.next();

      await rm(store.path);

      const configInvalidate = await collector.next<{
        payload: { reason: string; resources: string[]; surfaces: string[] };
        type: string;
      }>();

      await rm(paths.authPath);

      const authInvalidate = await collector.next<{
        payload: { reason: string; resources: string[]; surfaces: string[] };
        type: string;
      }>();

      expect(configInvalidate.type).toBe("state.invalidate");
      expect(configInvalidate.payload.reason).toContain("config.json");
      expect(configInvalidate.payload.surfaces).toEqual(
        expect.arrayContaining(["shell", "overview", "config", "audit"]),
      );
      expect(configInvalidate.payload.resources).toEqual(
        expect.arrayContaining(["/api/status", "/api/config", "/api/audit"]),
      );

      expect(authInvalidate.type).toBe("state.invalidate");
      expect(authInvalidate.payload.reason).toContain("auth.json");
      expect(authInvalidate.payload.surfaces).toEqual(
        expect.arrayContaining(["shell", "overview", "auth", "audit"]),
      );
      expect(authInvalidate.payload.resources).toEqual(
        expect.arrayContaining(["/api/status", "/api/audit"]),
      );
    } finally {
      collector.stop();
      await closeWebSocket(socket);
      await server.stop();
    }
  });

  it("keeps state-file watching non-blocking during concurrent external writes", async () => {
    const paths = await createDashboardTestPaths("dashboard-live-");
    const store = new ConfigStore({ cwd: paths.configCwd });
    const server = await startDashboardServer({
      auditPath: paths.auditPath,
      authPath: paths.authPath,
      configCwd: paths.configCwd,
      host: "127.0.0.1",
      port: 0,
      researchDir: paths.researchDir,
      runtimePath: paths.runtimePath,
    });
    const socket = new WebSocket(liveWebSocketUrl(server.binding.origin));
    const collector = createWebSocketMessageCollector(socket);
    const configPayload = (index: number) =>
      `${JSON.stringify(
        {
          activeSource: {
            ...fixtureSource,
            name: `Project Bugs ${index}`,
          },
          larkApp: {
            appId: `cli-app-id-${index}`,
            appSecret: "cli-secret-value",
            callbackPort: 14543,
            domain: "larksuite.com",
            redirectUri: "http://127.0.0.1:14543/callback",
            scopes: ["bitable:app:readonly"],
            updatedAt: "2026-05-15T00:00:00.000Z",
          },
        },
        null,
        2,
      )}\n`;
    const authPayload = (index: number) =>
      `${JSON.stringify(
        {
          accessToken: `test-access-token-${index}`,
          accountLabel: "qa-user@example.com",
          domain: "larksuite.com",
          expiresAt: "2099-05-07T12:00:00.000Z",
          scopes: ["bitable:app:readonly"],
          status: "ready",
          storagePath: paths.authPath,
          updatedAt: "2026-05-15T00:00:00.000Z",
        },
        null,
        2,
      )}\n`;

    try {
      await waitForWebSocketOpen(socket);
      await collector.next();

      const writeResult = await Promise.race([
        Promise.all(
          Array.from({ length: 24 }, (_, index) =>
            index % 2 === 0
              ? writeFile(store.path, configPayload(index), { mode: 0o600 })
              : writeFile(paths.authPath, authPayload(index), { mode: 0o600 }),
          ),
        ).then(() => "completed" as const),
        delay(3_000).then(() => "timed-out" as const),
      ]);

      await writeFile(store.path, configPayload(100), { mode: 0o600 });
      await writeFile(paths.authPath, authPayload(100), { mode: 0o600 });

      const invalidate = await Promise.race([
        collector.next<{
          payload: { reason: string; resources: string[]; surfaces: string[] };
          type: string;
        }>(),
        delay(3_000).then(() => undefined),
      ]);
      const status = await fetchDashboardJson<{ status: string }>(
        server.binding.origin,
        "/api/status",
      );

      expect(writeResult).toBe("completed");
      expect(invalidate?.type).toBe("state.invalidate");
      expect(invalidate?.payload.surfaces).toEqual(
        expect.arrayContaining(["overview"]),
      );
      expect(status.status).toMatch(/^(ok|partial)$/);
    } finally {
      collector.stop();
      await closeWebSocket(socket);
      await server.stop();
    }
  });

  it("delivers the same command activity sequence to multiple connected clients", async () => {
    const paths = await createDashboardTestPaths("dashboard-live-");
    const server = await startDashboardServer({
      auditPath: paths.auditPath,
      authPath: paths.authPath,
      configCwd: paths.configCwd,
      host: "127.0.0.1",
      port: 0,
      researchDir: paths.researchDir,
      runtimePath: paths.runtimePath,
    });
    const firstSocket = new WebSocket(liveWebSocketUrl(server.binding.origin));
    const secondSocket = new WebSocket(liveWebSocketUrl(server.binding.origin));
    const firstCollector = createWebSocketMessageCollector(firstSocket);
    const secondCollector = createWebSocketMessageCollector(secondSocket);

    try {
      await Promise.all([
        waitForWebSocketOpen(firstSocket),
        waitForWebSocketOpen(secondSocket),
      ]);
      await Promise.all([firstCollector.next(), secondCollector.next()]);

      await ValidCommand.run([
        "--json",
        "--audit-path",
        paths.auditPath,
        "--auth-path",
        paths.authPath,
        "--config-cwd",
        paths.configCwd,
        "--workflow",
        "dashboard",
      ]);

      const firstMessages = await Promise.all([
        firstCollector.next<{
          payload: { commandRunId: string };
          type: string;
        }>(),
        firstCollector.next<{ type: string }>(),
        firstCollector.next<{
          payload: { commandRunId: string };
          type: string;
        }>(),
        firstCollector.next<{ type: string }>(),
      ]);
      const secondMessages = await Promise.all([
        secondCollector.next<{
          payload: { commandRunId: string };
          type: string;
        }>(),
        secondCollector.next<{ type: string }>(),
        secondCollector.next<{
          payload: { commandRunId: string };
          type: string;
        }>(),
        secondCollector.next<{ type: string }>(),
      ]);

      const firstActivities = firstMessages.filter(
        (message) => message.type === "command.activity",
      );
      const secondActivities = secondMessages.filter(
        (message) => message.type === "command.activity",
      );

      expect(firstActivities).toHaveLength(2);
      expect(secondActivities).toHaveLength(2);
      expect(secondActivities[0]?.payload.commandRunId).toBe(
        firstActivities[0]?.payload.commandRunId,
      );
      expect(secondActivities[1]?.payload.commandRunId).toBe(
        firstActivities[1]?.payload.commandRunId,
      );
    } finally {
      firstCollector.stop();
      secondCollector.stop();
      await Promise.all([
        closeWebSocket(firstSocket),
        closeWebSocket(secondSocket),
      ]);
      await server.stop();
    }
  });

  it("requests catch-up after a client reconnects with an older live sequence", async () => {
    const paths = await createDashboardTestPaths("dashboard-live-");
    const server = await startDashboardServer({
      auditPath: paths.auditPath,
      authPath: paths.authPath,
      configCwd: paths.configCwd,
      host: "127.0.0.1",
      port: 0,
      researchDir: paths.researchDir,
      runtimePath: paths.runtimePath,
    });
    const initialSocket = new WebSocket(
      liveWebSocketUrl(server.binding.origin),
    );
    const initialCollector = createWebSocketMessageCollector(initialSocket);

    try {
      await waitForWebSocketOpen(initialSocket);
      await initialCollector.next();

      await ValidCommand.run([
        "--json",
        "--audit-path",
        paths.auditPath,
        "--auth-path",
        paths.authPath,
        "--config-cwd",
        paths.configCwd,
        "--workflow",
        "dashboard",
      ]);

      await initialCollector.next();
      await initialCollector.next();
      const latestActivity = await initialCollector.next<{
        sequence: number;
        type: string;
      }>();
      await initialCollector.next();

      initialCollector.stop();
      await closeWebSocket(initialSocket);

      await ValidCommand.run([
        "--json",
        "--audit-path",
        paths.auditPath,
        "--auth-path",
        paths.authPath,
        "--config-cwd",
        paths.configCwd,
        "--workflow",
        "dashboard",
      ]);
      await delay(50);

      const reconnectSocket = new WebSocket(
        liveWebSocketUrl(server.binding.origin, latestActivity.sequence),
      );
      const reconnectCollector =
        createWebSocketMessageCollector(reconnectSocket);

      try {
        await waitForWebSocketOpen(reconnectSocket);
        const connected = await reconnectCollector.next<{
          payload: { catchUpRequired: boolean };
          type: string;
        }>();
        const catchup = await reconnectCollector.next<{
          dataSource: string;
          payload: { reason: string; surfaces: string[] };
          type: string;
        }>();

        expect(connected.type).toBe("live.connected");
        expect(connected.payload.catchUpRequired).toBe(true);
        expect(catchup.type).toBe("live.catchup-required");
        expect(catchup.dataSource).toBe("reconnecting");
        expect(catchup.payload.surfaces).toEqual(
          expect.arrayContaining(["shell", "overview", "audit"]),
        );
      } finally {
        reconnectCollector.stop();
        await closeWebSocket(reconnectSocket);
      }
    } finally {
      await server.stop();
    }
  });

  it("keeps valid and research command output unchanged when no dashboard runtime is present", async () => {
    const paths = await createDashboardTestPaths("dashboard-live-");
    new ConfigStore({ cwd: paths.configCwd }).setSelection(selectedBugFixture);

    const valid = await captureProcessOutput(() =>
      ValidCommand.run([
        "--json",
        "--audit-path",
        paths.auditPath,
        "--auth-path",
        paths.authPath,
        "--config-cwd",
        paths.configCwd,
        "--workflow",
        "dashboard",
      ]),
    );
    const research = await captureProcessOutput(() =>
      ResearchCommand.run([
        "--json",
        "--audit-path",
        paths.auditPath,
        "--config-cwd",
        paths.configCwd,
        "--research-dir",
        paths.researchDir,
      ]),
    );
    const failed = await captureProcessOutput(() =>
      FailingLiveCommand.run(["--json", "--audit-path", paths.auditPath]).catch(
        (error) => error,
      ),
    );

    expect(valid.value).toMatchObject({ command: "valid" });
    expect(research.value).toMatchObject({ command: "research" });
    expect(failed.value).toBeInstanceOf(CliError);

    expect(valid.stderr).toBe("");
    expect(research.stderr).toBe("");
    expect(failed.stderr).toBe("");
    expect(`${valid.stdout}${research.stdout}${failed.stdout}`).not.toContain(
      "dashboard update",
    );
  });

  it("keeps command completion unchanged when the dashboard stops during a run", async () => {
    const paths = await createDashboardTestPaths("dashboard-live-");
    const server = await startDashboardServer({
      auditPath: paths.auditPath,
      authPath: paths.authPath,
      configCwd: paths.configCwd,
      host: "127.0.0.1",
      port: 0,
      researchDir: paths.researchDir,
      runtimePath: paths.runtimePath,
    });

    try {
      const stopPromise = delay(10).then(() => server.stop());
      const run = await captureProcessOutput(() =>
        DelayedOutcomeCommand.run([
          "--json",
          "--audit-path",
          paths.auditPath,
          "--delay",
          "50",
        ]),
      );
      await stopPromise;

      expect(run.value).toMatchObject({
        command: "delayed-outcome",
        status: "ok",
      });
      expect(run.stderr).toBe("");
      expect(run.stdout).not.toContain("dashboard update");
    } finally {
      await server.stop().catch(() => undefined);
    }
  });
});
