import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { defaultAuditPath } from "../audit/log.js";
import { defaultAuthPath } from "../config/auth-store.js";
import { defaultResearchDir } from "../reporting/research-store.js";
import { findAvailablePort, DEFAULT_DASHBOARD_PORT } from "./port.js";
import { createDashboardRouter } from "./routes.js";
import type { DashboardBinding } from "./schemas.js";

export interface StartDashboardServerInput {
  auditPath?: string;
  authPath?: string;
  configCwd?: string;
  dashboardTestFaults?: DashboardTestFaults;
  host?: string;
  port?: number;
  researchDir?: string;
}

export interface DashboardTestFaults {
  status?: "error";
  tableRecords?: "partial";
  tableSchema?: "partial";
}

export interface DashboardServerHandle {
  binding: DashboardBinding;
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
  const server = createServer((request, response) =>
    createDashboardRouter({
      auditPath: input.auditPath ?? defaultAuditPath(),
      authPath: input.authPath ?? defaultAuthPath(),
      binding,
      configCwd: input.configCwd,
      dashboardTestFaults: input.dashboardTestFaults,
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

  return {
    binding,
    server,
    async stop() {
      if (!server.listening) return;
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}
