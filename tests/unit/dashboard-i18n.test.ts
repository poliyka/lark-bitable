import { describe, expect, it } from "vitest";

import {
  DASHBOARD_LANGUAGE_STORAGE_KEY,
  dashboardLanguageCatalog,
  isSourceDataKey,
  resolveDashboardLanguage,
} from "../../src/dashboard/i18n.js";
import {
  dashboardAppScript,
  dashboardHtml,
} from "../../src/dashboard/assets.js";

describe("dashboard language switching", () => {
  it("resolves supported, browser-preferred, and fallback language values", () => {
    expect(resolveDashboardLanguage("zh-TW", "en-US").value).toBe("zh-TW");
    expect(resolveDashboardLanguage("fr", "en-US").value).toBe("en");
    expect(resolveDashboardLanguage(undefined, "ja-JP").value).toBe("zh-TW");
  });

  it("keeps preference in browser web cache assets only", () => {
    expect(DASHBOARD_LANGUAGE_STORAGE_KEY).toBe("lark-bitable.dashboard.lang");
    expect(dashboardAppScript()).toContain("localStorage");
    expect(dashboardAppScript()).not.toContain("/api/language");
  });

  it("ships Traditional Chinese and English dashboard-owned text", () => {
    expect(dashboardLanguageCatalog["zh-TW"].navConfig).toContain("設定");
    expect(dashboardLanguageCatalog.en.navConfig).toContain("Configuration");
    expect(dashboardHtml()).toContain("data-i18n");
  });

  it("marks source data as out of translation scope", () => {
    expect(isSourceDataKey("record.fields.狀態")).toBe(true);
    expect(isSourceDataKey("audit.dataSnapshot")).toBe(true);
    expect(isSourceDataKey("dashboard.navConfig")).toBe(false);
  });
});
