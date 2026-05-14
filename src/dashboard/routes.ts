import type { IncomingMessage, ServerResponse } from "node:http";

import { AuthStore } from "../config/auth-store.js";
import { checkReadiness } from "../config/readiness.js";
import { ConfigStore } from "../config/store.js";
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
  configDraftInputSchema,
  playgroundRunRequestSchema,
  type DashboardBinding,
} from "./schemas.js";
import { getDashboardRecords, getDashboardSchema } from "./table-service.js";

export interface DashboardRouteContext {
  auditPath: string;
  authPath: string;
  binding: DashboardBinding;
  configCwd?: string;
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
    sendText(response, dashboardHtml(), "text/html; charset=utf-8");
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

  if (url.pathname === "/api/status" && request.method === "GET") {
    const configStore = new ConfigStore({ cwd: context.configCwd });
    const authStore = new AuthStore(context.authPath);
    const readiness = await checkReadiness("dashboard", {
      authStore,
      bootstrapInstalled: true,
      configStore,
    });
    sendJson(
      response,
      dashboardOk({
        binding: context.binding,
        dashboardLoginRequired: false,
        localOnly:
          context.binding.host === "127.0.0.1" ||
          context.binding.host === "localhost",
        nextSafeActions: [
          readiness.nextSafeCommand ?? "lark-bitable dashboard",
        ],
        overview: {
          auth: await projectAuthState(authStore),
          mode: {
            active: readiness.activeMode ?? null,
            source: readiness.modeSource,
          },
          readiness,
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
    const draft = configDraftInputSchema.parse(await readJson(request));
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
    return;
  }

  if (url.pathname === "/api/auth/login/start" && request.method === "POST") {
    const body = (await readJson(request).catch(() => ({}))) as {
      openBrowser?: boolean;
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
          timeoutMs: body.timeoutMs,
        }),
      ),
    );
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
