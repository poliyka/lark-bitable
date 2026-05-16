import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";

import { AuthStore } from "../config/auth-store.js";
import { inspectDoctorHealth } from "../config/doctor-health.js";
import { checkReadiness } from "../config/readiness.js";
import type { Issue } from "../config/schema.js";
import { ConfigStore } from "../config/store.js";
import { parseBitableUrl } from "../lark/url-parser.js";
import {
  dashboardAppScript,
  dashboardHtml,
  dashboardStyles,
} from "./assets.js";
import {
  dashboardError,
  dashboardOk,
  dashboardPartial,
  type DashboardErrorEnvelope,
} from "./api.js";
import {
  createDashboardAuthService,
  projectAuthState,
} from "./auth-service.js";
import {
  getDashboardAuditEntry,
  listDashboardAuditEntries,
} from "./audit-service.js";
import { loadConfigDraft, saveConfigDraft } from "./config-service.js";
import { runPlaygroundWorkflow } from "./playground-service.js";
import {
  getDashboardResearchReport,
  listDashboardResearchReports,
} from "./research-service.js";
import {
  auditQuerySchema,
  commandEventIngressSchema,
  configDraftInputSchema,
  playgroundRunRequestSchema,
  type DashboardBinding,
  type DashboardSurface,
} from "./schemas.js";
import type { DashboardLiveServer } from "./live-server.js";
import { getDashboardRecords, getDashboardSchema } from "./table-service.js";

export interface DashboardRouteContext {
  appVersion?: string;
  auditPath: string;
  authPath: string;
  binding: DashboardBinding;
  configCwd?: string;
  dashboardTestFaults?: {
    status?: "error";
    tableRecords?: "partial";
    tableSchema?: "partial";
  };
  liveServer?: DashboardLiveServer;
  liveToken?: string;
  researchDir?: string;
}

export function createDashboardRouter(context: DashboardRouteContext) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    try {
      await routeDashboardRequest(context, request, response);
    } catch (error) {
      sendJson(
        response,
        dashboardError(
          {
            code: "dashboard-request-failed",
            message: error instanceof Error ? error.message : String(error),
            remediation:
              "Retry the request. If it repeats, inspect the dashboard server console and audit logs.",
          },
          500,
        ),
      );
    }
  };
}

