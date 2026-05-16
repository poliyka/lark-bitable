import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { defaultAuditPath } from "../audit/log.js";
import { defaultAuthPath } from "../config/auth-store.js";
import { ConfigStore } from "../config/store.js";
import { defaultResearchDir } from "../reporting/research-store.js";
import {
  createDashboardLiveServer,
  type DashboardLiveServer,
} from "./live-server.js";
import {
  createDashboardRuntimeSessionManager,
  defaultDashboardRuntimePath,
  type DashboardRuntimeSessionManager,
} from "./live-runtime.js";
import { startDashboardStateWatcher } from "./state-watch.js";
import { findAvailablePort, DEFAULT_DASHBOARD_PORT } from "./port.js";
import { createDashboardRouter } from "./routes.js";
import type { DashboardBinding } from "./schemas.js";

export interface StartDashboardServerInput {
  appVersion?: string;
  auditPath?: string;
  authPath?: string;
  configCwd?: string;
  dashboardTestFaults?: DashboardTestFaults;
  host?: string;
  port?: number;
  researchDir?: string;
  runtimePath?: string;
}

export interface DashboardTestFaults {
  status?: "error";
  tableRecords?: "partial";
  tableSchema?: "partial";
}

export interface DashboardServerHandle {
  binding: DashboardBinding;
  liveServer: DashboardLiveServer;
  runtime: DashboardRuntimeSessionManager;
  server: Server;
  stop(): Promise<void>;
}

export async function startDashboardServer(
  input: StartDashboardServerInput = {},
): Promise<DashboardServerHandle> {
  const host = input.host ?? "127.0.0.1";
  const requestedPort = input.port ?? DEFAULT_DASHBOARD_PORT;
  const selectedPort = await findAvailablePort({
    host,
    startPort: requestedPort,
  });
  let binding: DashboardBinding = {
    host,
    origin: `http://${host}:${selectedPort}`,
    port: selectedPort,
    requestedPort,
    startedAt: new Date().toISOString(),
    status: "starting",
  };
  let liveServer: DashboardLiveServer | undefined;
  let runtime: DashboardRuntimeSessionManager | undefined;
  let stateWatcher: ReturnType<typeof startDashboardStateWatcher> | undefined;
  const configStore = new ConfigStore({ cwd: input.configCwd });
  const server = createServer((request, response) =>
    createDashboardRouter({
      auditPath: input.auditPath ?? defaultAuditPath(),
      appVersion: input.appVersion,
      authPath: input.authPath ?? defaultAuthPath(),
      binding,
      configCwd: input.configCwd,
      dashboardTestFaults: input.dashboardTestFaults,
      liveServer,
      liveToken: runtime?.session?.deliveryToken,
      researchDir: input.researchDir ?? defaultResearchDir(),
    })(request, response),
  );

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(selectedPort, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address() as AddressInfo;
  binding = {
    ...binding,
    origin: `http://${host}:${address.port}`,
    port: address.port,
    status: "ready",
  };
  liveServer = createDashboardLiveServer({ binding });
  runtime = createDashboardRuntimeSessionManager({
    binding,
    runtimePath: input.runtimePath ?? defaultDashboardRuntimePath(),
  });
  await runtime.start(new Date());
  stateWatcher = startDashboardStateWatcher({
    authPath: input.authPath ?? defaultAuthPath(),
    configPath: configStore.path,
    liveServer,
  });
  server.on("upgrade", (request, socket, head) => {
    const activeSession = runtime?.session;
    if (!liveServer || !activeSession) {
      socket.destroy();
      return;
    }
    if ((request.url ?? "").split("?")[0] !== "/api/live/ws") {
      socket.destroy();
      return;
    }
    liveServer.handleUpgrade(request, socket, head, activeSession);
  });

  return {
    binding,
    liveServer,
    runtime,
    server,
    async stop() {
      stateWatcher?.stop();
      await runtime?.stop();
      await liveServer?.stop();
      if (!server.listening) return;
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}
