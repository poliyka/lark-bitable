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
  textContent = "";
  value = "";
  private attributes = new Map<string, string>();
  private childSelectors = new Map<string, TestElement>();
  private html = "";
  private listeners = new Map<string, Array<(event: unknown) => unknown>>();

  constructor(readonly id = "") {}

  get innerHTML(): string {
    return this.html;
  }

  set innerHTML(value: string) {
    this.html = value;
  }

  addEventListener(
    eventName: string,
    listener: (event: unknown) => unknown,
  ): void {
    const listeners = this.listeners.get(eventName) ?? [];
    listeners.push(listener);
    this.listeners.set(eventName, listeners);
  }

  async click(): Promise<void> {
    const event = {
      currentTarget: this,
      preventDefault() {},
      stopPropagation() {},
      target: this,
    };
    for (const listener of this.listeners.get("click") ?? []) {
      await listener(event);
    }
  }

  querySelector(selector: string): TestElement | null {
    return this.childSelectors.get(selector) ?? null;
  }

  querySelectorAll(selector: string): TestElement[] {
    if (selector === "[data-repeat-param]")
      return parseRepeatControls(this.html);
    if (selector === "[data-repeat-row]") {
      return (
        this.childSelectors
          .get("__repeatRows__")
          ?.querySelectorAll("__items__") ?? []
      );
    }
    if (selector === "[data-repeat-value]") {
      return (this.querySelectorAll("[data-repeat-row]") ?? [])
        .map((row) => row.querySelector("[data-repeat-value]"))
        .filter((input): input is TestElement => Boolean(input));
    }
    if (selector === "__items__") {
      return this.childSelectors.has("__items__")
        ? JSON.parse(this.childSelectors.get("__items__")?.value ?? "[]").map(
            (item: string) => repeatRowFromEncoded(item),
          )
        : [];
    }
    return [];
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
    if (name.startsWith("data-")) {
      this.dataset[name.slice(5)] = value;
    }
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setChild(selector: string, element: TestElement): void {
    this.childSelectors.set(selector, element);
  }
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function createValuedElement(value: string): TestElement {
  const element = new TestElement();
  element.value = decodeHtmlAttribute(value);
  return element;
}

function repeatRowFromEncoded(encoded: string): TestElement {
  const [kind, ...values] = JSON.parse(encoded) as string[];
  if (kind === "repeat-list") {
    const row = new TestElement();
    row.setChild("[data-repeat-value]", createValuedElement(values[0] ?? ""));
    return row;
  }
  if (kind === "filter-list") {
    const row = new TestElement();
    row.setChild("[data-filter-field]", createValuedElement(values[0] ?? ""));
    row.setChild(
      "[data-filter-operator]",
      createValuedElement(values[1] ?? ""),
    );
    row.setChild("[data-filter-value]", createValuedElement(values[2] ?? ""));
    return row;
  }
  const row = new TestElement();
  row.setChild("[data-field-key]", createValuedElement(values[0] ?? ""));
  row.setChild("[data-field-value]", createValuedElement(values[1] ?? ""));
  return row;
}

function repeatRowsContainer(rows: string[][]): TestElement {
  const container = new TestElement();
  const encodedRows = rows.map((row) => JSON.stringify(JSON.stringify(row)));
  container.setChild(
    "__items__",
    createValuedElement(`[${encodedRows.join(",")}]`),
  );
  return container;
}

function parseRepeatControls(html: string): TestElement[] {
  const controls: TestElement[] = [];
  const controlRegex =
    /<div class="repeat-control" data-repeat-param="([^"]+)" data-repeat-kind="([^"]+)">([\s\S]*?)<button type="button" class="btn btn-ghost btn-xs" data-add-row/g;
  for (const match of html.matchAll(controlRegex)) {
    const [, name = "", kind = "", body = ""] = match;
    const control = new TestElement();
    control.dataset.repeatParam = decodeHtmlAttribute(name);
    control.dataset.repeatKind = decodeHtmlAttribute(kind);
    const rows: string[][] = [];
    if (kind === "repeat-list") {
      for (const row of body.matchAll(/data-repeat-value value="([^"]*)"/g)) {
        rows.push(["repeat-list", row[1] ?? ""]);
      }
    } else if (kind === "filter-list") {
      const rowRegex =
        /data-filter-field placeholder="field" value="([^"]*)"[\s\S]*?<option ([^>]*)>equals<\/option><option ([^>]*)>contains<\/option>[\s\S]*?data-filter-value placeholder="value" value="([^"]*)"/g;
      for (const row of body.matchAll(rowRegex)) {
        rows.push([
          "filter-list",
          row[1] ?? "",
          String(row[3] ?? "").includes("selected") ? "contains" : "equals",
          row[4] ?? "",
        ]);
      }
    } else if (kind === "field-map") {
      const rowRegex =
        /data-field-key placeholder="field" value="([^"]*)"[\s\S]*?data-field-value placeholder="value" value="([^"]*)"/g;
      for (const row of body.matchAll(rowRegex)) {
        rows.push(["field-map", row[1] ?? "", row[2] ?? ""]);
      }
    }
    control.setChild("__repeatRows__", repeatRowsContainer(rows));
    controls.push(control);
  }
  return controls;
}

