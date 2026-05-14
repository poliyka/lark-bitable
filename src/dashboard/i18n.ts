import type { LanguageCode } from "./schemas.js";

export const DASHBOARD_LANGUAGE_STORAGE_KEY = "lark-bitable.dashboard.lang";

export const dashboardLanguageCatalog: Record<
  LanguageCode,
  Record<string, string>
> = {
  "zh-TW": {
    appTitle: "Lark Bitable Dashboard",
    apply: "套用",
    navAudit: "稽核紀錄",
    navAuth: "Lark 登入",
    navConfig: "設定",
    navOverview: "總覽",
    navPlayground: "Playground",
    navResearch: "研究報告",
    navTable: "來源資料表",
    noWebLogin: "本地 dashboard 不需要 web 登入。",
    clearHistory: "清除歷史",
    commandPalette: "指令面板",
    configSaved: "設定已儲存",
    copy: "複製",
    copyContent: "複製內容",
    copyPath: "複製路徑",
    dashboardSubtitle:
      "本機 dashboard 服務狀態、Lark 連線、來源設定與下一個可安全執行的指令。",
    emptyState: "目前沒有可顯示的資料。",
    errorState: "載入失敗，請檢查 dashboard server console 與 audit logs。",
    exportJson: "匯出 JSON",
    loadReports: "載入報告",
    logout: "登出",
    openInBrowser: "在瀏覽器開啟",
    openInFinder: "在 Finder 開啟",
    readinessTitle: "前置條件狀態",
    records: "Records",
    refresh: "重新整理",
    reset: "重設",
    run: "執行",
    saveConfig: "儲存設定",
    schema: "Schema",
    search: "搜尋",
    sourceDataBoundary: "來源資料保持原文，不會被 UI 語系切換翻譯。",
    startLogin: "開始登入",
    switchLanguage: "語言",
    terminalOutput: "輸出",
  },
  en: {
    appTitle: "Lark Bitable Dashboard",
    apply: "Apply",
    navAudit: "Audit Logs",
    navAuth: "Lark Login",
    navConfig: "Configuration",
    navOverview: "Overview",
    navPlayground: "Playground",
    navResearch: "Research Reports",
    navTable: "Source Table",
    noWebLogin: "The local dashboard does not require a web login.",
    clearHistory: "Clear History",
    commandPalette: "Command Palette",
    configSaved: "Configuration saved",
    copy: "Copy",
    copyContent: "Copy Content",
    copyPath: "Copy Path",
    dashboardSubtitle:
      "Local dashboard service status, Lark connection, source configuration, and the next safe command.",
    emptyState: "No data is available yet.",
    errorState:
      "Loading failed. Inspect the dashboard server console and audit logs.",
    exportJson: "Export JSON",
    loadReports: "Load Reports",
    logout: "Logout",
    openInBrowser: "Open in Browser",
    openInFinder: "Open in Finder",
    readinessTitle: "Readiness Status",
    records: "Records",
    refresh: "Refresh",
    reset: "Reset",
    run: "Run",
    saveConfig: "Save Configuration",
    schema: "Schema",
    search: "Search",
    sourceDataBoundary:
      "Source data stays verbatim and is not translated by UI language switching.",
    startLogin: "Start Login",
    switchLanguage: "Language",
    terminalOutput: "Output",
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