async function routeDashboardRequest(
  context: DashboardRouteContext,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const url = new URL(request.url ?? "/", context.binding.origin);
  if (request.method === "GET" && url.pathname === "/") {
    sendText(
      response,
      dashboardHtml(context.binding, context.appVersion),
      "text/html; charset=utf-8",
    );
    return;
  }
  if (request.method === "GET" && url.pathname === "/assets/app.js") {
    sendText(response, dashboardAppScript(), "text/javascript; charset=utf-8");
    return;
  }
  if (request.method === "GET" && url.pathname === "/assets/styles.css") {
    sendText(response, dashboardStyles(), "text/css; charset=utf-8");
    return;
  }
  if (
    request.method === "GET" &&
    url.pathname === "/assets/vendor/flatpickr.min.js"
  ) {
    sendText(
      response,
      await readVendorAsset("flatpickr/dist/flatpickr.min.js"),
      "text/javascript; charset=utf-8",
    );
    return;
  }
  if (
    request.method === "GET" &&
    url.pathname === "/assets/vendor/flatpickr.min.css"
  ) {
    sendText(
      response,
      await readVendorAsset("flatpickr/dist/flatpickr.min.css"),
      "text/css; charset=utf-8",
    );
    return;
  }

  if (url.pathname === "/api/status" && request.method === "GET") {
    if (context.dashboardTestFaults?.status === "error") {
      sendJson(
        response,
        dashboardError(
          testFaultIssue(
            "dashboard-status-test-fault",
            "Dashboard status test fault was requested.",
            "Disable dashboardTestFaults.status and retry the status request.",
          ),
          503,
          "failed",
        ),
      );
      return;
    }
    const configStore = new ConfigStore({ cwd: context.configCwd });
    const authStore = new AuthStore(context.authPath);
    const doctor = await inspectDoctorHealth({
      authPath: context.authPath,
      cli: context.appVersion
        ? { bin: "lark-bitable", version: context.appVersion }
        : undefined,
      configCwd: context.configCwd,
    });
    const readiness = await checkReadiness("dashboard", {
      authStore,
      bootstrap: doctor.bootstrap,
      configStore,
    });
    const doctorIssues = doctor.issues.filter(
      (issue) =>
        !readiness.partialIssues.some(
          (readinessIssue) => readinessIssue.code === issue.code,
        ) &&
        !readiness.blockingIssues.some(
          (readinessIssue) => readinessIssue.code === issue.code,
        ),
    );
    const overviewReadiness = {
      ...readiness,
      partialIssues: [...readiness.partialIssues, ...doctorIssues],
      remediationSteps: [
        ...new Set([
          ...readiness.remediationSteps,
          ...doctorIssues
            .map((issue) => issue.remediation)
            .filter((value): value is string => Boolean(value)),
        ]),
      ],
      status:
        readiness.blockingIssues.length > 0
          ? "blocked"
          : readiness.partialIssues.length + doctorIssues.length > 0
            ? "partial"
            : "ready",
    } as const;
    sendJson(
      response,
      dashboardOk({
        binding: context.binding,
        dashboardLoginRequired: false,
        localOnly:
          context.binding.host === "127.0.0.1" ||
          context.binding.host === "localhost",
        nextSafeActions: [
          overviewReadiness.remediationSteps[0] ??
            overviewReadiness.nextSafeCommand ??
            "lark-bitable dashboard",
        ],
        overview: {
          auth: await projectAuthState(authStore),
          configuration: doctor.data,
          mode: {
            active: doctor.mode.active ?? null,
            source: doctor.mode.source,
          },
          readiness: overviewReadiness,
          source: configStore.getSource() ?? null,
        },
      }),
    );
    return;
  }

  if (url.pathname === "/api/config" && request.method === "GET") {
    sendJson(
      response,
      dashboardOk(
        await loadConfigDraft({
          authStore: new AuthStore(context.authPath),
          configStore: new ConfigStore({ cwd: context.configCwd }),
        }),
        "file-backed",
      ),
    );
    return;
  }

  if (url.pathname === "/api/config" && request.method === "POST") {
    const raw = await readJson(request);
    const draft = configDraftInputSchema.parse(raw);
    try {
      parseBitableUrl(draft.sourceUrl);
    } catch (error) {
      sendJson(
        response,
        dashboardError(
          {
            code: "invalid-config",
            message: `Invalid Lark Bitable URL: ${error instanceof Error ? error.message : String(error)}`,
            remediation:
              "Keep the current form values, correct the Lark Base / Bitable URL, then save again.",
          },
          400,
          "failed",
        ),
      );
      return;
    }
    sendJson(
      response,
      dashboardOk(
        await saveConfigDraft({
          authStore: new AuthStore(context.authPath),
          configStore: new ConfigStore({ cwd: context.configCwd }),
          draft,
        }),
        "file-backed",
      ),
    );
    publishDashboardRouteEvent(context, {
      changedSurfaces: ["shell", "overview", "config", "table", "audit"],
      command: "configure",
      phase: "completed",
      status: "ok",
      trigger: "dashboard",
    });
    return;
  }

  if (url.pathname === "/api/auth/login/start" && request.method === "POST") {
    const body = (await readJson(request).catch(() => ({}))) as {
      openBrowser?: boolean;
      scopes?: string[];
      timeoutMs?: number;
    };
    const service = createDashboardAuthService({
      authStore: new AuthStore(context.authPath),
      configStore: new ConfigStore({ cwd: context.configCwd }),
    });
    sendJson(
      response,
      dashboardOk(
        await service.startLogin({
          callbackMode: "local",
          openBrowser: body.openBrowser,
          scopes: Array.isArray(body.scopes)
            ? body.scopes.map((scope) => String(scope))
            : undefined,
          timeoutMs: body.timeoutMs,
        }),
      ),
    );
    publishDashboardRouteEvent(context, {
      changedSurfaces: ["shell", "overview", "auth", "table", "audit"],
      command: "login",
      phase: "started",
      status: "running",
      trigger: "dashboard",
    });
    return;
  }

  if (url.pathname.startsWith("/api/auth/login/") && request.method === "GET") {
    const flowId = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
    const service = createDashboardAuthService({
      authStore: new AuthStore(context.authPath),
      configStore: new ConfigStore({ cwd: context.configCwd }),
    });
    sendJson(response, dashboardOk(await service.loginStatus(flowId)));
    return;
  }

  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    const service = createDashboardAuthService({
      authStore: new AuthStore(context.authPath),
      configStore: new ConfigStore({ cwd: context.configCwd }),
    });
    sendJson(response, dashboardOk(await service.logout(), "file-backed"));
    publishDashboardRouteEvent(context, {
      changedSurfaces: ["shell", "overview", "auth", "table", "audit"],
      command: "logout",
      phase: "completed",
      status: "ok",
      trigger: "dashboard",
    });
    return;
  }

  if (url.pathname === "/api/audit" && request.method === "GET") {
    const query = auditQuerySchema.parse(
      Object.fromEntries(url.searchParams.entries()),
    );
    sendJson(
      response,
      dashboardOk(
        await listDashboardAuditEntries({
          ...query,
          auditPath: context.auditPath,
        }),
        "file-backed",
      ),
    );
    return;
  }

  if (url.pathname.startsWith("/api/audit/") && request.method === "GET") {
    const id = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
    sendJson(
      response,
      dashboardOk(
        await getDashboardAuditEntry({ auditPath: context.auditPath, id }),
        "file-backed",
      ),
    );
    return;
  }

  if (url.pathname === "/api/playground/run" && request.method === "POST") {
    const body = playgroundRunRequestSchema.parse(await readJson(request));
    const run = await runPlaygroundWorkflow({
      auditPath: context.auditPath,
      authPath: context.authPath,
      command: body.command,
      configCwd: context.configCwd,
      confirmWrite: body.confirmWrite,
      parameters: body.parameters,
      researchDir: context.researchDir,
    });
    sendJson(
      response,
      run.status === "ok"
        ? dashboardOk({ run }, "live")
        : dashboardPartial({ run }, run.issues, "partial"),
    );
    return;
  }

  if (url.pathname === "/api/live/events" && request.method === "POST") {
    if (!context.liveServer || !context.liveToken) {
      sendJson(
        response,
        dashboardError(
          {
            code: "dashboard-live-event-rejected",
            message: "Live event was rejected.",
            remediation:
              "Refresh the dashboard or restart the dashboard service.",
          },
          503,
          "failed",
        ),
      );
      return;
    }

    const token = request.headers["x-dashboard-live-token"];
    if (token !== context.liveToken) {
      sendJson(
        response,
        dashboardError(
          {
            code: "dashboard-live-event-rejected",
            message: "Live event was rejected.",
            remediation:
              "Refresh the dashboard or restart the dashboard service.",
          },
          403,
          "failed",
        ),
      );
      return;
    }

    const event = commandEventIngressSchema.parse(await readJson(request));
    const accepted = context.liveServer.acceptCommandEvent(event);
    sendJson(response, dashboardOk(accepted, "live"));
    return;
  }

  if (url.pathname === "/api/research" && request.method === "GET") {
    sendJson(
      response,
      dashboardOk(
        await listDashboardResearchReports({
          cursor: url.searchParams.get("cursor") ?? undefined,
          limit: Number.parseInt(url.searchParams.get("limit") ?? "50", 10),
          researchDir: context.researchDir,
          text: url.searchParams.get("text") ?? undefined,
        }),
        "file-backed",
      ),
    );
    return;
  }

  if (url.pathname.startsWith("/api/research/") && request.method === "GET") {
    const reportId = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
    sendJson(
      response,
      dashboardOk(
        await getDashboardResearchReport({
          reportId,
          researchDir: context.researchDir,
        }),
        "file-backed",
      ),
    );
    return;
  }

  if (url.pathname === "/api/table/schema" && request.method === "GET") {
    if (context.dashboardTestFaults?.tableSchema === "partial") {
      sendJson(
        response,
        dashboardPartial(
          { fields: [], issues: [], mappings: {}, status: "blocked" },
          [
            testFaultIssue(
              "dashboard-table-schema-test-fault",
              "Dashboard table schema test fault was requested.",
              "Disable dashboardTestFaults.tableSchema and retry schema discovery.",
            ),
          ],
          "partial",
        ),
      );
      return;
    }
    const table = await getDashboardSchema({
      authPath: context.authPath,
      configStore: new ConfigStore({ cwd: context.configCwd }),
    });
    sendJson(
      response,
      table.status === "ready"
        ? dashboardOk(table, "live")
        : dashboardPartial(table, table.issues, "missing"),
    );
    return;
  }

  if (url.pathname === "/api/table/records" && request.method === "GET") {
    if (context.dashboardTestFaults?.tableRecords === "partial") {
      sendJson(
        response,
        dashboardPartial(
          { issues: [], records: [], status: "blocked" },
          [
            testFaultIssue(
              "dashboard-table-records-test-fault",
              "Dashboard table records test fault was requested.",
              "Disable dashboardTestFaults.tableRecords and retry record loading.",
            ),
          ],
          "partial",
        ),
      );
      return;
    }
    const table = await getDashboardRecords({
      authPath: context.authPath,
      configStore: new ConfigStore({ cwd: context.configCwd }),
      limit: Number.parseInt(url.searchParams.get("limit") ?? "20", 10),
    });
    sendJson(
      response,
      table.status === "ready"
        ? dashboardOk(table, "live")
        : dashboardPartial(table, table.issues, "missing"),
    );
    return;
  }

  sendJson(
    response,
    dashboardError(
      {
        code: "dashboard-route-not-found",
        message: `No dashboard route matches ${request.method} ${url.pathname}.`,
        remediation: "Use one of the documented dashboard API routes.",
      },
      404,
      "missing",
    ),
  );
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

