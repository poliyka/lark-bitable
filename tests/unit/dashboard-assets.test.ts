import { createContext, Script } from "node:vm";

import { describe, expect, it } from "vitest";

import {
  dashboardAppScript,
  dashboardHtml,
  dashboardStyles,
} from "../../src/dashboard/assets.js";
import { dashboardLanguageCatalog } from "../../src/dashboard/i18n.js";

class TestClassList {
  values = new Set<string>();

  toggle(value: string, force?: boolean): boolean {
    const enabled = force ?? !this.values.has(value);
    if (enabled) this.values.add(value);
    else this.values.delete(value);
    return enabled;
  }

  add(...values: string[]): void {
    for (const value of values) this.values.add(value);
  }

  remove(...values: string[]): void {
    for (const value of values) this.values.delete(value);
  }
}

class TestElement {
  classList = new TestClassList();
  className = "";
  dataset: Record<string, string> = {};
  disabled = false;
  innerHTML = "";
  textContent = "";
  value = "";

  constructor(readonly id = "") {}

  addEventListener(): void {}

  querySelector(): TestElement | null {
    return null;
  }

  querySelectorAll(): TestElement[] {
    return [];
  }

  setAttribute(name: string, value: string): void {
    if (name.startsWith("data-")) {
      this.dataset[name.slice(5)] = value;
    }
  }
}

class TestDocument {
  readonly auditRows: TestElement[] = [];
  readonly researchFiles: TestElement[] = [];
  readonly flowSteps: TestElement[] = [];
  readonly schemaFieldSelects: TestElement[] = [];
  private readonly elements = new Map<string, TestElement>();

  getElementById(id: string): TestElement {
    let element = this.elements.get(id);
    if (!element) {
      element = new TestElement(id);
      this.elements.set(id, element);
    }
    return element;
  }

