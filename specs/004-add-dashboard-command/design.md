# Dashboard Design Reference

**Source**: `../Lark Bitable Dashboard.html`
**Imported Surface**: The real app mockup is stored in the HTML design file
inside `script[type="__bundler/template"]`. The outer bundler loading shell,
thumbnail SVG, base64 font manifest, and blob URL unpacker are reference-only
and must not be copied into the CLI runtime.

## Visual Language

The dashboard uses a dark local developer console style: dense, operational,
terminal-adjacent, and evidence-oriented. It should feel like a tool for
debugging Lark Bitable workflows, not a marketing page.

- Background: almost-black canvas with subtle green radial glows.
- Primary accent: terminal green used for ready states, active navigation,
  command prompts, focus rings, and safe primary actions.
- Supporting colors: amber for partial/warning, red for failed/destructive,
  cool blue for informational states.
- Surfaces: low-contrast dark cards with thin separators; avoid heavy shadows.
- Typography: mono labels and command/data views are prominent; prose uses a
  compact sans stack.
- Motion: only meaningful status motion, primarily the small running pulse and
  active login/readiness indicators.

## Design Tokens

```css
:root {
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
  --info: oklch(0.78 0.1 225);
  --font-sans: "IBM Plex Sans", "Noto Sans TC", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace;
  --radius: 10px;
  --radius-sm: 6px;
}
```

Runtime implementation should keep the `IBM Plex Sans` and `IBM Plex Mono`
font stack, but must not embed the design-file base64 woff2 manifest. Browser
or system fallbacks are acceptable.

Layout tokens:

- App shell: two-column grid, sidebar `252px`, content `1fr`.
- Page content: `max-width: 1320px`, `padding: 24px 28px 64px`.
- Card radius: `10px`; small controls: `6px`.
- Standard grid/card gap: `16px`.
- Sidebar nav gap: `1px`; section padding: `16px 12px 6px`.

## App Shell

The shell is persistent across every page:

- `aside.sidebar`: sticky left column with brand, navigation, and binding card.
- Brand: green gradient square mark, `lark-bitable` text, `dashboard` subtitle,
  version pill.
- Navigation:
  - `data-page="overview"`: 總覽 / Overview, shortcut Cmd/Ctrl+1.
  - `data-page="config"`: 設定 / Configuration, shortcut Cmd/Ctrl+2.
  - `data-page="auth"`: Lark 登入 / Lark Login, shortcut Cmd/Ctrl+3.
  - `data-page="audit"`: 稽核紀錄 / Audit Logs, shortcut Cmd/Ctrl+4.
  - `data-page="playground"`: Playground, shortcut Cmd/Ctrl+5.
  - `data-page="research"`: 研究報告 / Research Reports, shortcut Cmd/Ctrl+6.
  - `data-page="table"`: 來源資料表 / Source Table, shortcut Cmd/Ctrl+7.
- Sidebar binding card: status, host, port, local-only mode.
- `main.main`: sticky `topbar`, breadcrumb, refresh action, command palette
  placeholder, and language toggle.
- Language preference is browser-only at `lark-bitable.dashboard.lang`.

## Components

- Buttons: `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`; primary is
  green with dark text and glow on hover.
- Cards: `.card`, `.card-head`, `.card-body`; headers use mono uppercase
  labels.
- Pills: `.pill` with optional `.dot`; variants `.ok`, `.warn`, `.err`,
  `.info`, `.solid`, `.prio-high`, `.prio-mid`, `.prio-low`.
- Data text: `.kv`, `.info-list`, `.text-mono`, `.text-muted`.
- Forms: `.field`, `.input`, `.select`, `textarea`; focus uses green border and
  glow.
- Tables: `.tbl` for audit/recent activity, `.data-tbl` for source records.
- Readiness: `.readiness`, `.ring`, `.next-cmd`; variants `.partial` and
  `.blocked`.
- Segments and tabs: `.segment`, `.tabs`, `.data-tabs`.
- Terminal output: `.terminal`, `.terminal-head`, `.terminal-body`,
  `.line-prompt`, `.line-key`, `.line-ok`, `.line-warn`, `.line-mute`.
- Login flow: `.flow`, `.flow-step`, `.done`, `.active`.
- Research viewer: `.md-shell`, `.md-list`, `.md-file`, `.md-viewer`,
  `.md-body`.
- Playground builder: `.pg-grid`, `.cmd-preview`, `.cmd-list`, `.cmd-item`.
- Source table: `.src-banner`, `.filter-bar`, `.avatar`, `.att-badge`,
  `.field-row`.

## Pages

### Overview `data-page="overview"`

Shows readiness, next safe command, source card, auth card, workflow mode card,
field mappings, recent activity, and recent research context. Data must identify
whether it is live, file-backed, missing, partial, or failed.

### Config `data-page="config"`

Shows editable source URL, source display name, workflow mode, Lark app
settings, redirect URI, callback port, scopes, field mappings, actionable
status, and default owner. App secrets display only stored/missing/provided
state. Saving config refreshes readiness without restarting the dashboard.

### Auth `data-page="auth"`

Shows redacted auth state, account/domain/scopes/expiry/storage metadata, login
controls, logout control, requested scopes, callback mode, login flow steps, and
authorization URL action. Tokens, refresh tokens, app secrets, and authorization
codes are never shown.

### Audit `data-page="audit"`

Lists audit entries newest-first with filters for text, command, status, mode,
date range, evidence, and errors. Detail view shows sanitized argv, timing,
issues, evidence summary, and redacted snapshot.

### Playground `data-page="playground"`

Provides command selection for `valid`, `schema`, `list`, `get`, `filter`,
`search`, `triage`, `research`, `verify`, and `write`. It renders a CLI preview,
command-specific parameters, response tabs, and browser-session run history.
Write remains preview-first unless explicitly confirmed.

### Research `data-page="research"`

Browses canonical JSON reports in `~/.lark-bitable/research`. The UI adopts the
mockup's Markdown-style reader, but the source of truth remains JSON. The view
must preserve observed facts, assumptions, analysis, likely causes, recommended
fixes, risks, next actions, evidence, canonical path, and link status.

### Table `data-page="table"`

Shows source banner, record/schema tabs, client-side filters, sampled records,
schema fields, mappings, observed values, and partial/missing states when source
or auth is unavailable.

## Interactions

- Hash routing updates active `.page-view` and sidebar `aria-current`.
- Cmd/Ctrl+1 through Cmd/Ctrl+7 switch pages.
- Refresh action reloads current page data.
- Language toggle updates dashboard-owned text and persists only to
  `localStorage`.
- Segments and tabs update pressed state and relevant panels.
- Audit row selection loads `/api/audit/:id`.
- Playground command selection rebuilds the command preview and parameter form.
- Research file selection loads `/api/research/:reportId`.
- Table records/schema tabs switch between `/api/table/records` and
  `/api/table/schema` rendered data.

## Boundaries

- No dashboard/web login is added.
- No database is added for schema, dashboard state, reports, or language.
- Browser cache may hold only short-lived UI state such as language, active
  page, and session run history.
- 不翻譯 Lark field/record/audit/research/command output. Source-controlled
  values from Lark, local files, audit snapshots, research content, command
  output, file paths, or user input are always displayed verbatim.
- Dashboard output must redact token-like values, app secrets, authorization
  headers, OAuth codes, and secret-like nested keys.