class TestDocument {
  readonly auditRows: TestElement[] = [];
  readonly authScopePresetButtons: TestElement[] = [];
  readonly responseTabButtons: TestElement[] = [];
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

  addEventListener(): void {}

  querySelectorAll(selector: string): TestElement[] {
    if (selector === ".audit-row") return this.auditRows;
    if (selector === "[data-auth-scope-preset]")
      return this.authScopePresetButtons;
    if (selector === "#response-tabs button") return this.responseTabButtons;
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
    "auth-logout",
    "auth-start",
    "auth-open",
    "auth-scope-list",
    "auth-url",
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
  for (const preset of ["readonly", "writable"]) {
    const button = document.getElementById(`auth-scope-${preset}`);
    button.dataset.authScopePreset = preset;
    document.authScopePresetButtons.push(button);
  }
  for (let index = 0; index < 4; index += 1) {
    document.flowSteps.push(new TestElement(`flow-step-${index + 1}`));
  }

  const script = dashboardAppScript();
  const initIndex = script.lastIndexOf("bindEvents();applyLanguage");
  expect(initIndex).toBeGreaterThan(0);
  const testableScript =
    script.slice(0, initIndex) +
    "globalThis.__dashboardTestHooks={state,bindEvents,loadAuth,startLogin,logoutAuth};";
  const context = createContext({
    document,
    fetch: fetchImpl,
    setTimeout: (callback: () => void) => timers.setTimeout(callback),
    window: {
      addEventListener: () => {},
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
        bindEvents: () => void;
        loadAuth: () => Promise<void>;
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
    "globalThis.__dashboardTestHooks={state,handleLiveEnvelope,connectLiveUpdates,loadAuditDetail};";
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
        loadAuditDetail: (id: string) => Promise<void>;
        state: {
          auditDetail: { id?: string } | null;
          live: {
            connectionState: string;
          };
          page: string;
          researchDetail: unknown;
          selectedAuditId: string | null;
          selectedReportId: string | null;
        };
      };
    }
  ).__dashboardTestHooks;

  return { document, hooks };
}

function createPlaygroundControlHarness() {
  const document = new TestDocument();
  for (const id of [
    "cmd-list",
    "params-title",
    "command-safety",
    "playground-form",
    "cmd-preview-text",
    "playground-output",
    "playground-response-pills",
    "response-title",
    "run-history",
    "playground-run",
    "response-tabs",
  ]) {
    document.getElementById(id);
  }
  for (const tabName of ["structured", "human", "audit"]) {
    const tab = new TestElement(`response-tab-${tabName}`);
    tab.dataset.responseTab = tabName;
    document.responseTabButtons.push(tab);
  }

  const script = dashboardAppScript();
  const initIndex = script.lastIndexOf("bindEvents();applyLanguage");
  expect(initIndex).toBeGreaterThan(0);
  const testableScript =
    script.slice(0, initIndex) +
    "globalThis.__dashboardTestHooks={state,renderParamForm,addPlaygroundRow,clearRunHistory,renderResponse,renderRunHistory,setPlaygroundRunning,runPlayground,setCommandRunState:(command,lastRun,history)=>{state.commandRuns[command]={lastRun,history};state.lastRun=lastRun;state.runHistory=history;}};";
  const context = createContext({
    FormData: class {
      entries(): IterableIterator<[string, string]> {
        return [][Symbol.iterator]();
      }
    },
    document,
    fetch: async () =>
      jsonResponse({
        status: "ok",
        data: {
          run: {
            command: "valid",
            humanOutput: "done",
          },
        },
      }),
    globalThis: {},
  });

  new Script(testableScript).runInContext(context);
  const hooks = (
    context.globalThis as {
      __dashboardTestHooks: {
        addPlaygroundRow: (paramName: string) => void;
        clearRunHistory: () => void;
        renderResponse: () => void;
        renderRunHistory: () => void;
        renderParamForm: () => void;
        runPlayground: () => Promise<void>;
        setPlaygroundRunning: (command: string, running: boolean) => void;
        setCommandRunState: (
          command: string,
          lastRun: unknown,
          history: unknown[],
        ) => void;
        state: {
          command: string;
          commandDrafts: Record<string, unknown>;
        };
      };
    }
  ).__dashboardTestHooks;

  return { document, hooks };
}

function countOccurrences(value: string, needle: string): number {
  return value.split(needle).length - 1;
}

function repeatRowCountForParam(value: string, paramName: string): number {
  return (
    parseRepeatControls(value)
      .find((control) => control.dataset.repeatParam === paramName)
      ?.querySelectorAll("[data-repeat-row]").length ?? 0
  );
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

  it("renders auth scope presets and removes the unused callback mode control", () => {
    const html = dashboardHtml();

    expect(html).toContain('data-auth-scope-preset="readonly"');
    expect(html).toContain('data-auth-scope-preset="writable"');
    expect(html).toContain('class="scope-switch readonly"');
    expect(html).toContain('id="auth-scope-list"');
    expect(html).not.toContain('id="auth-scopes"');
    expect(html).not.toContain("Requested Scopes");
    expect(html).not.toContain('id="auth-callback-mode"');
    expect(html).not.toContain("Callback Mode");
  });

  it("keeps dashboard scope copy aligned with README login examples", () => {
    const html = dashboardHtml();
    const script = dashboardAppScript();

    expect(html).toContain('placeholder="bitable:app:readonly"');
    expect(html).not.toContain(
      'placeholder="bitable:app:readonly bitable:app"',
    );
    expect(script).toContain(
      "const AUTH_SCOPE_PRESETS={readonly:['bitable:app:readonly'],writable:['bitable:app']};",
    );
  });

  it("ships the dark terminal design system from the HTML design", () => {
    const css = dashboardStyles();
    const html = dashboardHtml();
    const script = dashboardAppScript();

    expect(css).toContain("--bg: #060708");
    expect(css).toContain("--accent: oklch(0.82 0.17 145)");
    expect(css).toContain("grid-template-columns: 252px 1fr");
    expect(css).toContain(".readiness");
    expect(css).toContain(".terminal");
    expect(css).toContain(".md-shell");
    expect(css).toContain(".pg-grid");
    expect(css).toContain(".data-tbl");
    expect(css).toContain("@media");
    expect(css).toContain(".terminal-textarea");
    expect(html).toContain('data-copy-target="config-output"');
    expect(html).toContain('data-copy-target="playground-output"');
    expect(script).toContain('class="terminal textarea-terminal"');
    expect(script).toContain('class="terminal-textarea"');
    expect(script).toContain(
      "copyText('value' in target?target.value:target.textContent)",
    );
  });

  it("defines a site-wide responsive layout foundation for grids and data surfaces", () => {
    const html = dashboardHtml();
    const css = dashboardStyles();

    expect(css).toContain(
      ".card, .readiness, .next-cmd, .terminal, .md-shell, .md-list, .md-viewer, .pg-grid, .src-banner, .table-scroll { min-width: 0; }",
    );
    expect(css).toContain(
      ".grid-3 > *, .grid-2 > *, .grid-1-2 > *, .split > *, .pg-grid > *, .md-shell > *, .src-banner > * { min-width: 0; }",
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
    expect(css).toContain(
      ".audit-table { border-collapse: separate; border-spacing: 0 8px;",
    );
    expect(css).toContain(
      ".audit-table th + th, .audit-table td + td { border-left: 8px solid var(--surface); }",
    );
    expect(css).toContain(".audit-filters { margin-bottom: 16px; }");
    expect(css).toContain(
      "*::-webkit-scrollbar-thumb { background: color-mix(in oklch, var(--line-2), var(--muted) 35%);",
    );
    expect(html).toContain(
      '<div class="card-body no-pad"><table class="tbl"><tbody id="recent-activity">',
    );
    expect(html).toContain('<table class="tbl audit-table">');
    expect(html).toContain(
      '<div class="card-body no-pad"><table class="tbl"><tbody id="run-history">',
    );
  });

  it("places overview recent activity above source cards as a full-width row", () => {
    const html = dashboardHtml();

    const recentIndex = html.indexOf('<div class="card overview-recent-card">');
    const sourceIndex = html.indexOf("<h3>Source · Base</h3>");
    const fieldMappingsIndex = html.indexOf("<h3>Field Mappings</h3>");

    expect(recentIndex).toBeGreaterThan(0);
    expect(sourceIndex).toBeGreaterThan(recentIndex);
    expect(fieldMappingsIndex).toBeGreaterThan(sourceIndex);
    expect(html).not.toContain('class="grid-2-3"');
  });

  it("keeps the topbar focused on navigation and explicit WebSocket state", () => {
    const html = dashboardHtml();
    const script = dashboardAppScript();

    expect(html).not.toContain('id="refresh-current"');
    expect(html).toContain('id="live-connection-state">WebSocket · connecting');
    expect(script).not.toContain("$('refresh-current')");
    expect(script).toContain("node.textContent='WebSocket · '+status");
  });

  it("offers every audit command and initializes a human date-time range picker", () => {
    const html = dashboardHtml();
    const script = dashboardAppScript();

    expect(html).toContain('id="audit-command-filter"');
    expect(html).toContain('id="audit-from-picker"');
    expect(html).toContain('id="audit-to-picker"');
    expect(html).toContain('name="from" id="audit-from"');
    expect(html).toContain('name="to" id="audit-to"');
    expect(html).toContain("/assets/vendor/flatpickr.min.css");
    expect(html).toContain("/assets/vendor/flatpickr.min.js");
    expect(script).toContain("const AUDIT_COMMAND_OPTIONS=[");
    for (const command of [
      "configure",
      "dashboard",
      "doctor",
      "filter",
      "get",
      "help",
      "lark",
      "list",
      "login",
      "logout",
      "media download",
      "research",
      "schema",
      "search",
      "triage",
      "valid",
      "verify",
      "write",
    ]) {
      expect(script).toContain(`'${command}'`);
    }
    expect(script).toContain("function renderAuditCommandFilter");
    expect(script).toContain("renderAuditCommandFilter(state.auditEntries)");
    expect(script).toContain("function initAuditDateTimePickers");
    expect(script).toContain("selectedDates[0].toISOString()");
    expect(script).toContain("enableTime:true");
    expect(script).toContain("time_24hr:true");
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
    expect(script).toContain("name:'title',label:'--title'");
    expect(script).toContain(
      "name:'originalDetails',label:'--original-detail'",
    );
    expect(script).not.toContain(
      "name:'limit',label:'--limit',type:'number',value:'20'}]},\n  {name:'list'",
    );
    expect(script).not.toContain("name:'name',label:'--name'");
    expect(script).not.toContain(
      "name:'recordId',label:'--record-id',type:'text'}]},\n  {name:'verify'",
    );
    expect(script).toContain("name:'op',label:'--op',type:'select'");
    expect(script).not.toContain("type:'textarea',value:'{}'");
    expect(script).toContain("name:'fields',label:'fields'");
  });

  it("renders richer playground controls for repeatable filters and write field rows", () => {
    const script = dashboardAppScript();

    expect(script).toContain("name:'filters',label:'filters'");
    expect(script).toContain("type:'filter-list'");
    expect(script).toContain("name:'fields',label:'fields'");
    expect(script).toContain("type:'field-map'");
    expect(script).toContain("data-repeat-param");
    expect(script).toContain("addPlaygroundRow");
    expect(script).toContain("collectFilterRows");
    expect(script).toContain("collectFieldMapRows");
    expect(script).toContain("duplicate-field-key");
    expect(script).toContain("name:'title',label:'--title'");
    expect(script).toContain(
      "name:'originalDetails',label:'--original-detail'",
    );
    expect(script).toContain("name:'assumptions',label:'--assumption'");
    expect(script).toContain("name:'likelyCauses',label:'--likely-cause'");
    expect(script).toContain(
      "name:'recommendedFixes',label:'--recommended-fix'",
    );
    expect(script).toContain("name:'risks',label:'--risk'");
    expect(script).toContain("name:'nextActions',label:'--next-action'");
  });

  it("adds visible playground rows when repeat controls start blank", () => {
    const { document, hooks } = createPlaygroundControlHarness();
    const form = document.getElementById("playground-form");

    hooks.state.command = "filter";
    hooks.renderParamForm();
    expect(countOccurrences(form.innerHTML, "data-repeat-row")).toBe(1);
    hooks.addPlaygroundRow("filters");
    expect(countOccurrences(form.innerHTML, "data-repeat-row")).toBe(2);

    hooks.state.command = "research";
    hooks.renderParamForm();
    expect(countOccurrences(form.innerHTML, "data-repeat-row")).toBe(7);
    hooks.addPlaygroundRow("evidence");
    expect(countOccurrences(form.innerHTML, "data-repeat-row")).toBe(8);

    hooks.state.command = "write";
    hooks.renderParamForm();
    expect(countOccurrences(form.innerHTML, "data-repeat-row")).toBe(1);
    hooks.addPlaygroundRow("fields");
    expect(countOccurrences(form.innerHTML, "data-repeat-row")).toBe(2);
  });

  it("keeps the write confirm checkbox and description aligned on one row", () => {
    const { document, hooks } = createPlaygroundControlHarness();
    const form = document.getElementById("playground-form");
    const css = dashboardStyles();

    hooks.state.command = "write";
    hooks.renderParamForm();

    expect(form.innerHTML).toContain('class="checkbox-control"');
    expect(form.innerHTML).toContain('class="checkbox-text"');
    expect(form.innerHTML).toContain('id="pg-param-write-confirm"');
    expect(form.innerHTML).not.toContain(
      ' /> <span class="text-muted text-mono">explicit confirmation</span>',
    );
    expect(css).toContain(
      ".checkbox-control { display: flex; align-items: center;",
    );
    expect(css).toContain('.checkbox-control input[type="checkbox"]');
  });

  it("preserves blank research rows when adding rows for another section", () => {
    const { document, hooks } = createPlaygroundControlHarness();
    const form = document.getElementById("playground-form");

    hooks.state.command = "research";
    hooks.renderParamForm();

    hooks.addPlaygroundRow("evidence");
    expect(repeatRowCountForParam(form.innerHTML, "evidence")).toBe(2);
    expect(repeatRowCountForParam(form.innerHTML, "assumptions")).toBe(1);

    hooks.addPlaygroundRow("assumptions");
    expect(repeatRowCountForParam(form.innerHTML, "evidence")).toBe(2);
    expect(repeatRowCountForParam(form.innerHTML, "assumptions")).toBe(2);
  });

  it("marks the active playground command as running while a request is in flight", async () => {
    const { document, hooks } = createPlaygroundControlHarness();

    hooks.state.command = "valid";
    hooks.renderParamForm();
    hooks.setPlaygroundRunning("valid", true);

    expect(document.getElementById("response-title").textContent).toBe(
      "valid · running",
    );
    expect(document.getElementById("playground-output").textContent).toBe(
      "Running valid...",
    );
    expect(document.getElementById("playground-run").disabled).toBe(true);
    expect(document.getElementById("playground-run").innerHTML).toContain(
      "running-dot",
    );

    hooks.setPlaygroundRunning("valid", false);

    expect(document.getElementById("playground-run").disabled).toBe(false);
    expect(document.getElementById("response-title").textContent).toBe(
      "valid · idle",
    );
  });

  it("renders response and run history for the active command only", () => {
    const { document, hooks } = createPlaygroundControlHarness();

    hooks.state.command = "valid";
    hooks.setCommandRunState(
      "valid",
      {
        data: { run: { command: "valid", humanOutput: "valid response" } },
        status: "ok",
      },
      [
        {
          args: { workflow: "dashboard" },
          command: "valid",
          durationMs: 12,
          status: "ok",
          time: "2026-05-15T06:00:00.000Z",
        },
      ],
    );
    hooks.renderResponse();
    hooks.renderRunHistory();

    expect(document.getElementById("response-title").textContent).toContain(
      "valid",
    );
    expect(document.getElementById("response-title").textContent).not.toContain(
      "POST /api/playground/run",
    );
    expect(document.getElementById("playground-output").textContent).toContain(
      "valid",
    );
    expect(
      document.getElementById("playground-response-pills").innerHTML,
    ).not.toContain("valid</span>");
    expect(
      document.getElementById("playground-response-pills").innerHTML,
    ).not.toContain("0 evidence");
    expect(document.getElementById("run-history").innerHTML).toContain("valid");

    hooks.state.command = "filter";
    hooks.renderResponse();
    hooks.renderRunHistory();

    expect(document.getElementById("response-title").textContent).toBe(
      "filter · idle",
    );
    expect(document.getElementById("playground-output").textContent).toBe(
      "Select a filter run to inspect.",
    );
    expect(document.getElementById("run-history").innerHTML).not.toContain(
      "valid",
    );
  });

  it("clears run history for the active command only", () => {
    const { document, hooks } = createPlaygroundControlHarness();

    hooks.setCommandRunState(
      "valid",
      {
        data: { run: { command: "valid", humanOutput: "valid response" } },
        status: "ok",
      },
      [
        {
          args: { workflow: "dashboard" },
          command: "valid",
          durationMs: 12,
          status: "ok",
          time: "2026-05-15T06:00:00.000Z",
        },
      ],
    );
    hooks.setCommandRunState(
      "filter",
      {
        data: { run: { command: "filter", humanOutput: "filter response" } },
        status: "ok",
      },
      [
        {
          args: {
            filters: [{ field: "Status", operator: "equals", value: "Open" }],
          },
          command: "filter",
          durationMs: 20,
          status: "ok",
          time: "2026-05-15T06:01:00.000Z",
        },
      ],
    );

    hooks.state.command = "filter";
    hooks.clearRunHistory();
    expect(document.getElementById("run-history").innerHTML).toContain(
      "no filter runs yet",
    );

    hooks.state.command = "valid";
    hooks.renderRunHistory();
    expect(document.getElementById("run-history").innerHTML).toContain("valid");
    expect(document.getElementById("run-history").innerHTML).not.toContain(
      "filter",
    );
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
    const auditDetailHtml = document.getElementById("audit-detail").innerHTML;
    expect(auditDetailHtml).toContain('data-copy-target="audit-detail-json"');
    expect(auditDetailHtml).toContain('id="audit-detail-json"');
    expect(auditDetailHtml).toContain("mode");
    expect(auditDetailHtml).toContain("—");
    expect(auditDetailHtml).not.toContain("no evidence");
    expect(auditDetailHtml).not.toContain('["--json"]');
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
    expect(document.getElementById("research-path").innerHTML).toBe(
      "/tmp/new-report.json",
    );
    expect(document.getElementById("research-path").innerHTML).not.toContain(
      "/<b>",
    );
    expect(newFile.classList.values.has("selected")).toBe(true);
    expect(oldFile.classList.values.has("selected")).toBe(false);
  });

  it("labels research file output status in user-facing terms", async () => {
    const { document, hooks } = createDashboardClientHarness((path) => {
      if (path.endsWith("/linked-report")) {
        return Promise.resolve(
          jsonResponse({
            status: "ok",
            data: {
              report: {
                reportId: "linked-report",
                name: "linked report",
                canonicalPath: "/tmp/research/linked-report.json",
                outputLinkPath: "/tmp/current-report.json",
                outputLinkStatus: "linked",
                selectedRecordId: "rec-linked",
                evidence: [],
              },
            },
          }),
        );
      }
      if (path.endsWith("/file-report")) {
        return Promise.resolve(
          jsonResponse({
            status: "ok",
            data: {
              report: {
                reportId: "file-report",
                name: "file report",
                canonicalPath: "/tmp/research/file-report.json",
                outputLinkStatus: "none",
                selectedRecordId: "rec-file",
                evidence: [],
              },
            },
          }),
        );
      }
      throw new Error(`unexpected path: ${path}`);
    });

    await hooks.loadResearchDetail("linked-report");

    expect(document.getElementById("research-path").innerHTML).toBe(
      "/tmp/research/linked-report.json",
    );
    expect(document.getElementById("research-meta").innerHTML).toContain(
      "symbol link",
    );
    expect(document.getElementById("research-meta").innerHTML).not.toContain(
      ">linked<",
    );

    await hooks.loadResearchDetail("file-report");

    expect(document.getElementById("research-meta").innerHTML).toContain(
      "file",
    );
    expect(document.getElementById("research-meta").innerHTML).not.toContain(
      "none",
    );
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

    expect(document.flowSteps[2]?.classList.values.has("active")).toBe(true);
    expect(openedUrls).toEqual([
      "https://accounts.larksuite.com/open-apis/authen/v1/authorize",
    ]);
    expect(timers.pendingCount()).toBe(1);

    await hooks.logoutAuth();

    expect(document.flowSteps[2]?.classList.values.has("active")).toBe(false);
    expect(document.getElementById("auth-url").textContent).toBe(
      "Logged out. Local auth.json has been cleared.",
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

    expect(document.flowSteps[2]?.classList.values.has("active")).toBe(false);
    expect(document.getElementById("auth-url").textContent).toBe(
      "Logged out. Local auth.json has been cleared.",
    );
  });

  it("applies auth scope presets and sends the selected scopes when login starts", async () => {
    const calls: Array<{ path: string; options?: Record<string, unknown> }> =
      [];
    const { document, hooks } = createAuthDashboardClientHarness(
      async (path, options) => {
        calls.push({ path, options });
        if (path === "/api/auth/login/start") {
          return jsonResponse({
            status: "ok",
            data: {
              status: "waiting",
              authorizationUrl: "https://accounts.example.test/oauth",
            },
          });
        }
        throw new Error(`unexpected path: ${path}`);
      },
    );

    hooks.bindEvents();
    await document.getElementById("auth-scope-writable").click();

    expect(document.getElementById("auth-scope-list").innerHTML).toContain(
      "bitable:app",
    );
    expect(
      document
        .getElementById("auth-scope-writable")
        .getAttribute("aria-pressed"),
    ).toBe("true");

    await document.getElementById("auth-start").click();

    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/api/auth/login/start",
          options: expect.objectContaining({
            body: JSON.stringify({
              openBrowser: false,
              scopes: ["bitable:app"],
            }),
            method: "POST",
          }),
        }),
      ]),
    );
  });

  it("uses configured auth scopes only to choose the matching preset preview", async () => {
    const { document, hooks } = createAuthDashboardClientHarness(
      async (path) => {
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
        if (path === "/api/config") {
          return jsonResponse({
            status: "ok",
            data: {
              draft: {
                scopes: ["bitable:app:readonly", "bitable:app"],
              },
            },
          });
        }
        throw new Error(`unexpected path: ${path}`);
      },
    );

    await hooks.loadAuth();

    expect(document.getElementById("auth-scope-list").innerHTML).toContain(
      "bitable:app:readonly",
    );
    expect(
      document
        .getElementById("auth-scope-readonly")
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      document
        .getElementById("auth-scope-writable")
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("runs dashboard logout from the auth page button and shows completion", async () => {
    const calls: Array<{ path: string; options?: Record<string, unknown> }> =
      [];
    const { document, hooks } = createAuthDashboardClientHarness(
      async (path, options) => {
        calls.push({ path, options });
        if (path === "/api/auth/logout") {
          return jsonResponse({
            status: "ok",
            data: {
              auth: {
                status: "missing",
                scopes: [],
                storagePath: "/tmp/auth.json",
              },
            },
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
      },
    );

    hooks.bindEvents();
    await document.getElementById("auth-logout").click();

    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          options: expect.objectContaining({ body: "{}", method: "POST" }),
          path: "/api/auth/logout",
        }),
      ]),
    );
    expect(document.getElementById("auth-state-pill").innerHTML).toContain(
      "missing",
    );
    expect(document.getElementById("auth-url").textContent).toBe(
      "Logged out. Local auth.json has been cleared.",
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

  it("uses live updates to refresh recent activity without the overview live feed", async () => {
    const html = dashboardHtml();
    expect(html).toContain('id="live-connection-state"');
    expect(html).toContain('id="recent-activity"');
    expect(html).not.toContain("Live Activity");
    expect(html).not.toContain('id="live-activity-feed"');
    expect(dashboardStyles()).not.toContain(".live-activity-item");

    const requestedPaths: string[] = [];
    const { document, hooks } = createLiveDashboardClientHarness(
      async (path) => {
        requestedPaths.push(path);
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
    expect(document.getElementById("live-connection-state").textContent).toBe(
      "WebSocket · connected",
    );
    expect(document.getElementById("recent-activity").innerHTML).toContain(
      "valid",
    );
    expect(requestedPaths).toContain("/api/audit?limit=5");
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
      "WebSocket · stale",
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
      "WebSocket · fallback",
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

  it("keeps a pending audit row selection stable when live refresh arrives before detail loads", async () => {
    const pendingDetail = createDeferred<unknown>();
    const requestedPaths: string[] = [];
    let selectedDetailRequests = 0;
    const entries = [
      {
        command: "valid",
        durationMs: 12,
        id: "audit-1",
        startedAt: "2026-05-15T00:00:00.000Z",
        status: "partial",
      },
      {
        command: "schema",
        durationMs: 7,
        id: "audit-2",
        startedAt: "2026-05-15T00:00:01.000Z",
        status: "ok",
      },
    ];
    const { document, hooks } = createLiveDashboardClientHarness(
      async (path) => {
        requestedPaths.push(path);
        if (path === "/api/audit/audit-2") {
          selectedDetailRequests += 1;
          if (selectedDetailRequests === 1) return pendingDetail.promise;
          return jsonResponse({
            status: "ok",
            data: {
              entry: {
                command: "schema",
                id: "audit-2",
                startedAt: "2026-05-15T00:00:01.000Z",
                status: "ok",
              },
            },
          });
        }
        if (path === "/api/audit?") {
          return jsonResponse({
            status: "ok",
            data: { entries },
          });
        }
        if (path === "/api/audit/audit-1") {
          return jsonResponse({
            status: "ok",
            data: {
              entry: {
                command: "valid",
                id: "audit-1",
                startedAt: "2026-05-15T00:00:00.000Z",
                status: "partial",
              },
            },
          });
        }
        throw new Error(`unexpected path: ${path}`);
      },
    );
    const firstRow = new TestElement();
    firstRow.dataset.id = "audit-1";
    const secondRow = new TestElement();
    secondRow.dataset.id = "audit-2";
    document.auditRows.push(firstRow, secondRow);

    hooks.state.page = "audit";
    const pendingSelection = hooks.loadAuditDetail("audit-2");
    await flushPromises();

    await hooks.handleLiveEnvelope({
      createdAt: "2026-05-15T00:00:05.000Z",
      dataSource: "file-backed",
      eventId: "evt_audit",
      payload: {
        reason: "audit updated",
        resources: ["/api/audit"],
        surfaces: ["audit"],
      },
      sequence: 7,
      type: "state.invalidate",
    });

    expect(requestedPaths).not.toContain("/api/audit/audit-1");
    expect(hooks.state.selectedAuditId).toBe("audit-2");
    expect(document.getElementById("audit-entries").innerHTML).toContain(
      'class="audit-row selected" data-id="audit-2"',
    );

    pendingDetail.resolve(
      jsonResponse({
        status: "ok",
        data: {
          entry: {
            command: "schema",
            id: "audit-2",
            startedAt: "2026-05-15T00:00:01.000Z",
            status: "ok",
          },
        },
      }),
    );
    await pendingSelection;
    expect(hooks.state.auditDetail).toMatchObject({ id: "audit-2" });
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
    expect(document.getElementById("research-path").innerHTML).toBe(
      "~/.lark-bitable/research",
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
