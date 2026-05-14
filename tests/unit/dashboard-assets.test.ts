import { describe, expect, it } from "vitest";

import {
  dashboardAppScript,
  dashboardHtml,
  dashboardStyles,
} from "../../src/dashboard/assets.js";
import { dashboardLanguageCatalog } from "../../src/dashboard/i18n.js";

describe("dashboard design assets", () => {
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
});
