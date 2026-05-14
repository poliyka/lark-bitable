import type { LanguageCode } from "./schemas.js";

export const DASHBOARD_LANGUAGE_STORAGE_KEY = "lark-bitable.dashboard.lang";

export const dashboardLanguageCatalog: Record<
  LanguageCode,
  Record<string, string>
> = {
  "zh-TW": {
    appTitle: "Lark Bitable Dashboard",
    navAudit: "稽核紀錄",
    navAuth: "Lark 登入",
    navConfig: "設定",
    navOverview: "總覽",
    navPlayground: "Playground",
    navResearch: "研究報告",
    navTable: "資料表",
    noWebLogin: "本地 dashboard 不需要 web 登入。",
    saveConfig: "儲存設定",
    switchLanguage: "語言",
  },
  en: {
    appTitle: "Lark Bitable Dashboard",
    navAudit: "Audit Logs",
    navAuth: "Lark Login",
    navConfig: "Configuration",
    navOverview: "Overview",
    navPlayground: "Playground",
    navResearch: "Research Reports",
    navTable: "Table Context",
    noWebLogin: "The local dashboard does not require a web login.",
    saveConfig: "Save Configuration",
    switchLanguage: "Language",
  },
};

export function resolveDashboardLanguage(
  cachedValue?: string,
  browserPreference?: string,
): {
  source: "browser-preference" | "default" | "web-cache";
  value: LanguageCode;
} {
  if (isLanguageCode(cachedValue)) {
    return { source: "web-cache", value: cachedValue };
  }
  const preferred = browserPreference?.toLowerCase();
  if (preferred?.startsWith("en")) {
    return { source: "browser-preference", value: "en" };
  }
  if (preferred?.startsWith("zh")) {
    return { source: "browser-preference", value: "zh-TW" };
  }
  return { source: "default", value: "zh-TW" };
}

export function isSourceDataKey(key: string): boolean {
  return /(^record\.|fields\.|\.fields\.|audit\.dataSnapshot|research\.markdown|commandOutput|filePath)/i.test(
    key,
  );
}

function isLanguageCode(value: string | undefined): value is LanguageCode {
  return value === "zh-TW" || value === "en";
}