function sendText(
  response: ServerResponse,
  body: string,
  contentType: string,
): void {
  response.writeHead(200, {
    "cache-control": "no-store",
    "content-type": contentType,
  });
  response.end(body);
}

async function readVendorAsset(relativePath: string): Promise<string> {
  return readFile(join(process.cwd(), "node_modules", relativePath), "utf8");
}

function sendJson(
  response: ServerResponse,
  envelope:
    | ReturnType<typeof dashboardOk>
    | ReturnType<typeof dashboardPartial>
    | DashboardErrorEnvelope,
): void {
  if ("body" in envelope) {
    response.writeHead(envelope.statusCode, {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    });
    response.end(`${JSON.stringify(envelope.body)}\n`);
    return;
  }
  response.writeHead(200, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  });
  response.end(`${JSON.stringify(envelope)}\n`);
}

function testFaultIssue(
  code: string,
  message: string,
  remediation: string,
): Issue {
  return { code, message, remediation };
}

function publishDashboardRouteEvent(
  context: DashboardRouteContext,
  input: {
    changedSurfaces: DashboardSurface[];
    command: string;
    phase: "started" | "completed";
    status: "running" | "ok";
    trigger: "dashboard";
  },
): void {
  context.liveServer?.acceptCommandEvent({
    changedSurfaces: input.changedSurfaces,
    command: input.command,
    commandRunId: `route_${randomUUID()}`,
    dataSource: "live",
    durationMs: input.phase === "completed" ? 0 : null,
    evidenceCount: 0,
    finishedAt: input.phase === "completed" ? new Date().toISOString() : null,
    issues: [],
    phase: input.phase,
    startedAt: new Date().toISOString(),
    status: input.status,
    trigger: input.trigger,
  });
}