  querySelectorAll(selector: string): TestElement[] {
    if (selector === ".audit-row") return this.auditRows;
    if (selector === ".md-file") return this.researchFiles;
    if (selector === "#login-flow-steps .flow-step") return this.flowSteps;
    if (selector === "[data-schema-field]") return this.schemaFieldSelects;
    return [];
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function jsonResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function createDashboardClientHarness(
  fetchImpl: (
    path: string,
    options?: Record<string, unknown>,
  ) => Promise<unknown>,
) {
  const document = new TestDocument();
  for (const id of [
    "audit-detail-title",
    "audit-detail-status",
    "audit-detail",
    "research-path",
    "research-meta",
    "research-body",
  ]) {
    document.getElementById(id);
  }

  const script = dashboardAppScript();
  const initIndex = script.lastIndexOf("bindEvents();applyLanguage");
  expect(initIndex).toBeGreaterThan(0);
  const testableScript =
    script.slice(0, initIndex) +
    "globalThis.__dashboardTestHooks={state,loadAuditDetail,loadResearchDetail};";
  const context = createContext({
    URLSearchParams,
    document,
    fetch: fetchImpl,
    globalThis: {},
  });

  new Script(testableScript).runInContext(context);
  const hooks = (
    context.globalThis as {
      __dashboardTestHooks: {
        state: {
          auditDetail: unknown;
          researchDetail: unknown;
          selectedReportId: string | null;
        };
        loadAuditDetail: (id: string) => Promise<void>;
        loadResearchDetail: (id: string) => Promise<void>;
      };
    }
  ).__dashboardTestHooks;

  return { document, hooks };
}

function createTimerController() {
  const pending: Array<() => void> = [];
  return {
    setTimeout(callback: () => void): number {
      pending.push(callback);
      return pending.length;
    },
    runNext(): void {
      const callback = pending.shift();
      if (!callback) {
        throw new Error("no pending timer");
      }
      callback();
    },
    pendingCount(): number {
      return pending.length;
    },
  };
}

function createAuthDashboardClientHarness(
  fetchImpl: (
    path: string,
    options?: Record<string, unknown>,
  ) => Promise<unknown>,
) {
  const document = new TestDocument();
  const timers = createTimerController();
  const openedUrls: string[] = [];

  for (const id of [
    "auth-scopes",
    "auth-url",
    "login-flow-status",
    "auth-state-pill",
    "auth-state-list",
    "binding-status",
    "binding-host",
    "binding-port",
    "readiness-card",
    "readiness-ring",
    "readiness-summary",
    "readiness-pills",
    "next-command",
    "source-ds",
    "source-kv",
    "auth-pill",
    "auth-kv",
    "mode-pill",
    "mode-kv",
    "recent-activity",
    "mapping-list",
  ]) {
    document.getElementById(id);
  }
  document.getElementById("auth-scopes").value = "bitable:app:readonly";
  for (let index = 0; index < 4; index += 1) {
    document.flowSteps.push(new TestElement(`flow-step-${index + 1}`));
  }

  const script = dashboardAppScript();
  const initIndex = script.lastIndexOf("bindEvents();applyLanguage");
  expect(initIndex).toBeGreaterThan(0);
  const testableScript =
    script.slice(0, initIndex) +
    "globalThis.__dashboardTestHooks={state,startLogin,logoutAuth};";
  const context = createContext({
    document,
    fetch: fetchImpl,
    setTimeout: (callback: () => void) => timers.setTimeout(callback),
    window: {
      open: (url: string) => {
        openedUrls.push(url);
      },
    },
    globalThis: {},
  });

  new Script(testableScript).runInContext(context);
  const hooks = (
    context.globalThis as {
      __dashboardTestHooks: {
        state: {
          status: unknown;
        };
        startLogin: () => Promise<void>;
        logoutAuth: () => Promise<void>;
      };
    }
  ).__dashboardTestHooks;

  return { document, hooks, timers, openedUrls };
}

function createConfigDashboardClientHarness(
  fetchImpl: (
    path: string,
    options?: Record<string, unknown>,
  ) => Promise<unknown>,
) {
  const document = new TestDocument();
  const configForm = document.getElementById("config-form") as TestElement & {
    elements: { namedItem: (name: string) => TestElement | null };
    formEntries: Array<[string, string]>;
  };

  for (const id of [
    "config-output",
    "schema-discovery",
    "statusField",
    "priorityField",
    "titleField",
    "ownerField",
  ]) {
    const element = document.getElementById(id);
    if (id !== "config-output" && id !== "schema-discovery") {
      element.dataset.schemaField = id;
      document.schemaFieldSelects.push(element);
    }
  }

  configForm.formEntries = [];
  configForm.elements = {
    namedItem: (name: string) => document.getElementById(name),
  };

  const script = dashboardAppScript();
  const initIndex = script.lastIndexOf("bindEvents();applyLanguage");
  expect(initIndex).toBeGreaterThan(0);
  const testableScript =
    script.slice(0, initIndex) +
    "globalThis.__dashboardTestHooks={state,discoverSchema,handleLiveEnvelope};";
  const context = createContext({
    FormData: class {
      constructor(
        private readonly form: TestElement & {
          formEntries?: Array<[string, string]>;
        },
      ) {}

      entries(): IterableIterator<[string, string]> {
        return (this.form.formEntries ?? [])[Symbol.iterator]();
      }
    },
    document,
    fetch: fetchImpl,
    globalThis: {},
  });

  new Script(testableScript).runInContext(context);
  const hooks = (
    context.globalThis as {
      __dashboardTestHooks: {
        discoverSchema: () => Promise<void>;
        handleLiveEnvelope: (envelope: unknown) => Promise<void>;
        state: {
          configDirty: boolean;
          page: string;
        };
      };
    }
  ).__dashboardTestHooks;

  return { document, hooks };
}

function createLiveDashboardClientHarness(
  fetchImpl: (
    path: string,
    options?: Record<string, unknown>,
  ) => Promise<unknown>,
) {
  const document = new TestDocument();
  for (const id of [
    "binding-status",
    "binding-host",
    "binding-port",
    "readiness-card",
    "readiness-ring",
    "readiness-summary",
    "readiness-pills",
    "next-command",
    "source-ds",
    "source-kv",
    "auth-pill",
    "auth-kv",
    "mode-pill",
    "mode-kv",
    "recent-activity",
    "mapping-list",
    "audit-count",
    "audit-entry-count",
    "audit-entries",
    "audit-detail-title",
    "audit-detail-status",
    "audit-detail",
    "audit-filter-form",
    "live-connection-state",
    "live-activity-count",
    "live-activity-feed",
    "research-search",
    "research-count",
    "research-files",
    "research-path",
    "research-meta",
    "research-body",
  ]) {
    document.getElementById(id);
  }

  const script = dashboardAppScript();
  const initIndex = script.lastIndexOf("bindEvents();applyLanguage");
  expect(initIndex).toBeGreaterThan(0);
  const testableScript =
    script.slice(0, initIndex) +
    "globalThis.__dashboardTestHooks={state,handleLiveEnvelope,connectLiveUpdates};";
  const context = createContext({
    FormData: class {
      constructor(
        private readonly form: TestElement & {
          formEntries?: Array<[string, string]>;
        },
      ) {}

      entries(): IterableIterator<[string, string]> {
        return (this.form.formEntries ?? [])[Symbol.iterator]();
      }
    },
    URLSearchParams,
    document,
    fetch: fetchImpl,
    globalThis: {},
  });

  new Script(testableScript).runInContext(context);
  const hooks = (
    context.globalThis as {
      __dashboardTestHooks: {
        connectLiveUpdates: () => void;
        handleLiveEnvelope: (envelope: unknown) => Promise<void>;
        state: {
          auditDetail: { id?: string } | null;
          live: {
            activity: unknown[];
            connectionState: string;
          };
          page: string;
          researchDetail: unknown;
          selectedReportId: string | null;
        };
      };
    }
  ).__dashboardTestHooks;

  return { document, hooks };
}

describe("dashboard design assets", () => {
  it("renders shell binding placeholders from the supplied server binding", () => {
    const html = dashboardHtml({
      host: "127.0.0.1",
      origin: "http://127.0.0.1:58201",
      port: 58201,
      requestedPort: 48731,
      startedAt: "2026-05-14T11:00:00.000Z",
      status: "ready",
    });

    expect(html).toContain('id="binding-status">ready<');
    expect(html).toContain('id="binding-host">127.0.0.1<');
    expect(html).toContain('id="binding-port">58201<');
    expect(html).not.toContain('id="binding-status">starting<');
    expect(html).not.toContain('id="binding-port">48731<');
  });

  it("renders the dashboard version supplied by the running package", () => {
    const html = dashboardHtml(undefined, "9.8.7");

    expect(html).toContain('<div class="brand-ver">v9.8.7</div>');
    expect(html).not.toContain('<div class="brand-ver">v1.0</div>');
  });

  it("serves the full design shell with seven routed pages", () => {
    const html = dashboardHtml();

    expect(html).toContain('class="app"');
    expect(html).toContain('class="sidebar"');
    expect(html).toContain('class="topbar"');
    expect(html).toContain("local only");
    expect(html).toContain("no dashboard login");
    expect(html).toContain('class="lang-toggle"');

    for (const page of [
      "overview",
      "config",
      "auth",
      "audit",
      "playground",
      "research",
      "table",
    ]) {
      expect(html).toContain(`data-page="${page}"`);
      expect(html).toContain(`id="${page}-page"`);
    }
  });

  it("associates visible labels and aria labels with dashboard form controls", () => {
    const html = dashboardHtml();
    const script = dashboardAppScript();

    for (const id of [
      "sourceUrl",
      "sourceName",
      "mode",
      "larkAppId",
      "larkAppSecret",
      "redirectUri",
      "callbackPort",
      "larkDomain",
      "scopes",
      "statusField",
      "actionableStatus",
      "priorityField",
      "titleField",
      "ownerField",
      "defaultOwner",
      "auth-scopes",
      "auth-callback-mode",
    ]) {
      expect(html).toContain(`for="${id}"`);
      expect(html).toContain(`id="${id}"`);
    }

    for (const ariaLabel of [
      "Audit text filter",
      "Audit from time",
      "Audit issue code",
      "Research report search",
      "Table record search",
    ]) {
      expect(html).toContain(`aria-label="${ariaLabel}"`);
    }

    expect(script).toContain("controlId='pg-param-'");
    expect(script).toContain("for=\"'+controlId+'\"");
  });

  it("ships the dark terminal design system from the HTML design", () => {
    const css = dashboardStyles();

    expect(css).toContain("--bg: #060708");
    expect(css).toContain("--accent: oklch(0.82 0.17 145)");
    expect(css).toContain("grid-template-columns: 252px 1fr");
    expect(css).toContain(".readiness");
    expect(css).toContain(".terminal");
    expect(css).toContain(".md-shell");
    expect(css).toContain(".pg-grid");
    expect(css).toContain(".data-tbl");
    expect(css).toContain("@media");
  });

  it("defines a site-wide responsive layout foundation for grids and data surfaces", () => {
    const html = dashboardHtml();
    const css = dashboardStyles();

    expect(css).toContain(
      ".card, .readiness, .next-cmd, .terminal, .md-shell, .md-list, .md-viewer, .pg-grid, .src-banner, .table-scroll { min-width: 0; }",
    );
    expect(css).toContain(
      ".grid-3 > *, .grid-2 > *, .grid-2-3 > *, .grid-1-2 > *, .split > *, .pg-grid > *, .md-shell > *, .src-banner > * { min-width: 0; }",
    );
    expect(css).toContain(
      ".tbl, .data-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }",
    );
    expect(css).toContain(
      ".table-scroll > .tbl, .table-scroll > .data-tbl { min-width: max-content; }",
    );
    expect(css).toContain(".terminal-body { min-width: 0;");
    expect(css).toContain("@media (max-width: 860px)");
    expect(css).toContain(
      ".table-scroll > .tbl, .table-scroll > .data-tbl { min-width: 680px; }",
    );
    expect(css).toContain(".audit-filters .card-body { overflow-x: auto; }");
    expect(html).toContain(
      '<div class="card-body no-pad"><table class="tbl"><tbody id="recent-activity">',
    );
    expect(html).toContain(
      '<div class="card-body no-pad"><table class="tbl"><tbody id="run-history">',
    );
  });

  it("keeps the audit entries and detail split stable around long detail content", () => {
    const css = dashboardStyles();

    expect(css).toContain(
      ".split { display: grid; grid-template-columns: minmax(420px, 1.35fr) minmax(0, 1fr);",
    );
    expect(css).toContain(".split > .card { min-width: 0; }");
    expect(css).toContain(
      "#audit-detail { max-height: min(720px, calc(100vh - 220px)); overflow: auto; }",
    );
    expect(css).toContain(
      ".audit-row:focus-visible td { outline: 2px solid var(--accent); outline-offset: -2px; }",
    );
    expect(css).toContain("@media (max-width: 860px)");
    expect(css).toContain(
      ".split { grid-template-columns: minmax(0, 1fr); min-height: 0; }",
    );
  });

  it("contains browser-only interaction logic for routing, language, and live APIs", () => {
    const script = dashboardAppScript();

    expect(script).toContain("localStorage");
    expect(script).toContain("lark-bitable.dashboard.lang");
    expect(script).toContain("switchPage");
    expect(script).toContain("metaKey || event.ctrlKey");
    expect(script).toContain("/api/status");
    expect(script).toContain("/api/config");
    expect(script).toContain("/api/auth/login/start");
    expect(script).toContain("/api/audit");
    expect(script).toContain("/api/playground/run");
    expect(script).toContain("/api/research");
    expect(script).toContain("/api/table/records");
    expect(script).not.toContain("/api/language");
  });

  it("keeps routed breadcrumb state independent from static language labels", () => {
    const html = dashboardHtml();
    const script = dashboardAppScript();

    expect(html).not.toContain('id="crumb-page" data-i18n=');
    expect(script).toContain("function updateCrumb");
    expect(script).toContain("window.addEventListener('hashchange'");
    expect(script).toContain("updateCrumb()");
  });

  it("binds page navigation only to interactive controls so page body clicks do not override actions", () => {
    const script = dashboardAppScript();

    expect(script).toContain("$$('button[data-page]')");
    expect(script).not.toContain("$$('[data-page]')");
  });

  it("refreshes shell binding status independently from the active deep-linked page", () => {
    const script = dashboardAppScript();

    expect(script).toContain("function renderBinding");
    expect(script).toContain("function loadShellStatus");
    expect(script).toContain("loadShellStatus().catch");
  });

  it("uses CLI-compatible playground parameters for schema, research, and write", () => {
    const script = dashboardAppScript();

    expect(script).toContain("name:'sampleLimit',label:'--sample-limit'");
    expect(script).not.toContain(
      "name:'limit',label:'--limit',type:'number',value:'20'}]},\n  {name:'list'",
    );
    expect(script).not.toContain("name:'name',label:'--name'");
    expect(script).not.toContain(
      "name:'recordId',label:'--record-id',type:'text'}]},\n  {name:'verify'",
    );
    expect(script).toContain("name:'op',label:'--op',type:'select'");
    expect(script).toContain("name:'fieldsJson',label:'--fields-json'");
  });

  it("renders selectable field mapping controls and visible schema discovery remediation", () => {
    const html = dashboardHtml();
    const script = dashboardAppScript();

    expect(html).toContain('name="statusField"');
    expect(html).toContain('data-schema-field="statusField"');
    expect(html).toContain(
      '<select class="select" id="statusField" name="statusField"',
    );
    expect(script).toContain("function updateSchemaFieldOptions");
    expect(script).toContain("renderIssues");
    expect(script).toContain("schema-discovery");
  });

  it("clears stale detail panes and preserves lists on audit/research errors", () => {
    const script = dashboardAppScript();

    expect(script).toContain("clearAuditDetail");
    expect(script).toContain("renderAuditDetailError");
    expect(script).toContain("clearResearchDetail");
    expect(script).toContain("renderResearchDetailError");
    expect(script).toContain("state.selectedReportId");
  });

  it("keeps the newest audit detail selection when older requests finish later", async () => {
    const first = createDeferred<unknown>();
    const second = createDeferred<unknown>();
    const { document, hooks } = createDashboardClientHarness((path) => {
      if (path.endsWith("/old")) return first.promise;
      if (path.endsWith("/new")) return second.promise;
      throw new Error(`unexpected path: ${path}`);
    });
    const oldRow = new TestElement();
    oldRow.dataset.id = "old";
    const newRow = new TestElement();
    newRow.dataset.id = "new";
    document.auditRows.push(oldRow, newRow);

    const oldRequest = hooks.loadAuditDetail("old");
    const newRequest = hooks.loadAuditDetail("new");
    second.resolve(
      jsonResponse({
        status: "ok",
        data: { entry: { id: "new", command: "schema", status: "ok" } },
      }),
    );
    await flushPromises();
    first.resolve(
      jsonResponse({
        status: "ok",
        data: { entry: { id: "old", command: "valid", status: "error" } },
      }),
    );
    await Promise.all([oldRequest, newRequest]);

    expect(hooks.state.auditDetail).toMatchObject({ id: "new" });
    expect(document.getElementById("audit-detail-title").textContent).toContain(
      "new",
    );
    expect(newRow.classList.values.has("selected")).toBe(true);
    expect(oldRow.classList.values.has("selected")).toBe(false);
  });

  it("clears stale audit detail state when detail loading fails", async () => {
    const { hooks } = createDashboardClientHarness(async (path) => {
      if (path.endsWith("/ok")) {
        return jsonResponse({
          status: "ok",
          data: { entry: { id: "ok", command: "schema", status: "ok" } },
        });
      }
      if (path.endsWith("/missing")) {
        return jsonResponse({
          status: "error",
          issues: [{ code: "missing-audit", message: "not found" }],
        });
      }
      throw new Error(`unexpected path: ${path}`);
    });

    await hooks.loadAuditDetail("ok");
    await hooks.loadAuditDetail("missing");

    expect(hooks.state.auditDetail).toBeNull();
  });

  it("keeps the newest research detail selection when older requests finish later", async () => {
    const first = createDeferred<unknown>();
    const second = createDeferred<unknown>();
    const { document, hooks } = createDashboardClientHarness((path) => {
      if (path.endsWith("/old-report")) return first.promise;
      if (path.endsWith("/new-report")) return second.promise;
      throw new Error(`unexpected path: ${path}`);
    });
    const oldFile = new TestElement();
    oldFile.dataset.id = "old-report";
    const newFile = new TestElement();
    newFile.dataset.id = "new-report";
    document.researchFiles.push(oldFile, newFile);

    const oldRequest = hooks.loadResearchDetail("old-report");
    const newRequest = hooks.loadResearchDetail("new-report");
    second.resolve(
      jsonResponse({
        status: "ok",
        data: {
          report: {
            reportId: "new-report",
            name: "new report",
            canonicalPath: "/tmp/new-report.json",
            selectedRecordId: "rec-new",
            evidence: [],
          },
        },
      }),
    );
    await flushPromises();
    first.resolve(
      jsonResponse({
        status: "ok",
        data: {
          report: {
            reportId: "old-report",
            name: "old report",
            canonicalPath: "/tmp/old-report.json",
            selectedRecordId: "rec-old",
            evidence: [],
          },
        },
      }),
    );
    await Promise.all([oldRequest, newRequest]);

    expect(hooks.state.selectedReportId).toBe("new-report");
    expect(hooks.state.researchDetail).toMatchObject({
      reportId: "new-report",
    });
    expect(document.getElementById("research-path").innerHTML).toContain(
      "new report",
    );
    expect(newFile.classList.values.has("selected")).toBe(true);
    expect(oldFile.classList.values.has("selected")).toBe(false);
  });

  it("clears stale research detail state when detail loading fails", async () => {
    const { hooks } = createDashboardClientHarness(async (path) => {
      if (path.endsWith("/ok-report")) {
        return jsonResponse({
          status: "ok",
          data: {
            report: {
              reportId: "ok-report",
              name: "ok report",
              canonicalPath: "/tmp/ok-report.json",
              selectedRecordId: "rec-ok",
              evidence: [],
            },
          },
        });
      }
      if (path.endsWith("/missing-report")) {
        return jsonResponse({
          status: "error",
          issues: [{ code: "missing-report", message: "not found" }],
        });
      }
      throw new Error(`unexpected path: ${path}`);
    });

    await hooks.loadResearchDetail("ok-report");
    await hooks.loadResearchDetail("missing-report");

    expect(hooks.state.selectedReportId).toBe("missing-report");
    expect(hooks.state.researchDetail).toBeNull();
  });

  it("cancels a pending login poll when logout finishes first", async () => {
    const loginPoll = createDeferred<unknown>();
    const { document, hooks, timers, openedUrls } =
      createAuthDashboardClientHarness(async (path) => {
        if (path === "/api/auth/login/start") {
          return jsonResponse({
            status: "ok",
            data: {
              flowId: "flow-1",
              status: "waiting",
              authorizationUrl:
                "https://accounts.larksuite.com/open-apis/authen/v1/authorize",
            },
          });
        }
        if (path === "/api/auth/login/flow-1") {
          return loginPoll.promise;
        }
        if (path === "/api/auth/logout") {
          return jsonResponse({
            status: "ok",
            data: { cleared: true },
          });
        }
        if (path === "/api/status") {
          return jsonResponse({
            status: "partial",
            dataSource: "file-backed",
            data: {
              binding: {
                status: "ready",
                host: "127.0.0.1",
                port: 48731,
              },
              overview: {
                readiness: {
                  status: "partial",
                  blockingIssues: [],
                  partialIssues: [],
                },
                source: {},
                auth: {
                  status: "missing",
                  scopes: [],
                  storagePath: "/tmp/auth.json",
                },
                mode: {
                  active: "developer",
                  source: "config",
                },
              },
              nextSafeActions: ["lark-bitable lark --login"],
            },
          });
        }
        if (path === "/api/audit?limit=5") {
          return jsonResponse({
            status: "ok",
            data: { entries: [] },
          });
        }
        if (path === "/api/config") {
          return jsonResponse({
            status: "ok",
            data: { draft: {} },
          });
        }
        throw new Error(`unexpected path: ${path}`);
      });

    await hooks.startLogin();

    expect(document.getElementById("login-flow-status").textContent).toBe(
      "waiting",
    );
    expect(document.flowSteps[2]?.classList.values.has("active")).toBe(true);
    expect(openedUrls).toEqual([
      "https://accounts.larksuite.com/open-apis/authen/v1/authorize",
    ]);
    expect(timers.pendingCount()).toBe(1);

    await hooks.logoutAuth();

    expect(document.getElementById("login-flow-status").textContent).toBe(
      "idle",
    );
    expect(document.flowSteps[2]?.classList.values.has("active")).toBe(false);
    expect(document.getElementById("auth-url").textContent).toBe(
      "authorization URL will appear here",
    );

    timers.runNext();
    await flushPromises();
    loginPoll.resolve(
      jsonResponse({
        status: "ok",
        data: {
          status: "waiting",
        },
      }),
    );
    await flushPromises();

    expect(document.getElementById("login-flow-status").textContent).toBe(
      "idle",
    );
    expect(document.flowSteps[2]?.classList.values.has("active")).toBe(false);
    expect(document.getElementById("auth-url").textContent).toBe(
      "authorization URL will appear here",
    );
  });

  it("surfaces blocked schema discovery remediation and replaces stale config output", async () => {
    const { document, hooks } = createConfigDashboardClientHarness(
      async (path) => {
        if (path === "/api/table/schema") {
          return jsonResponse({
            status: "partial",
            issues: [
              {
                code: "missing-auth",
                message: "Lark auth is missing.",
                remediation:
                  "Complete Lark login from the dashboard auth page.",
              },
            ],
            data: {
              status: "blocked",
              fields: [],
              issues: [],
              mappings: {},
            },
          });
        }
        throw new Error(`unexpected path: ${path}`);
      },
    );

    document.getElementById("config-output").textContent =
      '{"status":"ok","data":"config draft"}';

    await hooks.discoverSchema();

    expect(document.getElementById("config-output").textContent).toContain(
      '"status": "partial"',
    );
    expect(document.getElementById("schema-discovery").innerHTML).toContain(
      "schema-discovery",
    );
    expect(document.getElementById("schema-discovery").innerHTML).toContain(
      "missing-auth",
    );
    expect(document.getElementById("schema-discovery").innerHTML).toContain(
      "Complete Lark login from the dashboard auth page.",
    );
  });

  it("does not retain submitted app secret values in the form after save", () => {
    const script = dashboardAppScript();

    expect(script).toContain("clearSecretInput()");
    expect(script).toContain("saveConfig");
  });

  it("ships visible focus styles for every interactive dashboard control family", () => {
    const css = dashboardStyles();

    for (const selector of [
      ".btn:focus-visible",
      ".top-action:focus-visible",
      ".nav button:focus-visible",
      ".lang-toggle button:focus-visible",
      ".copy:focus-visible",
      ".link-button:focus-visible",
      ".cmd-item:focus-visible",
      ".md-file:focus-visible",
      ".tabs button:focus-visible",
      ".data-tabs button:focus-visible",
    ]) {
      expect(css).toContain(selector);
    }
  });

  it("localizes all dashboard-owned design labels in Traditional Chinese and English", () => {
    for (const key of [
      "commandPalette",
      "copy",
      "openInBrowser",
      "readinessTitle",
      "startLogin",
      "search",
      "run",
      "records",
      "schema",
      "copyPath",
      "emptyState",
      "errorState",
    ]) {
      expect(dashboardLanguageCatalog["zh-TW"][key]).toBeTruthy();
      expect(dashboardLanguageCatalog.en[key]).toBeTruthy();
    }
  });

  it("tracks live connection state and command activity without manual refresh", async () => {
    const html = dashboardHtml();
    expect(html).toContain('id="live-connection-state"');
    expect(html).toContain('id="live-activity-feed"');

    const { document, hooks } = createLiveDashboardClientHarness(
      async (path) => {
        if (path === "/api/status") {
          return jsonResponse({
            status: "ok",
            dataSource: "live",
            data: {
              binding: {
                host: "127.0.0.1",
                port: 48731,
                status: "ready",
              },
              nextSafeActions: ["lark-bitable valid --workflow dashboard"],
              overview: {
                auth: { status: "missing", scopes: [] },
                mode: { active: "Developer", source: "defaulted" },
                readiness: {
                  blockingIssues: [],
                  partialIssues: [],
                  status: "partial",
                },
                source: {},
              },
            },
          });
        }
        if (path === "/api/audit?limit=5") {
          return jsonResponse({
            status: "ok",
            data: {
              entries: [
                {
                  command: "valid",
                  durationMs: 12,
                  id: "audit-1",
                  startedAt: "2026-05-15T00:00:00.000Z",
                  status: "partial",
                },
              ],
            },
          });
        }
        if (path === "/api/config") {
          return jsonResponse({
            status: "ok",
            data: { draft: {} },
          });
        }
        if (path === "/api/audit") {
          return jsonResponse({
            status: "ok",
            data: {
              entries: [
                {
                  command: "valid",
                  durationMs: 12,
                  id: "audit-1",
                  startedAt: "2026-05-15T00:00:00.000Z",
                  status: "partial",
                },
              ],
            },
          });
        }
        throw new Error(`unexpected path: ${path}`);
      },
    );

    await hooks.handleLiveEnvelope({
      createdAt: "2026-05-15T00:00:00.000Z",
      dataSource: "live",
      eventId: "evt_connected",
      payload: {
        catchUpRequired: true,
        clientId: "client_01",
        sessionId: "dash_01",
        surfaces: ["shell", "overview"],
      },
      sequence: 1,
      type: "live.connected",
    });
    await hooks.handleLiveEnvelope({
      createdAt: "2026-05-15T00:00:01.000Z",
      dataSource: "live",
      eventId: "evt_command",
      payload: {
        changedSurfaces: ["shell", "overview", "audit"],
        command: "valid",
        commandRunId: "run_01",
        evidenceCount: 0,
        issues: [],
        phase: "started",
        status: "running",
        trigger: "terminal",
      },
      sequence: 2,
      type: "command.activity",
    });

    expect(hooks.state.live.connectionState).toBe("connected");
    expect(hooks.state.live.activity).toMatchObject([
      {
        command: "valid",
        commandRunId: "run_01",
        phase: "started",
      },
    ]);
    expect(document.getElementById("live-connection-state").textContent).toBe(
      "connected",
    );
    expect(document.getElementById("live-activity-feed").innerHTML).toContain(
      "valid",
    );
  });

  it("ignores out-of-order live envelopes once a newer sequence has been applied", async () => {
    const { document, hooks } = createLiveDashboardClientHarness(async () =>
      jsonResponse({
        status: "ok",
        data: {
          binding: { status: "ready" },
          nextSafeActions: ["lark-bitable dashboard"],
          overview: {},
        },
      }),
    );

    await hooks.handleLiveEnvelope({
      createdAt: "2026-05-15T00:00:05.000Z",
      dataSource: "stale",
      eventId: "evt_stale",
      payload: {
        reason: "heartbeat missed",
      },
      sequence: 5,
      type: "live.stale",
    });
    await hooks.handleLiveEnvelope({
      createdAt: "2026-05-15T00:00:01.000Z",
      dataSource: "live",
      eventId: "evt_old",
      payload: {
        catchUpRequired: false,
        clientId: "client_01",
        sessionId: "dash_01",
        surfaces: ["shell", "overview"],
      },
      sequence: 1,
      type: "live.connected",
    });

    expect(hooks.state.live.connectionState).toBe("stale");
    expect(document.getElementById("live-connection-state").textContent).toBe(
      "stale",
    );
  });

  it("falls back to manual refresh state when WebSocket support is unavailable", () => {
    const { document, hooks } = createLiveDashboardClientHarness(async () =>
      jsonResponse({
        status: "ok",
        data: {
          binding: { status: "ready" },
          nextSafeActions: ["lark-bitable dashboard"],
          overview: {},
        },
      }),
    );

    hooks.connectLiveUpdates();

    expect(hooks.state.live.connectionState).toBe("fallback");
    expect(document.getElementById("live-connection-state").textContent).toBe(
      "fallback",
    );
  });

  it("keeps an unavailable audit selection visible instead of jumping to the first entry during live refresh", async () => {
    const requestedPaths: string[] = [];
    const { document, hooks } = createLiveDashboardClientHarness(
      async (path) => {
        requestedPaths.push(path);
        if (path === "/api/audit?") {
          return jsonResponse({
            status: "ok",
            data: {
              entries: [
                {
                  command: "valid",
                  durationMs: 12,
                  id: "audit-1",
                  startedAt: "2026-05-15T00:00:00.000Z",
                  status: "partial",
                },
              ],
            },
          });
        }
        if (path === "/api/audit/audit-1") {
          throw new Error("should not replace the missing audit selection");
        }
        throw new Error(`unexpected path: ${path}`);
      },
    );

    hooks.state.page = "audit";
    hooks.state.auditDetail = { id: "audit-missing" };

    await hooks.handleLiveEnvelope({
      createdAt: "2026-05-15T00:00:05.000Z",
      dataSource: "file-backed",
      eventId: "evt_audit",
      payload: {
        reason: "audit updated",
        resources: ["/api/audit"],
        surfaces: ["audit"],
      },
      sequence: 6,
      type: "state.invalidate",
    });

    expect(requestedPaths).toEqual(["/api/audit?"]);
    expect(document.getElementById("audit-detail-title").textContent).toContain(
      "audit-missin",
    );
    expect(document.getElementById("audit-detail-status").innerHTML).toContain(
      "error",
    );
    expect(document.getElementById("audit-detail").innerHTML).toContain(
      "audit-detail-unavailable",
    );
  });

  it("keeps an unavailable research selection visible instead of jumping to another report during live refresh", async () => {
    const requestedPaths: string[] = [];
    const { document, hooks } = createLiveDashboardClientHarness(
      async (path) => {
        requestedPaths.push(path);
        if (path === "/api/research") {
          return jsonResponse({
            status: "ok",
            data: {
              reports: [
                {
                  createdAt: "2026-05-15T00:00:00.000Z",
                  name: "other-report",
                  reportId: "report-1",
                  risks: [],
                  selectedRecordId: "recLogin",
                },
              ],
              unavailableReports: [],
              researchDir: "~/.lark-bitable/research",
            },
          });
        }
        if (path === "/api/research/report-1") {
          throw new Error("should not replace the missing research selection");
        }
        throw new Error(`unexpected path: ${path}`);
      },
    );

    hooks.state.page = "research";
    hooks.state.selectedReportId = "report-missing";

    await hooks.handleLiveEnvelope({
      createdAt: "2026-05-15T00:00:06.000Z",
      dataSource: "file-backed",
      eventId: "evt_research",
      payload: {
        reason: "research updated",
        resources: ["/api/research"],
        surfaces: ["research"],
      },
      sequence: 7,
      type: "state.invalidate",
    });

    expect(requestedPaths).toEqual(["/api/research"]);
    expect(document.getElementById("research-path").innerHTML).toContain(
      "report-missing",
    );
    expect(document.getElementById("research-meta").innerHTML).toContain(
      "error",
    );
    expect(document.getElementById("research-body").innerHTML).toContain(
      "research-detail-unavailable",
    );
  });

  it("preserves unsaved config draft fields during live config invalidation", async () => {
    const { document, hooks } = createConfigDashboardClientHarness(
      async (path) => {
        if (path === "/api/config") {
          return jsonResponse({
            status: "ok",
            data: {
              draft: {
                sourceName: "stored source",
              },
            },
          });
        }
        throw new Error(`unexpected path: ${path}`);
      },
    );

    hooks.state.page = "config";
    hooks.state.configDirty = true;
    document.getElementById("sourceName").value = "unsaved source";

    await hooks.handleLiveEnvelope({
      createdAt: "2026-05-15T00:00:05.000Z",
      dataSource: "file-backed",
      eventId: "evt_config",
      payload: {
        reason: "configure completed",
        resources: ["/api/config"],
        surfaces: ["config"],
      },
      sequence: 5,
      type: "state.invalidate",
    });

    expect(document.getElementById("sourceName").value).toBe("unsaved source");
  });
});
