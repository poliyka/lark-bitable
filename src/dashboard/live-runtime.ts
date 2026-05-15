import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import type { DashboardBinding } from "./schemas.js";
import {
  dashboardRuntimeSessionSchema,
  type DashboardRuntimeSession,
} from "./live-events.js";

export const DASHBOARD_RUNTIME_HEARTBEAT_INTERVAL_MS = 5_000;
export const DASHBOARD_RUNTIME_STALE_AFTER_MS = 15_000;

export interface WriteDashboardRuntimeSessionInput {
  binding: Pick<DashboardBinding, "host" | "origin" | "port">;
  deliveryToken?: string;
  lastHeartbeatAt?: string;
  pid?: number;
  runtimePath?: string;
  sessionId?: string;
  startedAt?: string;
}

export interface DashboardRuntimeStaleOptions {
  now?: Date;
  staleAfterMs?: number;
}

export interface CreateDashboardRuntimeSessionManagerInput extends WriteDashboardRuntimeSessionInput {
  heartbeatIntervalMs?: number;
}

export interface DashboardRuntimeSessionManager {
  readonly runtimePath: string;
  readonly session: DashboardRuntimeSession | undefined;
  heartbeat(now?: Date): Promise<DashboardRuntimeSession | undefined>;
  start(now?: Date): Promise<DashboardRuntimeSession>;
  stop(): Promise<void>;
}

export function defaultDashboardRuntimePath(home = homedir()): string {
  return join(home, ".lark-bitable", "dashboard", "runtime.json");
}

export function runtimePathFromAuditPath(auditPath: string): string {
  return join(dirname(dirname(auditPath)), "dashboard", "runtime.json");
}

export async function readDashboardRuntimeSession(
  runtimePath = defaultDashboardRuntimePath(),
): Promise<DashboardRuntimeSession | undefined> {
  try {
    const raw = await readFile(runtimePath, "utf8");
    return dashboardRuntimeSessionSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function writeDashboardRuntimeSession(
  input: WriteDashboardRuntimeSessionInput,
): Promise<DashboardRuntimeSession> {
  const runtimePath = input.runtimePath ?? defaultDashboardRuntimePath();
  const startedAt = input.startedAt ?? new Date().toISOString();
  const lastHeartbeatAt = input.lastHeartbeatAt ?? startedAt;
  const session = dashboardRuntimeSessionSchema.parse({
    deliveryToken: input.deliveryToken ?? randomUUID(),
    host: input.binding.host,
    lastHeartbeatAt,
    origin: input.binding.origin,
    pid: input.pid ?? process.pid,
    port: input.binding.port,
    runtimePath,
    sessionId: input.sessionId ?? `dash_${randomUUID()}`,
    startedAt,
  });
  await mkdir(dirname(runtimePath), { recursive: true, mode: 0o700 });
  await writeFile(runtimePath, `${JSON.stringify(session, null, 2)}\n`, {
    mode: 0o600,
  });
  return session;
}

export function isDashboardRuntimeSessionStale(
  session: DashboardRuntimeSession,
  options: DashboardRuntimeStaleOptions = {},
): boolean {
  const now = options.now ?? new Date();
  const staleAfterMs = options.staleAfterMs ?? DASHBOARD_RUNTIME_STALE_AFTER_MS;
  return (
    now.getTime() - new Date(session.lastHeartbeatAt).getTime() > staleAfterMs
  );
}

export function createDashboardRuntimeSessionManager(
  input: CreateDashboardRuntimeSessionManagerInput,
): DashboardRuntimeSessionManager {
  const runtimePath = input.runtimePath ?? defaultDashboardRuntimePath();
  const heartbeatIntervalMs =
    input.heartbeatIntervalMs ?? DASHBOARD_RUNTIME_HEARTBEAT_INTERVAL_MS;
  let activeSession: DashboardRuntimeSession | undefined;
  let heartbeatTimer: NodeJS.Timeout | undefined;

  const manager: DashboardRuntimeSessionManager = {
    get runtimePath() {
      return runtimePath;
    },
    get session() {
      return activeSession;
    },
    async start(now = new Date()) {
      activeSession = await writeDashboardRuntimeSession({
        ...input,
        lastHeartbeatAt: now.toISOString(),
        runtimePath,
        startedAt: now.toISOString(),
      });
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(() => {
        void manager.heartbeat(new Date());
      }, heartbeatIntervalMs);
      heartbeatTimer.unref?.();
      return activeSession;
    },
    async heartbeat(now = new Date()) {
      if (!activeSession) return undefined;
      activeSession = await writeDashboardRuntimeSession({
        ...input,
        deliveryToken: activeSession.deliveryToken,
        lastHeartbeatAt: now.toISOString(),
        pid: activeSession.pid,
        runtimePath,
        sessionId: activeSession.sessionId,
        startedAt: activeSession.startedAt,
      });
      return activeSession;
    },
    async stop() {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = undefined;
      }
      if (!activeSession) return;
      const stoppedSession = activeSession;
      activeSession = undefined;
      await removeDashboardRuntimeSession(
        runtimePath,
        stoppedSession.sessionId,
      );
    },
  };

  return manager;
}

async function removeDashboardRuntimeSession(
  runtimePath: string,
  sessionId?: string,
): Promise<void> {
  const current = await readDashboardRuntimeSession(runtimePath);
  if (!current) return;
  if (sessionId && current.sessionId !== sessionId) return;
  await rm(runtimePath).catch((error) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  });
}
