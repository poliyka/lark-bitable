import {
  DASHBOARD_LANGUAGE_STORAGE_KEY,
  dashboardLanguageCatalog,
} from "./i18n.js";
import type { DashboardBinding } from "./schemas.js";

export function dashboardHtml(binding?: DashboardBinding): string {
  const shellBinding = binding ?? {
    host: "127.0.0.1",
    origin: "http://127.0.0.1:48731",
    port: 48731,
    requestedPort: 48731,
    startedAt: "",
    status: "ready" as const,
  };
  return `<!doctype html>
<html lang="zh-TW">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>lark-bitable · dashboard</title>
    <link rel="icon" href="data:," />
    <link rel="stylesheet" href="/assets/styles.css" />
  </head>
  <body id="lark-bitable-dashboard">
    <div class="app">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark" aria-hidden="true"></div>
          <div class="brand-name">lark-bitable<br /><span>dashboard</span></div>
          <div class="brand-ver">v1.0</div>
        </div>

        <div class="nav-section">
          <div class="nav-label">Workspace</div>
          <div class="nav">
            <button data-page="overview" aria-current="true"><span class="glyph">◇</span><span data-i18n="navOverview">總覽</span><span class="kbd">⌘1</span></button>
            <button data-page="config"><span class="glyph">∷</span><span data-i18n="navConfig">設定</span><span class="kbd">⌘2</span></button>
            <button data-page="auth"><span class="glyph">⎋</span><span data-i18n="navAuth">Lark 登入</span><span class="kbd">⌘3</span></button>
            <button data-page="audit"><span class="glyph">≡</span><span data-i18n="navAudit">稽核紀錄</span><span class="kbd">⌘4</span></button>
          </div>
        </div>

        <div class="nav-section">
          <div class="nav-label">Tools</div>
          <div class="nav">
            <button data-page="playground"><span class="glyph">▷</span><span data-i18n="navPlayground">Playground</span><span class="kbd">⌘5</span></button>
            <button data-page="research"><span class="glyph">◧</span><span data-i18n="navResearch">研究報告</span><span class="kbd">⌘6</span></button>
            <button data-page="table"><span class="glyph">▦</span><span data-i18n="navTable">來源資料表</span><span class="kbd">⌘7</span></button>
          </div>
        </div>

        <div class="sidebar-foot">
          <div class="binding-card">
            <div class="row"><span class="key">status</span><span><span class="pulse"></span><span id="binding-status">${shellBinding.status}</span></span></div>
            <div class="row"><span class="key">host</span><span id="binding-host">${shellBinding.host}</span></div>
            <div class="row"><span class="key">port</span><span id="binding-port">${shellBinding.port}</span></div>
            <div class="row"><span class="key">mode</span><span>local only</span></div>
            <div class="row"><span class="key">login</span><span>no dashboard login</span></div>
          </div>
        </div>
      </aside>

      <main class="main">
        <div class="topbar">
          <div class="crumb">workspace / <b id="crumb-page">總覽</b></div>
          <div class="spacer"></div>
          <button class="top-action" id="refresh-current">⟳ <span data-i18n="refresh">重新整理</span></button>
          <button class="top-action" id="command-palette">⌘ <span data-i18n="commandPalette">指令面板</span></button>
          <div class="lang-toggle" role="group" aria-label="Language">
            <button data-lang="zh-TW" aria-pressed="true">繁中</button>
            <button data-lang="en">EN</button>
          </div>
        </div>

        <section class="page page-view active" data-page="overview" id="overview-page">
          <div class="page-head">
            <div>
              <h1 data-i18n="navOverview">總覽</h1>
              <p class="sub" data-i18n="dashboardSubtitle">本機 dashboard 服務狀態、Lark 連線、來源設定與下一個可安全執行的指令。</p>
            </div>
            <div class="page-actions">
              <button class="btn btn-ghost" id="overview-valid">valid</button>
              <button class="btn btn-primary" id="overview-next"><span data-i18n="copy">複製</span> next</button>
            </div>
          </div>

          <div class="readiness partial" id="readiness-card">
            <div class="ring"><span id="readiness-ring">LOAD</span></div>
            <div>
              <h2 id="readiness-title" data-i18n="readinessTitle">前置條件狀態</h2>
              <p id="readiness-summary">Loading dashboard status...</p>
            </div>
            <div class="row-flex" id="readiness-pills"></div>
          </div>

          <div class="next-cmd">
            <span class="prefix">$</span>
            <span id="next-command">lark-bitable dashboard</span>
            <button class="copy" data-copy-target="next-command" data-i18n="copy">複製</button>
          </div>

          <div class="spacer-block"></div>

          <div class="grid-3">
            <div class="card">
              <div class="card-head"><h3>Source · Base</h3><span class="pill solid" id="source-ds">missing</span></div>
              <div class="card-body"><div class="kv" id="source-kv"></div></div>
            </div>
            <div class="card">
              <div class="card-head"><h3>Auth · Lark OAuth</h3><span class="pill warn" id="auth-pill"><span class="dot"></span>loading</span></div>
              <div class="card-body"><div class="kv" id="auth-kv"></div></div>
            </div>
            <div class="card">
              <div class="card-head"><h3>Workflow · Mode</h3><span class="pill info" id="mode-pill"><span class="dot"></span>Developer</span></div>
              <div class="card-body"><div class="kv" id="mode-kv"></div></div>
            </div>
          </div>

          <div class="spacer-block"></div>

          <div class="grid-2-3">
            <div class="card">
              <div class="card-head"><h3>Field Mappings</h3><button class="btn btn-ghost btn-xs" data-page-jump="config">fix</button></div>
              <div class="card-body no-pad" id="mapping-list"></div>
            </div>
            <div class="card">
              <div class="card-head"><h3>Recent Activity</h3><button class="link-button" data-page-jump="audit">view all</button></div>
              <div class="card-body no-pad"><table class="tbl"><tbody id="recent-activity"></tbody></table></div>
            </div>
          </div>
        </section>

        <section class="page page-view" data-page="config" id="config-page">
          <div class="page-head">
            <div>
              <h1 data-i18n="navConfig">設定</h1>
              <p class="sub">Base URL、Lark app、欄位對應、workflow mode 與 actionable status。儲存後立即重新評估 readiness。</p>
            </div>
            <div class="page-actions">
              <button class="btn btn-ghost" id="config-reset" data-i18n="reset">重設</button>
              <button class="btn btn-primary" id="config-save" form="config-form" data-i18n="saveConfig">儲存設定</button>
            </div>
          </div>

          <form id="config-form" class="stack-md">
            <div class="card">
              <div class="card-head"><h3>Source · Base / Bitable</h3><span class="pill solid">file-backed</span></div>
              <div class="card-body">
                <div class="grid-2">
                  <div class="field wide"><label for="sourceUrl">Lark Base / Bitable URL</label><input class="input" id="sourceUrl" name="sourceUrl" placeholder="https://example.larksuite.com/base/..." /></div>
                  <div class="field"><label for="sourceName">來源名稱</label><input class="input" id="sourceName" name="sourceName" placeholder="Project Bugs" /></div>
                  <div class="field"><label for="mode">Workflow Mode</label><select class="select" id="mode" name="mode"><option>Developer</option><option>QA</option></select></div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-head"><h3>Lark App Credentials</h3><span class="pill solid" id="secret-state">missing</span></div>
              <div class="card-body">
                <div class="grid-2">
                  <div class="field"><label for="larkAppId">App ID</label><input class="input" id="larkAppId" name="larkAppId" autocomplete="username" /></div>
                  <div class="field"><label for="larkAppSecret">App Secret</label><input class="input" id="larkAppSecret" name="larkAppSecret" type="password" autocomplete="current-password" placeholder="留空表示沿用既有值" /></div>
                  <div class="field"><label for="redirectUri">OAuth Redirect URI</label><input class="input" id="redirectUri" name="redirectUri" placeholder="http://127.0.0.1:14543/callback" /></div>
                  <div class="field"><label for="callbackPort">Callback Port</label><input class="input" id="callbackPort" name="callbackPort" inputmode="numeric" placeholder="14543" /></div>
                  <div class="field"><label for="larkDomain">Lark Domain</label><select class="select" id="larkDomain" name="larkDomain"><option>larksuite.com</option><option>feishu.cn</option></select></div>
                  <div class="field"><label for="scopes">Scopes</label><input class="input" id="scopes" name="scopes" placeholder="bitable:app:readonly bitable:app" /></div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-head"><h3>Field Mappings</h3><button class="btn btn-ghost btn-xs" type="button" id="config-discover">⟳ 從 Base 重新探索</button></div>
              <div class="card-body">
                <div class="grid-2">
                  <div class="field"><label for="statusField">Status Field</label><select class="select" id="statusField" name="statusField" data-schema-field="statusField"></select></div>
                  <div class="field"><label for="actionableStatus">Actionable Status</label><input class="input" id="actionableStatus" name="actionableStatus" /></div>
                  <div class="field"><label for="priorityField">Priority Field</label><select class="select" id="priorityField" name="priorityField" data-schema-field="priorityField"></select></div>
                  <div class="field"><label for="titleField">Title Field</label><select class="select" id="titleField" name="titleField" data-schema-field="titleField"></select></div>
                  <div class="field"><label for="ownerField">Owner Field</label><select class="select" id="ownerField" name="ownerField" data-schema-field="ownerField"></select></div>
                  <div class="field"><label for="defaultOwner">Default Owner</label><input class="input" id="defaultOwner" name="defaultOwner" /></div>
                </div>
                <div id="schema-discovery" class="top-gap"></div>
              </div>
            </div>
          </form>
          <div class="terminal page-terminal"><div class="terminal-head"><span data-i18n="terminalOutput">輸出</span></div><div class="terminal-body" id="config-output"></div></div>
        </section>

        <section class="page page-view" data-page="auth" id="auth-page">
          <div class="page-head">
            <div>
              <h1 data-i18n="navAuth">Lark 登入</h1>
              <p class="sub">啟動 SSO/OAuth 登入流程、查看登入狀態、登出本機 auth.json。Access token / refresh token 不顯示。</p>
            </div>
            <div class="page-actions">
              <button class="btn btn-danger" id="auth-logout" data-i18n="logout">登出</button>
              <button class="btn btn-primary" id="auth-start">↗ <span data-i18n="startLogin">開始登入</span></button>
            </div>
          </div>

          <div class="grid-1-2">
            <div class="card">
              <div class="card-head"><h3>Current Auth</h3><span class="pill warn" id="auth-state-pill"><span class="dot"></span>loading</span></div>
              <div class="card-body"><div class="info-list" id="auth-state-list"></div></div>
            </div>
            <div class="card">
              <div class="card-head"><h3>Login Flow</h3><span class="pill solid" id="login-flow-status">idle</span></div>
              <div class="card-body stack-md">
                <div class="grid-2">
                  <div class="field"><label for="auth-scopes">Requested Scopes</label><input class="input" id="auth-scopes" value="bitable:app:readonly" /></div>
                  <div class="field"><label for="auth-callback-mode">Callback Mode</label><input class="input" id="auth-callback-mode" value="local-callback" disabled /></div>
                </div>
                <div class="flow" id="login-flow-steps">
                  <div class="flow-step"><div class="marker"></div><div class="num">STEP 01</div><div class="title">啟動 callback server</div><div class="desc">pending</div></div>
                  <div class="flow-step"><div class="marker"></div><div class="num">STEP 02</div><div class="title">開啟瀏覽器</div><div class="desc">pending</div></div>
                  <div class="flow-step"><div class="marker"></div><div class="num">STEP 03</div><div class="title">等待 redirect</div><div class="desc">pending</div></div>
                  <div class="flow-step"><div class="marker"></div><div class="num">STEP 04</div><div class="title">換取 token</div><div class="desc">pending</div></div>
                </div>
                <div class="next-cmd"><span class="prefix">↗</span><span id="auth-url">authorization URL will appear here</span><button class="copy" id="auth-open" data-i18n="openInBrowser">在瀏覽器開啟</button></div>
              </div>
            </div>
          </div>
        </section>

        <section class="page page-view" data-page="audit" id="audit-page">
          <div class="page-head">
            <div>
              <h1 data-i18n="navAudit">稽核紀錄</h1>
              <p class="sub">~/.lark-bitable/logs/audit.json 與 rotated audit-YYYY-MM-DD.json · 顯示前已 redact secrets。</p>
            </div>
            <div class="page-actions"><button class="btn btn-ghost" id="audit-export" data-i18n="exportJson">匯出 JSON</button></div>
          </div>

          <form class="card audit-filters" id="audit-filter-form">
            <div class="card-body">
              <div class="filter-grid">
                <input class="input" name="text" aria-label="Audit text filter" placeholder="搜尋 command, issue code, evidence ..." />
                <select class="select" name="command"><option value="">command: all</option><option>research</option><option>triage</option><option>write</option><option>schema</option><option>valid</option></select>
                <select class="select" name="status"><option value="">status: all</option><option>ok</option><option>partial</option><option>error</option></select>
                <select class="select" name="mode"><option value="">mode: all</option><option>Developer</option><option>QA</option></select>
                <input class="input" name="from" aria-label="Audit from time" placeholder="from ISO time" />
                <button class="btn btn-primary" data-i18n="apply">套用</button>
              </div>
              <div class="row-flex filter-row">
                <label class="check"><input type="checkbox" name="hasEvidence" /> has-evidence</label>
                <label class="check"><input type="checkbox" name="hasError" /> has-error</label>
                <input class="input mini-input" name="issueCode" aria-label="Audit issue code" placeholder="issue code" />
                <span class="text-muted text-mono push-right" id="audit-count">0 entries</span>
              </div>
            </div>
          </form>

          <div class="split">
            <div class="card overflow-hidden">
              <div class="card-head"><h3>Entries</h3><span class="pill solid" id="audit-entry-count">0</span></div>
              <div class="table-scroll"><table class="tbl"><thead><tr><th>time</th><th>command</th><th>status</th><th>mode</th><th class="right">duration</th></tr></thead><tbody id="audit-entries"></tbody></table></div>
            </div>
            <div class="card">
              <div class="card-head"><h3 id="audit-detail-title">Detail</h3><span class="pill solid" id="audit-detail-status">empty</span></div>
              <div class="card-body" id="audit-detail"><div class="empty-hint" data-i18n="emptyState">目前沒有可顯示的資料。</div></div>
            </div>
          </div>
        </section>

        <section class="page page-view" data-page="playground" id="playground-page">
          <div class="page-head">
            <div>
              <h1 data-i18n="navPlayground">Playground</h1>
              <p class="sub">指令測試台 · 左側選指令、中間填參數、上方看到組裝後的完整 CLI 指令，下方看 response。</p>
            </div>
            <div class="page-actions">
              <button class="btn btn-ghost" id="playground-clear" data-i18n="clearHistory">清除歷史</button>
              <button class="btn btn-ghost" id="playground-copy-cli" data-i18n="copy">複製</button>
            </div>
          </div>

          <div class="cmd-preview">
            <span class="prompt">$</span>
            <div class="cmd-text" id="cmd-preview-text">lark-bitable valid --workflow dashboard --json</div>
            <button class="copy" data-copy-target="cmd-preview-text">⧉ <span data-i18n="copy">複製</span></button>
          </div>

          <div class="pg-grid">
            <div class="card fit-content">
              <div class="card-head"><h3>Commands</h3><span class="pill solid">10</span></div>
              <div class="cmd-list" id="cmd-list"></div>
            </div>
            <div class="stack-md">
              <div class="card">
                <div class="card-head"><h3 id="params-title">Parameters · valid</h3><div class="row-flex"><span class="pill solid" id="command-safety">safe</span><button class="btn btn-primary" id="playground-run">▷ <span data-i18n="run">執行</span></button></div></div>
                <div class="card-body"><form id="playground-form" class="grid-2 compact-grid"></form></div>
              </div>
              <div class="card">
                <div class="card-head"><h3>Response</h3><div class="row-flex" id="playground-response-pills"></div></div>
                <div class="card-body no-pad">
                  <div class="tabs" id="response-tabs"><button data-response-tab="structured" aria-pressed="true">Structured JSON</button><button data-response-tab="human">Human</button><button data-response-tab="audit">Audit Entry</button></div>
                  <div class="terminal response-terminal"><div class="terminal-head"><div class="lights"><span></span><span></span><span></span></div><span id="response-title">idle</span></div><div class="terminal-body" id="playground-output"></div></div>
                </div>
              </div>
              <div class="card">
                <div class="card-head"><h3>Run History</h3><span class="text-mono text-muted">recent 5</span></div>
                <div class="card-body no-pad"><table class="tbl"><tbody id="run-history"></tbody></table></div>
              </div>
            </div>
          </div>
        </section>

        <section class="page page-view" data-page="research" id="research-page">
          <div class="page-head">
            <div>
              <h1 data-i18n="navResearch">研究報告</h1>
              <p class="sub">~/.lark-bitable/research/ 下的 canonical JSON 報告 · 左側搜尋/點選，右側以報告閱讀器檢視內容。</p>
            </div>
            <div class="page-actions">
              <button class="btn btn-ghost" id="research-copy-dir" data-i18n="copyPath">複製路徑</button>
              <button class="btn btn-ghost" id="research-load" data-i18n="loadReports">載入報告</button>
            </div>
          </div>

          <div class="md-shell">
            <aside class="md-list">
              <div class="md-list-head"><input class="input md-search" id="research-search" aria-label="Research report search" placeholder="搜尋全部報告 ..." /><div class="row-flex top-gap"><span class="pill solid" id="research-count">0 reports</span><span class="text-muted text-mono push-right">sorted by mtime</span></div></div>
              <div class="md-files" id="research-files"></div>
            </aside>
            <article class="md-viewer">
              <div class="md-viewer-head">
                <div><div class="md-path" id="research-path">~/.lark-bitable/research/<b>none</b></div><div class="row-flex top-gap" id="research-meta"></div></div>
                <div class="row-flex"><button class="btn btn-ghost btn-sm" id="research-copy-content" data-i18n="copyContent">複製內容</button><button class="btn btn-ghost btn-sm" id="research-copy-path" data-i18n="copyPath">複製路徑</button></div>
              </div>
              <div class="md-body" id="research-body"><div class="empty-hint" data-i18n="emptyState">目前沒有可顯示的資料。</div></div>
            </article>
          </div>
        </section>

        <section class="page page-view" data-page="table" id="table-page">
          <div class="page-head">
            <div>
              <h1 data-i18n="navTable">來源資料表</h1>
              <p class="sub">lark-bitable 多維表格 · schema / sampled records · 點擊任一列查看原始 JSON。</p>
            </div>
            <div class="page-actions"><button class="btn btn-ghost" id="table-refresh">⟳ <span data-i18n="refresh">重新整理</span></button><button class="btn btn-ghost" id="table-export" data-i18n="exportJson">匯出 JSON</button></div>
          </div>

          <div class="src-banner" id="table-source-banner"></div>
          <div class="data-tabs"><button data-dtab="records" aria-pressed="true"><span data-i18n="records">Records</span><span class="count" id="records-count">0</span></button><button data-dtab="schema"><span data-i18n="schema">Schema</span><span class="count" id="schema-count">0</span></button></div>
          <div data-dpane="records">
            <div class="filter-bar"><input class="input" id="table-search" aria-label="Table record search" placeholder="搜尋 record id / field values ..." /><button class="btn btn-primary" id="table-apply" data-i18n="apply">套用</button></div>
            <div class="card overflow-hidden"><div class="card-head"><h3 id="records-title">Records</h3><span class="pill solid" id="records-source">missing</span></div><div class="table-scroll"><table class="data-tbl"><thead id="records-head"></thead><tbody id="records-body"></tbody></table></div></div>
          </div>
          <div data-dpane="schema" hidden>
            <div class="card"><div class="card-head"><h3 id="schema-title">Schema</h3><span class="pill solid" id="schema-source">missing</span></div><div class="card-body no-pad" id="schema-body"></div></div>
          </div>
        </section>
      </main>
    </div>
    <script src="/assets/app.js"></script>
  </body>
</html>`;
}

export function dashboardStyles(): string {
  return `:root {
  --bg: #060708;
  --bg-2: #0b0d10;
  --surface: #101316;
  --surface-2: #14181d;
  --line: #1d2229;
  --line-2: #262c34;
  --ink: #e7ecef;
  --ink-2: #b6bdc4;
  --muted: #6a737d;
  --muted-2: #4a525b;
  --accent: oklch(0.82 0.17 145);
  --accent-dim: oklch(0.55 0.12 145);
  --accent-glow: oklch(0.82 0.17 145 / 0.18);
  --warn: oklch(0.82 0.14 78);
  --danger: oklch(0.68 0.19 25);
  --info: oklch(0.78 0.10 225);
  --font-sans: "IBM Plex Sans", "Noto Sans TC", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace;
  --radius: 10px;
  --radius-sm: 6px;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; min-height: 100%; }
body {
  font-family: var(--font-sans);
  background: var(--bg);
  color: var(--ink);
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
  background-image:
    radial-gradient(ellipse 800px 400px at 0% 0%, rgba(64, 220, 130, 0.04), transparent 60%),
    radial-gradient(ellipse 600px 300px at 100% 100%, rgba(64, 220, 130, 0.03), transparent 60%);
}
::selection { background: var(--accent-glow); color: var(--ink); }
button, input, select, textarea { font: inherit; }
button { color: inherit; }
code { font-family: var(--font-mono); }
.app { display: grid; grid-template-columns: 252px 1fr; min-height: 100vh; }
.sidebar { border-right: 1px solid var(--line); background: var(--bg-2); display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; }
.brand { display: flex; align-items: center; gap: 10px; padding: 20px 18px 18px; border-bottom: 1px solid var(--line); }
.brand-mark { width: 28px; height: 28px; border-radius: 7px; background: linear-gradient(135deg, var(--accent), var(--accent-dim)); box-shadow: 0 0 0 1px rgba(255,255,255,0.06) inset, 0 8px 24px var(--accent-glow); position: relative; }
.brand-mark::after { content: ""; position: absolute; inset: 7px; border: 1.5px solid var(--bg); border-radius: 3px; border-bottom-color: transparent; border-right-color: transparent; }
.brand-name { font-weight: 600; letter-spacing: -0.01em; font-size: 14px; }
.brand-name span { color: var(--muted); font-weight: 400; font-size: 11px; }
.brand-ver { font-family: var(--font-mono); font-size: 10px; padding: 2px 6px; border: 1px solid var(--line-2); border-radius: 4px; color: var(--muted); margin-left: auto; }
.nav-section { padding: 16px 12px 6px; }
.nav-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted-2); padding: 0 8px 8px; }
.nav { display: flex; flex-direction: column; gap: 1px; }
.nav button { all: unset; display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: var(--radius-sm); color: var(--ink-2); font-size: 13px; cursor: pointer; position: relative; user-select: none; }
.nav button:hover { background: var(--surface); color: var(--ink); }
.nav button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; background: var(--surface-2); color: var(--ink); }
.nav button[aria-current="true"] { background: var(--surface-2); color: var(--ink); box-shadow: inset 2px 0 0 var(--accent); }
.nav .glyph { width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 11px; color: var(--muted); border: 1px solid var(--line-2); border-radius: 4px; background: var(--bg); }
.nav button[aria-current="true"] .glyph { color: var(--accent); border-color: var(--accent-dim); }
.nav .kbd { margin-left: auto; font-family: var(--font-mono); font-size: 10px; color: var(--muted-2); }
.sidebar-foot { margin-top: auto; padding: 12px; border-top: 1px solid var(--line); }
.binding-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 10px 12px; font-family: var(--font-mono); font-size: 11px; color: var(--ink-2); line-height: 1.5; }
.binding-card .row { display: flex; justify-content: space-between; gap: 8px; }
.binding-card .row + .row { margin-top: 4px; }
.binding-card .key { color: var(--muted); }
.pulse { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 0 var(--accent-glow); animation: pulse 2s infinite; margin-right: 6px; vertical-align: middle; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 var(--accent-glow); } 70% { box-shadow: 0 0 0 8px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
.main { min-width: 0; }
.topbar { display: flex; align-items: center; gap: 16px; padding: 16px 28px; border-bottom: 1px solid var(--line); background: rgba(6,7,8,0.88); position: sticky; top: 0; z-index: 5; backdrop-filter: blur(8px); }
.crumb { font-family: var(--font-mono); font-size: 12px; color: var(--muted); }
.crumb b { color: var(--ink); font-weight: 500; }
.spacer { flex: 1; }
.top-action { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border: 1px solid var(--line-2); border-radius: 6px; color: var(--ink-2); font-size: 12px; }
.top-action:hover { background: var(--surface); color: var(--ink); }
.top-action:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; box-shadow: 0 0 0 4px var(--accent-glow); }
.lang-toggle { display: inline-flex; border: 1px solid var(--line-2); border-radius: 6px; overflow: hidden; font-family: var(--font-mono); font-size: 11px; }
.lang-toggle button { all: unset; padding: 6px 10px; cursor: pointer; color: var(--muted); }
.lang-toggle button[aria-pressed="true"] { background: var(--surface-2); color: var(--ink); }
.lang-toggle button:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.page { padding: 24px 28px 64px; max-width: 1320px; }
.page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 22px; }
.page-head h1 { font-size: 24px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
.page-head .sub { color: var(--muted); font-size: 13px; max-width: 72ch; margin: 0; }
.page-actions { display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }
.btn { all: unset; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 14px; border-radius: 6px; font-size: 13px; font-weight: 500; border: 1px solid transparent; user-select: none; line-height: 1; }
.btn-primary { background: var(--accent); color: #04130b; border-color: var(--accent); }
.btn-primary:hover { filter: brightness(1.08); box-shadow: 0 0 0 4px var(--accent-glow); }
.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; box-shadow: 0 0 0 4px var(--accent-glow); }
.btn-ghost { border-color: var(--line-2); color: var(--ink-2); background: transparent; }
.btn-ghost:hover { background: var(--surface); color: var(--ink); }
.btn-danger { border-color: color-mix(in oklch, var(--danger), transparent 60%); color: var(--danger); }
.btn-danger:hover { background: color-mix(in oklch, var(--danger), transparent 88%); }
.btn-xs { padding: 4px 8px; font-size: 11px; }
.btn-sm { padding: 6px 10px; font-size: 12px; }
.link-button { all: unset; cursor: pointer; color: var(--muted); font-family: var(--font-mono); font-size: 11px; }
.link-button:hover { color: var(--ink); }
.link-button:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; color: var(--ink); }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); position: relative; }
.card-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--line); gap: 12px; }
.card-head h3 { margin: 0; font-size: 12px; font-weight: 500; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; font-family: var(--font-mono); }
.card-body { padding: 16px; }
.no-pad { padding: 0; }
.overflow-hidden { overflow: hidden; }
.fit-content { height: fit-content; }
.pill { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 11px; padding: 3px 8px; border-radius: 999px; border: 1px solid var(--line-2); color: var(--ink-2); line-height: 1; white-space: nowrap; flex-shrink: 0; }
.pill .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--muted); }
.pill.ok { color: var(--accent); border-color: color-mix(in oklch, var(--accent), transparent 60%); background: color-mix(in oklch, var(--accent), transparent 92%); }
.pill.ok .dot { background: var(--accent); }
.pill.warn { color: var(--warn); border-color: color-mix(in oklch, var(--warn), transparent 60%); background: color-mix(in oklch, var(--warn), transparent 92%); }
.pill.warn .dot { background: var(--warn); }
.pill.err { color: var(--danger); border-color: color-mix(in oklch, var(--danger), transparent 60%); background: color-mix(in oklch, var(--danger), transparent 92%); }
.pill.err .dot { background: var(--danger); }
.pill.info { color: var(--info); border-color: color-mix(in oklch, var(--info), transparent 60%); background: color-mix(in oklch, var(--info), transparent 92%); }
.pill.info .dot { background: var(--info); }
.pill.solid { background: var(--surface-2); color: var(--ink); }
.pill.prio-high { color: var(--danger); border-color: color-mix(in oklch, var(--danger), transparent 60%); background: color-mix(in oklch, var(--danger), transparent 92%); }
.pill.prio-mid { color: var(--warn); border-color: color-mix(in oklch, var(--warn), transparent 60%); background: color-mix(in oklch, var(--warn), transparent 92%); }
.pill.prio-low { color: var(--info); border-color: color-mix(in oklch, var(--info), transparent 60%); background: color-mix(in oklch, var(--info), transparent 92%); }
.kv { display: grid; grid-template-columns: 140px 1fr; row-gap: 10px; column-gap: 16px; }
.kv .k { color: var(--muted); font-family: var(--font-mono); font-size: 12px; padding-top: 2px; }
.kv .v { color: var(--ink); font-size: 13px; overflow-wrap: anywhere; }
.kv .v.mono { font-family: var(--font-mono); font-size: 12.5px; color: var(--ink-2); }
.info-list { display: flex; flex-direction: column; gap: 14px; }
.info-list .row { display: flex; flex-direction: column; gap: 4px; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
.info-list .row:last-child { border-bottom: none; padding-bottom: 0; }
.info-list .k { color: var(--muted); font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em; }
.info-list .v { color: var(--ink); font-size: 13px; overflow-wrap: anywhere; }
.info-list .v.mono { font-family: var(--font-mono); font-size: 12px; color: var(--ink-2); }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 12px; color: var(--ink-2); font-weight: 500; }
.wide { grid-column: 1 / -1; }
.input, .select, textarea { all: unset; box-sizing: border-box; width: 100%; background: var(--bg); border: 1px solid var(--line-2); border-radius: 6px; padding: 9px 12px; color: var(--ink); font-family: var(--font-mono); font-size: 12.5px; transition: border-color 0.15s, box-shadow 0.15s; }
.input:focus, .select:focus, textarea:focus { border-color: var(--accent-dim); box-shadow: 0 0 0 3px var(--accent-glow); }
.input::placeholder { color: var(--muted-2); }
.select { appearance: none; background-image: linear-gradient(45deg, transparent 50%, var(--muted) 50%), linear-gradient(135deg, var(--muted) 50%, transparent 50%); background-position: calc(100% - 16px) 50%, calc(100% - 11px) 50%; background-size: 5px 5px, 5px 5px; background-repeat: no-repeat; padding-right: 32px; }
.tbl, .data-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl thead th, .data-tbl thead th { text-align: left; font-weight: 500; color: var(--muted); font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; padding: 10px 14px; border-bottom: 1px solid var(--line); background: var(--bg-2); position: sticky; top: 0; z-index: 1; }
.tbl tbody td, .data-tbl tbody td { padding: 11px 14px; border-bottom: 1px solid var(--line); color: var(--ink-2); vertical-align: top; }
.tbl tbody tr:hover td, .data-tbl tbody tr:hover td { background: var(--surface-2); color: var(--ink); }
.tbl .mono, .data-tbl .mono { font-family: var(--font-mono); font-size: 12px; }
.tbl .right { text-align: right; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.grid-2-3 { display: grid; grid-template-columns: 1fr 1.6fr; gap: 16px; }
.grid-1-2 { display: grid; grid-template-columns: 1fr 2fr; gap: 16px; }
.readiness { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 20px; padding: 18px 22px; border: 1px solid var(--line); border-radius: var(--radius); background: linear-gradient(180deg, color-mix(in oklch, var(--accent), transparent 92%), transparent 60%), var(--surface); position: relative; overflow: hidden; margin-bottom: 16px; }
.readiness::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--accent); }
.readiness h2 { margin: 0; font-size: 18px; letter-spacing: -0.01em; }
.readiness p { margin: 4px 0 0; color: var(--muted); font-size: 13px; }
.ring { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: conic-gradient(var(--accent) 0 100%, var(--line) 100% 100%); position: relative; }
.ring::after { content: ""; position: absolute; inset: 4px; border-radius: 50%; background: var(--surface); }
.ring span { position: relative; z-index: 1; font-family: var(--font-mono); font-size: 11px; color: var(--accent); font-weight: 600; letter-spacing: 0.06em; }
.readiness.partial::before { background: var(--warn); }
.readiness.partial .ring { background: conic-gradient(var(--warn) 0 65%, var(--line) 65% 100%); }
.readiness.partial .ring span { color: var(--warn); }
.readiness.blocked::before { background: var(--danger); }
.readiness.blocked .ring { background: conic-gradient(var(--danger) 0 30%, var(--line) 30% 100%); }
.readiness.blocked .ring span { color: var(--danger); }
.next-cmd { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--bg); border: 1px dashed var(--line-2); border-radius: 8px; font-family: var(--font-mono); font-size: 12.5px; color: var(--ink); min-width: 0; }
.next-cmd .prefix { color: var(--accent); user-select: none; }
.next-cmd span:nth-child(2) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.copy { margin-left: auto; color: var(--muted); border: 1px solid var(--line-2); border-radius: 4px; padding: 3px 8px; font-size: 11px; cursor: pointer; background: transparent; }
.copy:hover { color: var(--ink); background: var(--surface); }
.copy:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; color: var(--ink); box-shadow: 0 0 0 3px var(--accent-glow); }
.segment { display: inline-flex; padding: 3px; background: var(--bg); border: 1px solid var(--line-2); border-radius: 8px; }
.segment button { all: unset; cursor: pointer; padding: 6px 14px; font-size: 12px; color: var(--ink-2); border-radius: 5px; font-family: var(--font-mono); }
.segment button[aria-pressed="true"] { background: var(--surface-2); color: var(--ink); box-shadow: 0 0 0 1px var(--line-2); }
.split { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; min-height: 480px; }
.audit-row { cursor: pointer; }
.audit-row.selected td { background: color-mix(in oklch, var(--accent), transparent 94%); color: var(--ink); }
.audit-row.selected td:first-child { box-shadow: inset 2px 0 0 var(--accent); }
.terminal { background: #04060a; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; font-family: var(--font-mono); font-size: 12.5px; }
.terminal-head { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg-2); border-bottom: 1px solid var(--line); font-size: 11px; color: var(--muted); }
.terminal-head .lights { display: flex; gap: 5px; }
.terminal-head .lights span { width: 9px; height: 9px; border-radius: 50%; background: var(--line-2); }
.terminal-body { padding: 14px 16px; color: #c9d3da; max-height: 380px; overflow: auto; line-height: 1.7; white-space: pre-wrap; overflow-wrap: anywhere; }
.line-prompt { color: var(--accent); }
.line-mute { color: var(--muted); }
.line-key { color: var(--info); }
.line-ok { color: var(--accent); }
.line-warn { color: var(--warn); }
.tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--line); margin-bottom: 16px; }
.tabs button { all: unset; cursor: pointer; padding: 10px 14px; font-size: 13px; color: var(--muted); border-bottom: 2px solid transparent; margin-bottom: -1px; }
.tabs button[aria-pressed="true"] { color: var(--ink); border-bottom-color: var(--accent); }
.tabs button:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; color: var(--ink); background: var(--surface-2); }
.flow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; margin: 16px 0; }
.flow-step { padding: 14px; border-left: 1px solid var(--line); position: relative; }
.flow-step:first-child { border-left: none; }
.flow-step .num { font-family: var(--font-mono); font-size: 10px; color: var(--muted-2); letter-spacing: 0.1em; }
.flow-step .title { font-size: 13px; margin: 4px 0 2px; font-weight: 500; }
.flow-step .desc { font-size: 11px; color: var(--muted); font-family: var(--font-mono); }
.flow-step .marker { width: 8px; height: 8px; border-radius: 50%; background: var(--line-2); margin-bottom: 8px; }
.flow-step.done .marker { background: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
.flow-step.active .marker { background: var(--accent); animation: pulse 1.5s infinite; }
.page-view { display: none; }
.page-view.active { display: block; }
.md-shell { display: grid; grid-template-columns: 340px 1fr; gap: 16px; min-height: 600px; }
.md-list { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); display: flex; flex-direction: column; overflow: hidden; }
.md-list-head { padding: 12px; border-bottom: 1px solid var(--line); }
.md-search { font-family: var(--font-sans); font-size: 12.5px; }
.md-files { overflow-y: auto; flex: 1; }
.md-file { all: unset; display: block; cursor: pointer; padding: 12px 14px; border-bottom: 1px solid var(--line); width: 100%; box-sizing: border-box; }
.md-file:hover { background: var(--surface-2); }
.md-file:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; background: var(--surface-2); }
.md-file.selected { background: color-mix(in oklch, var(--accent), transparent 92%); box-shadow: inset 2px 0 0 var(--accent); }
.md-file-name { font-size: 13px; font-weight: 500; color: var(--ink); margin-bottom: 4px; font-family: var(--font-mono); }
.md-file-meta { font-family: var(--font-mono); font-size: 10.5px; color: var(--muted); display: flex; gap: 6px; margin-bottom: 6px; }
.md-file-snippet { font-size: 11.5px; color: var(--muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.md-viewer { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); display: flex; flex-direction: column; overflow: hidden; }
.md-viewer-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 14px 18px; border-bottom: 1px solid var(--line); }
.md-path { font-family: var(--font-mono); font-size: 11.5px; color: var(--muted); overflow-wrap: anywhere; }
.md-path b { color: var(--ink); font-weight: 500; }
.md-body { padding: 22px 26px 36px; overflow-y: auto; max-height: 720px; line-height: 1.7; color: var(--ink-2); }
.md-body h1 { font-family: var(--font-mono); font-size: 18px; color: var(--ink); margin: 0 0 6px; font-weight: 600; }
.md-body h2 { font-family: var(--font-mono); font-size: 13px; color: var(--accent); margin: 24px 0 8px; font-weight: 600; letter-spacing: 0.02em; }
.md-body p { margin: 8px 0; font-size: 13.5px; }
.md-body ul, .md-body ol { margin: 8px 0; padding-left: 22px; font-size: 13.5px; }
.md-body li { margin: 4px 0; }
.md-body code { font-family: var(--font-mono); font-size: 12px; background: var(--bg); padding: 1px 6px; border-radius: 4px; color: var(--accent); border: 1px solid var(--line); }
.pg-grid { display: grid; grid-template-columns: 360px 1fr; gap: 16px; }
.cmd-preview { background: #04060a; border: 1px solid var(--line); border-radius: 8px; padding: 14px 16px; font-family: var(--font-mono); font-size: 13px; color: var(--ink); line-height: 1.6; display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
.cmd-preview .prompt { color: var(--accent); user-select: none; flex-shrink: 0; }
.cmd-preview .cmd-text { flex: 1; word-break: break-all; }
.cmd-list { display: flex; flex-direction: column; gap: 1px; padding: 6px; }
.cmd-item { all: unset; cursor: pointer; padding: 8px 12px; border-radius: 6px; display: grid; grid-template-columns: 80px 1fr auto; gap: 10px; align-items: center; }
.cmd-item:hover { background: var(--surface-2); }
.cmd-item:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; background: var(--surface-2); }
.cmd-item.selected { background: color-mix(in oklch, var(--accent), transparent 90%); box-shadow: inset 2px 0 0 var(--accent); }
.cmd-name { font-family: var(--font-mono); font-size: 12.5px; color: var(--ink); font-weight: 500; }
.cmd-desc { font-size: 11px; color: var(--muted); }
.cmd-tag { font-family: var(--font-mono); font-size: 10px; padding: 2px 6px; border-radius: 3px; background: var(--bg); border: 1px solid var(--line-2); color: var(--muted); }
.cmd-tag.write { color: var(--danger); border-color: color-mix(in oklch, var(--danger), transparent 60%); }
.src-banner { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr auto; gap: 24px; align-items: center; padding: 14px 18px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); margin-bottom: 14px; }
.src-banner .key { font-family: var(--font-mono); font-size: 10.5px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
.src-banner .val, .src-banner .name-val { font-family: var(--font-mono); font-size: 12.5px; color: var(--ink); margin-top: 4px; overflow-wrap: anywhere; }
.src-banner .name-val { font-family: var(--font-sans); font-weight: 500; font-size: 14px; }
.filter-bar { display: grid; grid-template-columns: 1fr auto; gap: 8px; padding: 10px 12px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); margin-bottom: 14px; }
.data-tbl tbody tr { cursor: pointer; }
.cell-title { color: var(--ink); font-weight: 500; max-width: 240px; }
.cell-desc { color: var(--muted); font-size: 12px; line-height: 1.4; max-width: 340px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.avatar { width: 22px; height: 22px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-dim), var(--info)); display: inline-flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 10.5px; color: #04130b; font-weight: 600; flex-shrink: 0; }
.att-badge { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-mono); font-size: 11px; color: var(--muted); padding: 2px 7px; border: 1px solid var(--line-2); border-radius: 4px; }
.data-tabs { display: flex; align-items: center; gap: 4px; margin-bottom: 12px; }
.data-tabs button { all: unset; cursor: pointer; padding: 8px 14px; font-size: 12.5px; color: var(--muted); border-radius: 6px; font-family: var(--font-mono); }
.data-tabs button[aria-pressed="true"] { background: var(--surface-2); color: var(--ink); box-shadow: inset 0 0 0 1px var(--line-2); }
.data-tabs button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; color: var(--ink); background: var(--surface-2); }
.data-tabs .count { font-family: var(--font-mono); font-size: 10.5px; color: var(--muted-2); margin-left: 4px; }
.field-row { display: grid; grid-template-columns: 24px 1.4fr 100px 1fr auto; gap: 12px; padding: 10px 14px; border-bottom: 1px solid var(--line); align-items: center; font-size: 13px; }
.field-row:last-child { border-bottom: none; }
.field-row .num { font-family: var(--font-mono); color: var(--muted-2); font-size: 11px; }
.field-row .name { font-weight: 500; }
.field-row .type { font-family: var(--font-mono); font-size: 11px; color: var(--info); }
.field-row .opts { color: var(--muted); font-size: 12px; overflow-wrap: anywhere; }
.row-flex { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.stack-sm { display: flex; flex-direction: column; gap: 8px; }
.stack-md { display: flex; flex-direction: column; gap: 16px; }
.text-mono { font-family: var(--font-mono); }
.text-muted { color: var(--muted); }
.push-right { margin-left: auto; }
.top-gap { margin-top: 10px; }
.spacer-block { height: 16px; }
.divider { height: 1px; background: var(--line); margin: 14px -16px; }
.empty-hint { text-align: center; padding: 40px 20px; color: var(--muted); border: 1px dashed var(--line-2); border-radius: 8px; font-family: var(--font-mono); font-size: 12px; }
.page-terminal { margin-top: 16px; }
.filter-grid { display: grid; grid-template-columns: 2fr repeat(4, 1fr) auto; gap: 10px; }
.filter-row { margin-top: 10px; }
.check { font-family: var(--font-mono); font-size: 11px; color: var(--muted); display: inline-flex; align-items: center; gap: 6px; }
.mini-input { max-width: 160px; }
.table-scroll { max-height: 560px; overflow: auto; }
.compact-grid { gap: 12px; }
.response-terminal { margin: 0 16px 16px; }
[hidden] { display: none !important; }
@media (max-width: 1080px) {
  .app { grid-template-columns: 1fr; }
  .sidebar { position: relative; height: auto; }
  .nav { flex-direction: row; overflow-x: auto; padding-bottom: 4px; }
  .sidebar-foot { display: none; }
  .grid-3, .grid-2, .grid-2-3, .grid-1-2, .split, .pg-grid, .md-shell, .src-banner, .filter-grid { grid-template-columns: 1fr; }
  .readiness { grid-template-columns: 1fr; }
  .flow { grid-template-columns: 1fr 1fr; }
  .page-head { align-items: flex-start; flex-direction: column; }
}
@media (max-width: 720px) {
  .page { padding: 18px 14px 48px; }
  .topbar { padding: 12px 14px; gap: 8px; flex-wrap: wrap; }
  .flow { grid-template-columns: 1fr; }
  .field-row { grid-template-columns: 24px 1fr; }
  .field-row .type, .field-row .opts, .field-row .pill { grid-column: 2; }
}`;
}

export function dashboardAppScript(): string {
  const catalog = JSON.stringify(dashboardLanguageCatalog);
  return `const CATALOG=${catalog};
const STORAGE_KEY=${JSON.stringify(DASHBOARD_LANGUAGE_STORAGE_KEY)};
const COMMANDS=[
  {name:'valid',desc:'前置條件檢查',tag:'safe',params:[{name:'workflow',label:'--workflow',type:'select',options:['dashboard','developer','qa'],value:'dashboard'}]},
  {name:'schema',desc:'欄位 metadata + samples',tag:'read',params:[{name:'sampleLimit',label:'--sample-limit',type:'number',value:'20'}]},
  {name:'list',desc:'列出記錄',tag:'read',params:[{name:'limit',label:'--limit',type:'number',value:'20'}]},
  {name:'get',desc:'讀一筆完整記錄',tag:'read',params:[{name:'recordId',label:'record id',type:'text',required:true}]},
  {name:'filter',desc:'依欄位條件篩選',tag:'read',params:[{name:'field',label:'--field',type:'text',required:true},{name:'equals',label:'--equals',type:'text'},{name:'contains',label:'--contains',type:'text'},{name:'owner',label:'--owner',type:'text'},{name:'limit',label:'--limit',type:'number',value:'10'}]},
  {name:'search',desc:'文字搜尋',tag:'read',params:[{name:'text',label:'--text',type:'text',required:true},{name:'limit',label:'--limit',type:'number',value:'10'}]},
  {name:'triage',desc:'挑選可處理 bug',tag:'read',params:[{name:'owner',label:'--owner',type:'text'},{name:'limit',label:'--limit',type:'number',value:'10'}]},
  {name:'research',desc:'產生研究報告',tag:'read',params:[{name:'out',label:'--out',type:'text'},{name:'evidence',label:'--evidence',type:'text'}]},
  {name:'verify',desc:'QA 驗證',tag:'read',params:[{name:'recordId',label:'record id',type:'text',required:true},{name:'checks',label:'--checks',type:'text'}]},
  {name:'write',desc:'寫入(preview-first)',tag:'write',params:[{name:'op',label:'--op',type:'select',options:['create','update'],value:'create',required:true},{name:'recordId',label:'--record-id',type:'text'},{name:'fieldsJson',label:'--fields-json',type:'textarea',value:'{}',required:true},{name:'confirm',label:'--confirm',type:'checkbox'}]}
];
const state={page:'overview',status:null,config:null,schemaFields:[],auditEntries:[],auditDetail:null,auditDetailRequestId:0,command:'valid',commandDrafts:{},lastRun:null,runHistory:[],research:[],researchUnavailable:[],researchDir:'',selectedReportId:null,researchDetail:null,researchDetailRequestId:0,tableRecords:null,tableSchema:null,responseTab:'structured',loginFlowRequestId:0};
const $=(id)=>document.getElementById(id);
const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
const text=(value,fallback='—')=>value===undefined||value===null||value===''?fallback:String(value);
const esc=(value)=>text(value,'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',\"'\":'&#39;'}[c]));
function resolveLang(value){if(value==='zh-TW'||value==='en')return value;return navigator.language&&navigator.language.toLowerCase().startsWith('en')?'en':'zh-TW'}
function currentLang(){return resolveLang(document.documentElement.lang||localStorage.getItem(STORAGE_KEY))}
function applyLanguage(value){const lang=resolveLang(value);document.documentElement.lang=lang;for(const el of $$('[data-i18n]')){const key=el.getAttribute('data-i18n');if(CATALOG[lang]&&CATALOG[lang][key])el.textContent=CATALOG[lang][key]}for(const btn of $$('.lang-toggle button'))btn.setAttribute('aria-pressed',btn.dataset.lang===lang?'true':'false');localStorage.setItem(STORAGE_KEY,lang);updateCrumb()}
async function api(path,options){const response=await fetch(path,{...options,headers:{'content-type':'application/json',...(options&&options.headers||{})}});const data=await response.json().catch(()=>({status:'error',issues:[{message:'Invalid JSON response'}]}));if(!response.ok&&data.status!=='error')throw new Error('HTTP '+response.status);return data}
function pretty(value){return JSON.stringify(value,null,2)}
function terminalJson(id,value){const node=$(id);if(node)node.textContent=pretty(value)}
function setHtml(id,html){const node=$(id);if(node)node.innerHTML=html}
function pillClass(status){return status==='ok'||status==='ready'||status==='linked'?'ok':status==='error'||status==='failed'||status==='blocked'||status==='missing'?'err':status==='partial'||status==='waiting'||status==='expired'?'warn':status==='info'?'info':'solid'}
function pill(status,label){return '<span class=\"pill '+pillClass(status)+'\"><span class=\"dot\"></span>'+esc(label||status)+'</span>'}
function setPill(id,status,label){const node=$(id);if(!node)return;node.className='pill '+pillClass(status);node.innerHTML='<span class=\"dot\"></span>'+esc(label||status)}
function kv(entries){return entries.map(([k,v,mono])=>'<div class=\"k\">'+esc(k)+'</div><div class=\"v '+(mono?'mono':'')+'\">'+esc(v)+'</div>').join('')}
function rows(entries){return entries.map(([k,v,mono])=>'<div class=\"row\"><span class=\"k\">'+esc(k)+'</span><span class=\"v '+(mono?'mono':'')+'\">'+esc(v)+'</span></div>').join('')}
function copyText(value){if(!value)return; if(navigator.clipboard){navigator.clipboard.writeText(value).catch(()=>{});}}
function renderIssues(issues){return '<div class=\"stack-sm\">'+((issues||[]).map((issue)=>'<div class=\"empty-hint\"><div class=\"text-mono line-warn\">'+esc(issue.code||'issue')+'</div><div>'+esc(issue.message||'')+'</div><div class=\"text-muted\">'+esc(issue.remediation||'Retry after checking configuration.')+'</div></div>').join('')||'<div class=\"empty-hint\">no remediation</div>')+'</div>'}
function uniqueIssues(issues){const seen=new Set();return (issues||[]).filter((issue)=>{const key=[issue.code,issue.message,issue.remediation].join('\\u0000');if(seen.has(key))return false;seen.add(key);return true})}
function updateCrumb(){const active=$$('.sidebar .nav button[data-page=\"'+state.page+'\"]').at(0);const labelNode=active&&active.querySelector('[data-i18n]');const key=labelNode&&labelNode.getAttribute('data-i18n');const lang=currentLang();$('crumb-page').textContent=(key&&CATALOG[lang]&&CATALOG[lang][key])||state.page}
function renderBinding(binding){const data=binding||{};$('binding-status').textContent=text(data.status,'ready');$('binding-host').textContent=text(data.host);$('binding-port').textContent=text(data.port)}
async function loadShellStatus(){const status=await api('/api/status');state.status=status;renderBinding(status.data&&status.data.binding);return status}
function switchPage(name,options={}){if(!name||!$(name+'-page'))name='overview';state.page=name;for(const page of $$('.page-view'))page.classList.toggle('active',page.dataset.page===name);for(const btn of $$('.sidebar .nav button[data-page]'))btn.setAttribute('aria-current',btn.dataset.page===name?'true':'false');updateCrumb();if(location.hash!=='#'+name)history.replaceState(null,'','#'+name);if(options.scroll!==false)window.scrollTo({top:0});loadPage(name)}
async function loadPage(name){try{if(name==='overview')await loadOverview();if(name==='config')await loadConfig();if(name==='auth')await loadAuth();if(name==='audit')await loadAudit();if(name==='research')await loadResearch();if(name==='table')await loadTable();if(name==='playground')renderPlayground()}catch(error){showPageError(name,error)}}
function showPageError(name,error){const target=$(name+'-page');const msg=error&&error.message?error.message:String(error);const node=target&&target.querySelector('.page-head');if(node){let err=target.querySelector('.page-error');if(!err){err=document.createElement('div');err.className='page-error empty-hint';node.after(err)}err.textContent=CATALOG[document.documentElement.lang]&&CATALOG[document.documentElement.lang].errorState?CATALOG[document.documentElement.lang].errorState+': '+msg:msg}}
async function loadOverview(){const status=await loadShellStatus();const data=status.data||{};const readiness=(data.overview&&data.overview.readiness)||{};const readStatus=readiness.status||status.status;const card=$('readiness-card');card.classList.toggle('blocked',readStatus==='blocked'||status.status==='error');card.classList.toggle('partial',readStatus==='partial'||status.status==='partial');$('readiness-ring').textContent=readStatus==='ready'?'READY':readStatus==='blocked'?'BLOCK':'PART';$('readiness-summary').textContent='dataSource: '+status.dataSource+' · blocking '+((readiness.blockingIssues||[]).length)+' / partial '+((readiness.partialIssues||[]).length);const issues=[...(readiness.blockingIssues||[]),...(readiness.partialIssues||[])];setHtml('readiness-pills',issues.length?issues.slice(0,3).map((i)=>pill('partial',i.code)).join(''):pill('ok','ready'));$('next-command').textContent=(data.nextSafeActions&&data.nextSafeActions[0])||readiness.nextSafeCommand||'lark-bitable dashboard';renderOverviewCards(data);await loadRecentActivity();try{state.config=await api('/api/config');renderMappings(state.config.data&&state.config.data.draft)}catch{}}
function renderOverviewCards(data){const source=(data.overview&&data.overview.source)||{};const auth=(data.overview&&data.overview.auth)||{};const mode=(data.overview&&data.overview.mode)||{};$('source-ds').textContent=source.sourceUrl?'file-backed':'missing';setHtml('source-kv',kv([['name',source.name],['appToken',source.appToken,true],['tableId',source.tableId,true],['viewId',source.viewId,true]]));setPill('auth-pill',auth.status==='ready'?'ok':auth.status||'missing','auth · '+(auth.status||'missing'));setHtml('auth-kv',kv([['account',auth.accountLabel],['domain',auth.domain,true],['scopes',(auth.scopes||[]).join(', ')],['expires',auth.expiresAt,true]]));setPill('mode-pill','info',mode.active||'Developer');setHtml('mode-kv',kv([['active',mode.active],['source',mode.source,true],['localOnly',data.localOnly?'true':'false',true],['web login','not required',true]]))}
function renderMappings(draft){if(!draft){setHtml('mapping-list','<div class=\"empty-hint\">missing config</div>');return}const items=[['01','Status',draft.statusField,'statusField'],['02','Priority',draft.priorityField,'priorityField'],['03','Title',draft.titleField,'titleField'],['04','Owner',draft.ownerField,'ownerField']];setHtml('mapping-list',items.map((item)=>'<div class=\"field-row\"><div class=\"num\">'+item[0]+'</div><div class=\"name\">'+esc(item[1])+'</div><div class=\"type\">FIELD</div><div class=\"opts\">→ <code>'+esc(item[3])+'</code> · '+esc(item[2])+'</div>'+pill(item[2]?'ok':'missing',item[2]?'mapped':'missing')+'</div>').join(''))}
async function loadRecentActivity(){const result=await api('/api/audit?limit=5').catch(()=>({data:{entries:[]}}));const entries=(result.data&&result.data.entries)||[];setHtml('recent-activity',entries.length?entries.map((e)=>'<tr><td class=\"mono text-muted\">'+esc(shortTime(e.startedAt))+'</td><td>'+pill(e.status,e.status)+'</td><td class=\"mono\">'+esc(e.command)+'</td><td class=\"right text-muted\">'+esc(duration(e.durationMs))+'</td></tr>').join(''):'<tr><td colspan=\"4\"><div class=\"empty-hint\">no audit entries</div></td></tr>')}
async function loadConfig(){const result=await api('/api/config');state.config=result;const draft=result.data&&result.data.draft||{};const form=$('config-form');updateSchemaFieldOptions(currentMappingValues(draft));for(const [key,value] of Object.entries(draft)){const input=form.elements.namedItem(key);if(!input||key==='larkAppSecret')continue;if(key==='scopes'&&Array.isArray(value))input.value=value.join(' ');else input.value=value==null?'':String(value)}$('secret-state').textContent=draft.larkAppSecretState||'missing';terminalJson('config-output',result);renderMappings(draft)}
function collectConfigForm(){const form=$('config-form');const data=Object.fromEntries(new FormData(form).entries());const output={};for(const [key,value] of Object.entries(data)){if(value!==''&&value!==undefined)output[key]=value}if(output.callbackPort)output.callbackPort=Number(output.callbackPort);if(output.scopes)output.scopes=String(output.scopes).split(/[\\s,]+/).filter(Boolean);return output}
async function saveConfig(event){event.preventDefault();const submitted=collectConfigForm();const saved=await api('/api/config',{method:'POST',body:JSON.stringify(submitted)});terminalJson('config-output',saved);if(saved.status==='error'){setHtml('schema-discovery',renderIssues(saved.issues));return}state.config=saved;clearSecretInput();await loadOverview();await loadConfig()}
function clearSecretInput(){const input=$('config-form').elements.namedItem('larkAppSecret');if(input)input.value=''}
function currentMappingValues(draft={}){return [draft.statusField,draft.priorityField,draft.titleField,draft.ownerField,...state.schemaFields].filter(Boolean).map(String)}
function updateSchemaFieldOptions(values=[]){const unique=[...new Set(['',...values])];for(const select of $$('[data-schema-field]')){const current=select.value;select.innerHTML=unique.map((value)=>'<option value=\"'+esc(value)+'\">'+(value?esc(value):'未設定')+'</option>').join('');select.value=unique.includes(current)?current:(unique.includes(select.value)?select.value:'')}}
async function discoverSchema(){const result=await api('/api/table/schema');const fields=(result.data&&result.data.fields)||[];state.schemaFields=fields.map((f)=>f.fieldName).filter(Boolean);updateSchemaFieldOptions([...currentMappingValues(collectConfigForm()),...state.schemaFields]);terminalJson('config-output',result);const issues=uniqueIssues([...(result.issues||[]),...((result.data&&result.data.issues)||[])]);if(result.status!=='ok'||issues.length){setHtml('schema-discovery','<div class=\"text-mono line-warn\">schema-discovery</div>'+renderIssues(issues))}else{setHtml('schema-discovery','<div class=\"empty-hint\">schema-discovery ready · '+state.schemaFields.length+' fields</div>')}}
async function loadAuth(){const status=await loadShellStatus();const auth=(status.data&&status.data.overview&&status.data.overview.auth)||{};setPill('auth-state-pill',auth.status==='ready'?'ok':auth.status||'missing',auth.status||'missing');setHtml('auth-state-list',rows([['account',auth.accountLabel],['domain',auth.domain,true],['scopes',(auth.scopes||[]).join(', ')],['expires',auth.expiresAt,true],['storage',auth.storagePath,true]]));}
function resetLoginFlow(){state.loginFlowRequestId++;$('login-flow-status').textContent='idle';$('auth-url').textContent='authorization URL will appear here';markFlow('idle')}
async function startLogin(){const requestId=++state.loginFlowRequestId;const scopes=$('auth-scopes').value.split(/[\\s,]+/).filter(Boolean);const result=await api('/api/auth/login/start',{method:'POST',body:JSON.stringify({openBrowser:false,scopes})});if(requestId!==state.loginFlowRequestId)return;const flow=result.data||{};$('login-flow-status').textContent=flow.status||'failed';$('auth-url').textContent=flow.authorizationUrl||'no authorization URL';markFlow(flow.status);if(flow.authorizationUrl)window.open(flow.authorizationUrl,'_blank','noopener');if(flow.flowId)pollLogin(flow.flowId,requestId)}
function markFlow(status){const steps=$$('#login-flow-steps .flow-step');steps.forEach((s)=>{s.classList.remove('done','active')});if(status==='waiting'){steps[0].classList.add('done');steps[1].classList.add('done');steps[2].classList.add('active')}else if(status==='ready'){steps.forEach((s)=>s.classList.add('done'))}else if(status==='failed'||status==='canceled'||status==='expired'){steps[2].classList.add('active')}}
async function pollLogin(flowId,requestId){for(let i=0;i<90;i++){await new Promise((resolve)=>setTimeout(resolve,2000));if(requestId!==state.loginFlowRequestId)return;const result=await api('/api/auth/login/'+encodeURIComponent(flowId));if(requestId!==state.loginFlowRequestId)return;const flow=result.data||{};$('login-flow-status').textContent=flow.status;markFlow(flow.status);if(flow.status&&flow.status!=='waiting'){await loadAuth();return}}}
async function logoutAuth(){resetLoginFlow();const result=await api('/api/auth/logout',{method:'POST',body:'{}'});terminalJson('auth-url',result);$('auth-url').textContent='authorization URL will appear here';await loadAuth();await loadOverview()}
async function loadAudit(){const form=$('audit-filter-form');const params=new URLSearchParams();if(form){for(const [key,value] of new FormData(form).entries()){if(value)params.set(key,String(value))}for(const cb of form.querySelectorAll('input[type=\"checkbox\"]')){if(cb.checked)params.set(cb.name,'true')}}const result=await api('/api/audit?'+params.toString());state.auditEntries=(result.data&&result.data.entries)||[];$('audit-count').textContent=state.auditEntries.length+' entries';$('audit-entry-count').textContent=String(state.auditEntries.length);setHtml('audit-entries',state.auditEntries.length?state.auditEntries.map((e)=>'<tr class=\"audit-row\" data-id=\"'+esc(e.id)+'\"><td class=\"mono\">'+esc(shortTime(e.startedAt))+'</td><td class=\"mono\">'+esc(e.command)+'</td><td>'+pill(e.status,e.status)+'</td><td>'+esc(e.mode&&e.mode.active)+'</td><td class=\"mono right\">'+esc(duration(e.durationMs))+'</td></tr>').join(''):'<tr><td colspan=\"5\"><div class=\"empty-hint\">no audit entries</div></td></tr>');const currentId=state.auditDetail&&state.auditDetail.id;const next=state.auditEntries.find((entry)=>entry.id===currentId)||state.auditEntries[0];if(next)await loadAuditDetail(next.id);else clearAuditDetail()}
function clearAuditDetail(){state.auditDetailRequestId++;state.auditDetail=null;$('audit-detail-title').textContent='Detail';setPill('audit-detail-status','solid','empty');setHtml('audit-detail','<div class=\"empty-hint\">目前沒有可顯示的資料。</div>')}
function renderAuditDetailError(id,result){state.auditDetail=null;for(const row of $$('.audit-row'))row.classList.toggle('selected',row.dataset.id===id);$('audit-detail-title').textContent='Detail · '+String(id).slice(0,12);setPill('audit-detail-status','error','error');setHtml('audit-detail',renderIssues(result&&result.issues&&result.issues.length?result.issues:[{code:'audit-detail-unavailable',message:'Audit detail could not be loaded.',remediation:'Refresh the audit list or adjust filters, then select an available entry.'}]))}
async function loadAuditDetail(id){const requestId=++state.auditDetailRequestId;state.auditDetail=null;const result=await api('/api/audit/'+encodeURIComponent(id)).catch((error)=>({status:'error',issues:[{code:'audit-detail-unavailable',message:error&&error.message?error.message:String(error),remediation:'Refresh the audit list or adjust filters, then select an available entry.'}]}));if(requestId!==state.auditDetailRequestId)return;if(result.status==='error'){renderAuditDetailError(id,result);return}const detail=(result.data&&result.data.entry)||result.data;if(!detail){renderAuditDetailError(id,{issues:[{code:'audit-detail-empty',message:'Audit detail response did not include an entry.',remediation:'Refresh the audit list and select another entry.'}]});return}state.auditDetail=detail;for(const row of $$('.audit-row'))row.classList.toggle('selected',row.dataset.id===id);$('audit-detail-title').textContent='Detail · '+id.slice(0,12);setPill('audit-detail-status',detail.status,detail.status);setHtml('audit-detail','<div class=\"kv\">'+kv([['command',detail.command,true],['argv',pretty(detail.argv||[]),true],['started',detail.startedAt,true],['finished',detail.finishedAt,true],['duration',duration(detail.durationMs),true],['mode',detail.mode&&detail.mode.active]])+'</div><div class=\"divider\"></div><div class=\"stack-sm\">'+((detail.evidenceSummary||detail.evidence||[]).map((e)=>'<div class=\"pill solid\">'+esc(typeof e==='string'?e:pretty(e))+'</div>').join('')||'<div class=\"empty-hint\">no evidence</div>')+'</div><div class=\"divider\"></div><div class=\"terminal\"><div class=\"terminal-body\">'+esc(pretty(detail))+'</div></div>')}
function renderPlayground(){renderCommandList();renderParamForm();renderRunHistory();renderResponse()}
function renderCommandList(){setHtml('cmd-list',COMMANDS.map((cmd)=>'<button class=\"cmd-item '+(state.command===cmd.name?'selected':'')+'\" data-command=\"'+cmd.name+'\"><span class=\"cmd-name\">'+cmd.name+'</span><span class=\"cmd-desc\">'+esc(cmd.desc)+'</span><span class=\"cmd-tag '+(cmd.tag==='write'?'write':'')+'\">'+cmd.tag+'</span></button>').join(''))}
function renderParamForm(){const cmd=COMMANDS.find((item)=>item.name===state.command)||COMMANDS[0];$('params-title').textContent='Parameters · '+cmd.name;$('command-safety').textContent=cmd.tag;const draft=state.commandDrafts[cmd.name]||{};setHtml('playground-form',cmd.params.map((param)=>{const controlId='pg-param-'+cmd.name+'-'+param.name;return '<div class=\"field\"><label for=\"'+controlId+'\">'+esc(param.label)+' '+(param.required?'<span class=\"text-muted text-mono\">required</span>':'')+'</label>'+paramInput(param,draft[param.name],controlId)+'</div>'}).join('')||'<div class=\"empty-hint\">no parameters</div>');updateCommandPreview()}
function paramInput(param,draftValue,controlId){const value=draftValue!==undefined?draftValue:param.value;if(param.type==='select')return '<select class=\"select\" id=\"'+controlId+'\" name=\"'+param.name+'\">'+param.options.map((o)=>'<option '+(o===value?'selected':'')+'>'+esc(o)+'</option>').join('')+'</select>';if(param.type==='checkbox')return '<input id=\"'+controlId+'\" type=\"checkbox\" name=\"'+param.name+'\" '+(value===true?'checked':'')+' /> <span class=\"text-muted text-mono\">explicit confirmation</span>';if(param.type==='textarea')return '<textarea class=\"input\" id=\"'+controlId+'\" name=\"'+param.name+'\" rows=\"4\">'+esc(value||'')+'</textarea>';return '<input class=\"input\" id=\"'+controlId+'\" name=\"'+param.name+'\" value=\"'+esc(value||'')+'\" '+(param.type==='number'?'inputmode=\"numeric\"':'')+' />'}
function collectPlaygroundParams(){const form=$('playground-form');const params={};if(!form)return params;for(const [key,value] of new FormData(form).entries()){if(value!=='')params[key]=value}for(const cb of form.querySelectorAll('input[type=\"checkbox\"]'))params[cb.name]=cb.checked;if(params.limit)params.limit=Number(params.limit);if(params.sampleLimit)params.sampleLimit=Number(params.sampleLimit);state.commandDrafts[state.command]=params;return params}
function updateCommandPreview(){const params=collectPlaygroundParams();const parts=['lark-bitable',state.command];for(const [key,value] of Object.entries(params)){if(value===false||value===''||value==null)continue;if(key==='recordId'&&(state.command==='get'||state.command==='verify')){parts.push(String(value));continue}const flag='--'+key.replace(/[A-Z]/g,(m)=>'-'+m.toLowerCase());if(value===true)parts.push(flag);else parts.push(flag,quote(String(value)))}parts.push('--json');$('cmd-preview-text').textContent=parts.join(' ')}
function quote(value){return /\\s/.test(value)?'\"'+value.replace(/\"/g,'\\\\\"')+'\"':value}
async function runPlayground(){updateCommandPreview();const params=collectPlaygroundParams();const confirmWrite=state.command==='write'&&params.confirm===true;const started=Date.now();const result=await api('/api/playground/run',{method:'POST',body:JSON.stringify({command:state.command,confirmWrite,parameters:params})});state.lastRun=result;state.runHistory.unshift({time:new Date().toISOString(),command:state.command,args:params,status:result.status,durationMs:Date.now()-started,result});state.runHistory=state.runHistory.slice(0,5);renderResponse();renderRunHistory();await loadRecentActivity()}
function renderResponse(){const run=state.lastRun;if(!run){$('response-title').textContent='idle';$('playground-output').textContent='Select a command and run it.';setHtml('playground-response-pills','');return}const data=run.data&&run.data.run||run.data||{};$('response-title').textContent='POST /api/playground/run · '+new Date().toISOString();setHtml('playground-response-pills',[pill(run.status,run.status),'<span class=\"pill solid\">'+esc(data.command||state.command)+'</span>',(data.evidence?'<span class=\"pill solid\">'+data.evidence.length+' evidence</span>':'')].join(''));if(state.responseTab==='human')$('playground-output').textContent=data.humanOutput||pretty(run);else if(state.responseTab==='audit')$('playground-output').textContent=pretty({auditEntryId:data.auditEntryId||null,issues:data.issues||run.issues||[],evidence:data.evidence||[],nextSafeActions:data.nextSafeActions||[],structuredOutput:data.structuredOutput||null,envelopeStatus:run.status});else $('playground-output').textContent=pretty(run)}
function renderRunHistory(){setHtml('run-history',state.runHistory.length?state.runHistory.map((r)=>'<tr><td class=\"mono\">'+esc(shortTime(r.time))+'</td><td class=\"mono\">'+esc(r.command)+'</td><td class=\"mono\">'+esc(pretty(r.args))+'</td><td>'+pill(r.status,r.status)+'</td><td class=\"right mono text-muted\">'+esc(duration(r.durationMs))+'</td></tr>').join(''):'<tr><td><div class=\"empty-hint\">no runs yet</div></td></tr>')}
async function loadResearch(){const query=$('research-search')&&$('research-search').value?('?text='+encodeURIComponent($('research-search').value)) : '';const result=await api('/api/research'+query);state.research=(result.data&&result.data.reports)||[];state.researchUnavailable=(result.data&&result.data.unavailableReports)||[];state.researchDir=(result.data&&result.data.researchDir)||state.researchDir||'~/.lark-bitable/research';$('research-count').textContent=state.research.length+' reports';const files=[...state.research.map((r)=>renderResearchFile(r)),...state.researchUnavailable.map((r)=>renderUnavailableResearchFile(r))].join('');setHtml('research-files',files||'<div class=\"empty-hint\">no research reports</div>');const selected=state.research.find((r)=>r.reportId===state.selectedReportId)||state.research[0];if(selected)await loadResearchDetail(selected.reportId);else clearResearchDetail()}
function renderResearchFile(r){return '<button class=\"md-file '+(state.selectedReportId===r.reportId?'selected':'')+'\" data-id=\"'+esc(r.reportId)+'\"><div class=\"md-file-name\">'+esc(r.name)+'</div><div class=\"md-file-meta\"><span>'+esc(r.selectedRecordId)+'</span><span>·</span><span>'+esc(shortTime(r.createdAt))+'</span></div><div class=\"md-file-snippet\">'+esc((r.risks||[]).join(' · ')||r.canonicalPath)+'</div></button>'}
function renderUnavailableResearchFile(r){return '<button class=\"md-file\" disabled data-unavailable=\"true\"><div class=\"md-file-name\">'+esc(r.name)+'</div><div class=\"md-file-meta\"><span>unavailable</span><span>·</span><span>'+esc(r.status||'skipped')+'</span></div><div class=\"md-file-snippet\">'+esc(r.reason)+'</div></button>'}
function clearResearchDetail(){state.researchDetailRequestId++;state.selectedReportId=null;state.researchDetail=null;$('research-path').innerHTML=esc(state.researchDir||'~/.lark-bitable/research')+'/<b>none</b>';setHtml('research-meta','');setHtml('research-body','<div class=\"empty-hint\">目前沒有可顯示的資料。</div>')}
function renderResearchDetailError(reportId,result){state.selectedReportId=reportId;state.researchDetail=null;for(const file of $$('.md-file'))file.classList.toggle('selected',file.dataset.id===reportId);$('research-path').innerHTML=esc(state.researchDir||'~/.lark-bitable/research')+'/<b>'+esc(reportId)+'</b>';setHtml('research-meta',pill('error','error'));setHtml('research-body',renderIssues(result&&result.issues&&result.issues.length?result.issues:[{code:'research-detail-unavailable',message:'Research detail could not be loaded.',remediation:'Reload reports or select another available report.'}]))}
async function loadResearchDetail(reportId){const requestId=++state.researchDetailRequestId;state.selectedReportId=reportId;state.researchDetail=null;for(const file of $$('.md-file'))file.classList.toggle('selected',file.dataset.id===reportId);const result=await api('/api/research/'+encodeURIComponent(reportId)).catch((error)=>({status:'error',issues:[{code:'research-detail-unavailable',message:error&&error.message?error.message:String(error),remediation:'Reload reports or select another available report.'}]}));if(requestId!==state.researchDetailRequestId)return;if(result.status==='error'){renderResearchDetailError(reportId,result);return}state.researchDetail=result.data&&result.data.report||result.data;const report=state.researchDetail||{};$('research-path').innerHTML=esc(report.canonicalPath||state.researchDir||'~/.lark-bitable/research')+'/<b>'+esc(report.name||reportId)+'</b>';setHtml('research-meta',[pill(report.outputLinkStatus||'file-backed',report.outputLinkStatus||'canonical'),'<span class=\"pill solid\">record: '+esc(report.selectedRecordId)+'</span>','<span class=\"pill solid\">'+((report.evidence||[]).length)+' evidence</span>'].join(''));setHtml('research-body',renderReport(report))}
function renderReport(report){const sections=[['Observed Facts',report.observedFacts],['Assumptions',report.assumptions],['Analysis',report.analysis],['Likely Causes',report.likelyCauses],['Recommended Fixes',report.recommendedFixes],['Risks',report.risks],['Next Actions',report.nextActions],['Evidence',report.evidence]];return '<h1># '+esc(report.name||'Research Report')+'</h1><p class=\"md-meta\">record: <code>'+esc(report.selectedRecordId)+'</code> · mode: '+esc(report.selectionMode||report.mode)+' · '+esc(report.createdAt)+'</p>'+sections.map(([title,value])=>'<h2>## '+esc(title)+'</h2>'+renderReportValue(value)).join('')}
function renderReportValue(value){if(!value||Array.isArray(value)&&value.length===0)return '<p class=\"text-muted\">—</p>';if(Array.isArray(value))return '<ul>'+value.map((item)=>'<li>'+esc(typeof item==='string'?item:pretty(item))+'</li>').join('')+'</ul>';return '<p>'+esc(value)+'</p>'}
async function loadTable(){const [records,schema,status]=await Promise.all([api('/api/table/records?limit=20').catch((e)=>({status:'error',issues:[{message:e.message}],data:{records:[]}})),api('/api/table/schema').catch((e)=>({status:'error',issues:[{message:e.message}],data:{fields:[]}})),loadShellStatus().catch(()=>null)]);state.tableRecords=records;state.tableSchema=schema;renderTable(status&&status.data)}
function renderTable(statusData){const source=statusData&&statusData.overview&&statusData.overview.source||{};setHtml('table-source-banner','<div><div class=\"key\">SOURCE</div><div class=\"name-val\">'+esc(source.name)+'</div></div><div><div class=\"key\">APP TOKEN</div><div class=\"val\">'+esc(source.appToken)+'</div></div><div><div class=\"key\">TABLE</div><div class=\"val\">'+esc(source.tableId)+'</div></div><div><div class=\"key\">VIEW</div><div class=\"val\">'+esc(source.viewId)+'</div></div>'+pill(source.sourceUrl?'ok':'missing',source.sourceUrl?'live':'missing'));renderRecords();renderSchema()}
function renderRecords(){const allRows=((state.tableRecords&&state.tableRecords.data&&state.tableRecords.data.records)||[]);const query=($('table-search')&&$('table-search').value||'').toLowerCase();const rows=query?allRows.filter((record)=>JSON.stringify(record).toLowerCase().includes(query)):allRows;$('records-count').textContent=String(rows.length);$('records-source').textContent=(state.tableRecords&&state.tableRecords.dataSource)||'missing';const fields=[...new Set(allRows.flatMap((r)=>Object.keys(r.fields||{})))].slice(0,8);setHtml('records-head','<tr><th>#</th><th>record id</th>'+fields.map((f)=>'<th>'+esc(f)+'</th>').join('')+'</tr>');setHtml('records-body',rows.length?rows.map((r,i)=>'<tr><td class=\"mono\">'+String(i+1).padStart(2,'0')+'</td><td class=\"mono\">'+esc(r.recordId||r.record_id)+'</td>'+fields.map((f)=>'<td>'+esc(formatCell(r.fields&&r.fields[f]))+'</td>').join('')+'</tr>').join(''):'<tr><td colspan=\"8\"><div class=\"empty-hint\">no records</div></td></tr>')}
function renderSchema(){const fields=(state.tableSchema&&state.tableSchema.data&&state.tableSchema.data.fields)||[];$('schema-count').textContent=String(fields.length);$('schema-source').textContent=(state.tableSchema&&state.tableSchema.dataSource)||'missing';setHtml('schema-body',fields.length?fields.map((f,i)=>'<div class=\"field-row\"><div class=\"num\">'+String(i+1).padStart(2,'0')+'</div><div class=\"name\">'+esc(f.fieldName)+'</div><div class=\"type\">FIELD</div><div class=\"opts\">non-empty '+esc(f.nonEmptyInSample)+' · '+esc((f.observedValues||[]).slice(0,4).join(', '))+'</div>'+pill('solid','sample')+'</div>').join(''):'<div class=\"empty-hint\">no schema fields</div>')}
function formatCell(value){if(value==null)return '';if(Array.isArray(value))return value.map(formatCell).join(', ');if(typeof value==='object')return JSON.stringify(value);return String(value)}
function shortTime(value){if(!value)return '—';const date=new Date(value);return Number.isNaN(date.getTime())?String(value):date.toLocaleString()}
function duration(ms){if(ms==null)return '—';return ms>=1000?(ms/1000).toFixed(1)+'s':ms+'ms'}
function bindEvents(){for(const btn of $$('button[data-page]'))btn.addEventListener('click',()=>switchPage(btn.dataset.page));for(const btn of $$('button[data-page-jump]'))btn.addEventListener('click',()=>switchPage(btn.dataset.pageJump));for(const btn of $$('.lang-toggle button'))btn.addEventListener('click',()=>applyLanguage(btn.dataset.lang));window.addEventListener('hashchange',()=>switchPage((location.hash||'#overview').slice(1),{scroll:false}));$('refresh-current').addEventListener('click',()=>loadPage(state.page));$('command-palette').addEventListener('click',()=>switchPage('playground'));$('overview-valid').addEventListener('click',async()=>{state.command='valid';renderPlayground();await runPlayground();switchPage('playground')});$('overview-next').addEventListener('click',()=>copyText($('next-command').textContent));document.addEventListener('click',(event)=>{const copy=event.target.closest('[data-copy-target]');if(copy)copyText($(copy.dataset.copyTarget).textContent);const audit=event.target.closest('.audit-row');if(audit)loadAuditDetail(audit.dataset.id);const cmd=event.target.closest('.cmd-item');if(cmd){state.command=cmd.dataset.command;renderPlayground()}const file=event.target.closest('.md-file[data-id]');if(file&&!file.disabled)loadResearchDetail(file.dataset.id)});window.addEventListener('keydown',(event)=>{if(!(event.metaKey || event.ctrlKey))return;const map={'1':'overview','2':'config','3':'auth','4':'audit','5':'playground','6':'research','7':'table'};if(map[event.key]){event.preventDefault();switchPage(map[event.key])}});$('config-form').addEventListener('submit',saveConfig);$('config-reset').addEventListener('click',loadConfig);$('config-discover').addEventListener('click',discoverSchema);$('auth-start').addEventListener('click',startLogin);$('auth-open').addEventListener('click',()=>{const url=$('auth-url').textContent;if(url&&url.startsWith('http'))window.open(url,'_blank','noopener')});$('auth-logout').addEventListener('click',logoutAuth);$('audit-filter-form').addEventListener('submit',(event)=>{event.preventDefault();loadAudit()});$('audit-export').addEventListener('click',()=>copyText(pretty(state.auditEntries)));$('playground-form').addEventListener('input',updateCommandPreview);$('playground-run').addEventListener('click',runPlayground);$('playground-clear').addEventListener('click',()=>{state.runHistory=[];renderRunHistory()});$('playground-copy-cli').addEventListener('click',()=>copyText($('cmd-preview-text').textContent));$('response-tabs').addEventListener('click',(event)=>{const btn=event.target.closest('button[data-response-tab]');if(!btn)return;state.responseTab=btn.dataset.responseTab;for(const tab of $$('#response-tabs button'))tab.setAttribute('aria-pressed',tab===btn?'true':'false');renderResponse()});$('research-load').addEventListener('click',loadResearch);$('research-search').addEventListener('change',loadResearch);$('research-copy-content').addEventListener('click',()=>copyText($('research-body').innerText));$('research-copy-path').addEventListener('click',()=>copyText(state.researchDetail&&state.researchDetail.canonicalPath));$('research-copy-dir').addEventListener('click',()=>copyText(state.researchDir));$('table-refresh').addEventListener('click',loadTable);$('table-export').addEventListener('click',()=>copyText(pretty({records:state.tableRecords,schema:state.tableSchema})));$('table-search').addEventListener('input',renderRecords);$('table-apply').addEventListener('click',renderRecords);for(const tab of $$('.data-tabs button'))tab.addEventListener('click',()=>{for(const btn of $$('.data-tabs button'))btn.setAttribute('aria-pressed',btn===tab?'true':'false');for(const pane of $$('[data-dpane]'))pane.hidden=pane.dataset.dpane!==tab.dataset.dtab})}
bindEvents();applyLanguage(localStorage.getItem(STORAGE_KEY));renderPlayground();loadShellStatus().catch(()=>{});switchPage((location.hash||'#overview').slice(1),{scroll:false});`;
}
