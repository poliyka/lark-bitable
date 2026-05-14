# Feature Specification: Dashboard Command for Local UI

**Feature Branch**: `004-add-dashboard-command`
**Created**: 2026-05-14
**Status**: Draft
**Input**: User description: "$speckit-specify 新增一個 command \"dashboard\" 這個指令可以建立 web 服務 default port 你挑一個不太會有人用的 port 作為 default, 如果被佔用就 +1, 這個 web 就是一個 ui 介面, 不登入就能使用(並非lark登入, 指的是 web 的登入)，無需 db 來紀錄 schema, 如需要短暫記憶就用系統的 cache 或 web cache, 我可以在 web 做以下事情這幾件事情必須要有但不限於此你可以擴充其他我沒想到的能力: 1. 可以 live fix configure 2. 可以 live lark login 3. 有完善的 audit log 查詢頁面 4. 有 playground 可以直接使用 5. research report 閱覽頁面, 這部分要改一個能力當調用 research 時因該落檔放到 ~/.lark-bitable/research/{name}-{datetime}.json 中如果用戶有指定 -o 因該做 symbol link 到 這個文件夾下 6. 其他(你依照整個項目來判斷有沒有擴充功能). Update: 剛剛的 spec 添加多語系切換功能, cache 紀錄在 web cache 就好"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Start a Local Dashboard Without Web Login (Priority: P1)

A developer starts the new `dashboard` command and receives a local web UI for
managing the CLI workflow without creating or entering a separate dashboard
account.

**Why this priority**: The dashboard is the entry point for every requested UI
capability. It must be easy to launch, predictable to find, and usable before
any dashboard-specific login exists.

**Independent Test**: Start the dashboard from a clean terminal, verify it binds
to the expected local URL, then open the UI and use at least one read-only page
without entering any web username or password.

**Acceptance Scenarios**:

1. **Given** no process is using the default dashboard port, **When** the user
   runs the dashboard command, **Then** the system starts the dashboard on port
   `48731` and reports the local URL.
2. **Given** port `48731` is already in use, **When** the user runs the
   dashboard command, **Then** the system tries `48732` and continues increasing
   the port by one until an available port is found.
3. **Given** the dashboard is open in a browser, **When** the user navigates to
   any dashboard page, **Then** the page is usable without a dashboard login
   prompt while still requiring normal Lark authorization for Lark data access.
4. **Given** the dashboard has no separate login, **When** it starts with
   default settings, **Then** it is only exposed for local use and clearly
   reports the address that was opened.

---

### User Story 2 - Live Fix Configuration (Priority: P1)

A developer edits the current Lark Bitable configuration from the dashboard,
validates the result immediately, and continues using commands without
restarting the dashboard.

**Why this priority**: Configuration problems are one of the most common reasons
the CLI cannot access a table. The dashboard should turn setup repair into a
fast, visible workflow.

**Independent Test**: Open the configuration page with an incomplete or invalid
setup, correct source URL, app settings, mode, and field mappings, then run
readiness validation from the same page and confirm subsequent dashboard actions
use the corrected configuration.

**Acceptance Scenarios**:

1. **Given** no active source is configured, **When** the user opens the
   configuration page, **Then** the dashboard shows the missing source and
   provides editable fields for the required setup values.
2. **Given** a saved configuration has missing or stale field mappings, **When**
   the user updates mappings and saves them, **Then** validation can be run
   immediately and reports the current readiness state.
3. **Given** a user edits sensitive Lark app settings, **When** the dashboard
   displays saved values or validation output, **Then** secrets remain redacted.
4. **Given** configuration is updated from the dashboard, **When** the user runs
   another dashboard workflow, **Then** the workflow uses the latest saved
   configuration without requiring a dashboard restart.

---

### User Story 3 - Live Lark Login (Priority: P1)

A developer starts, completes, cancels, or clears Lark authorization from the
dashboard and sees the current Lark access state without leaving the UI.

**Why this priority**: The dashboard itself has no web login, but Lark API
commands still depend on valid Lark authorization. Users need a clear way to
repair Lark login while staying in the dashboard.

**Independent Test**: Start from missing or expired Lark auth, initiate login in
the dashboard, complete the Lark authorization flow, then verify the dashboard
shows ready auth state and a Lark-backed command can run.

**Acceptance Scenarios**:

1. **Given** no valid Lark auth exists, **When** the user clicks login from the
   dashboard, **Then** the dashboard starts the Lark authorization flow and
   tracks whether it is waiting, completed, canceled, or failed.
2. **Given** Lark authorization completes successfully, **When** the dashboard
   refreshes auth state, **Then** it shows account label when available, domain,
   scopes, expiry, and ready status without exposing tokens.
3. **Given** the user cancels or the authorization callback fails, **When** the
   dashboard reports the result, **Then** it shows a remediation path and leaves
   existing valid auth state unchanged when possible.
4. **Given** the user logs out from the dashboard, **When** logout completes,
   **Then** the dashboard shows that Lark auth is missing and Lark-backed
   workflows are blocked until login is restored.

---

### User Story 4 - Query and Inspect Audit Logs (Priority: P1)

A developer searches command history from the dashboard to understand what ran,
what failed, what evidence was collected, and what remediation was recommended.

**Why this priority**: The CLI is used by humans and AI agents. A complete audit
view is required to debug setup, inspect previous runs, and verify that outputs
did not hide failures or leak secrets.

**Independent Test**: Generate audit entries across successful, partial, and
failed commands, then use the dashboard to filter by time range, command,
status, workflow mode, source, text, and issue code; open a result and verify
the detail view is redacted and traceable.

**Acceptance Scenarios**:

1. **Given** audit logs exist, **When** the user opens the audit page, **Then**
   entries are listed newest-first with command, status, time, duration, mode,
   source summary, issue summary, and evidence summary.
2. **Given** many audit entries exist, **When** the user applies filters or
   search text, **Then** only matching entries are shown and the active filters
   are visible.
3. **Given** an audit entry contains issues, output snapshots, or evidence
   summaries, **When** the user opens the entry detail, **Then** the dashboard
   shows the relevant details with secrets redacted.
4. **Given** audit files are missing, rotated, empty, malformed, or too large,
   **When** the audit page loads, **Then** the dashboard reports the readable
   portion, skipped portion, and remediation without crashing.

---

### User Story 5 - Use a Dashboard Playground (Priority: P2)

A developer or AI-assisted operator uses a playground page to run supported CLI
workflows directly from the dashboard and compare human-readable output with
structured output.

**Why this priority**: The existing CLI has many commands and workflow modes.
The playground makes experimentation, validation, and evidence collection faster
without requiring users to memorize syntax.

**Independent Test**: Open the playground, select representative workflows such
as readiness validation, schema inspection, record search, research generation,
QA verification, and write preview, then verify each run produces visible
status, output, issues, evidence, and audit history.

**Acceptance Scenarios**:

1. **Given** the dashboard is running, **When** the user opens the playground,
   **Then** the user can choose supported workflows and enter the required
   parameters for that workflow.
2. **Given** a playground run completes, **When** output is shown, **Then** the
   page includes command status, issues, evidence references, structured output,
   and next safe actions when available.
3. **Given** the user previews a write-capable workflow from the playground,
   **When** no explicit write confirmation is provided, **Then** no table
   content is modified and the page states how to confirm intentionally.
4. **Given** a playground run fails or times out, **When** the result is shown,
   **Then** the page preserves the error, remediation, and audit trace instead
   of replacing it with a generic failure.

---

### User Story 6 - Browse Research Reports (Priority: P2)

A developer opens the dashboard research page to browse historical research
reports, inspect the evidence behind them, and find the canonical report file
created by the research command.

**Why this priority**: Research reports are project artifacts. They need a
stable local library so developers and agents can revisit prior analysis
without relying on terminal scrollback or ad hoc output paths.

**Independent Test**: Run research for a selected record with and without an
explicit output path, then open the dashboard research page and verify both
reports appear with name, creation time, source record, evidence, canonical file
path, and output link status.

**Acceptance Scenarios**:

1. **Given** research is invoked, **When** the report is generated, **Then** the
   system saves a canonical JSON report at
   `~/.lark-bitable/research/{name}-{datetime}.json`.
2. **Given** the user provides an output path with `-o` or the equivalent output
   option, **When** research completes, **Then** the requested output path is a
   symbolic link to the canonical report file when the filesystem permits it.
3. **Given** canonical research reports exist, **When** the user opens the
   dashboard research page, **Then** reports can be listed, searched, sorted,
   opened, and traced back to their source selection and evidence.
4. **Given** a report file or link is unreadable, missing, malformed, or points
   outside the expected location, **When** the dashboard loads the library,
   **Then** it marks that report as unavailable or unsafe and continues showing
   the remaining reports.

---

### User Story 7 - Inspect Operational Readiness and Table Context (Priority: P3)

A developer uses dashboard pages beyond the explicitly requested features to
inspect readiness, table schema, field mappings, recent records, selected
workflow mode, and safe next actions.

**Why this priority**: The project already has readiness, schema, record
inspection, QA verification, and write-preview concepts. Surfacing them in the
dashboard reduces context switching and makes the requested UI more complete.

**Independent Test**: Open operational pages with both complete and incomplete
setup, then confirm the dashboard reports readiness, schema/mapping state,
recent record discovery, selected workflow mode, and next safe actions without
making unsupported claims.

**Acceptance Scenarios**:

1. **Given** setup is incomplete, **When** the user opens the dashboard overview,
   **Then** the page shows blocked and partial readiness items in the order they
   should be fixed.
2. **Given** source and auth are ready, **When** the user opens table context,
   **Then** the dashboard shows schema, mapped fields, sampled values, and
   recent records when available.
3. **Given** the active mode is QA or Developer, **When** the dashboard presents
   next actions, **Then** it prioritizes workflows that match the active mode
   while still making shared commands discoverable.

---

### User Story 8 - Switch Dashboard Language (Priority: P3)

A developer changes the dashboard display language from the UI and keeps that
preference for the current browser without changing CLI configuration or
writing a server-side preference file.

**Why this priority**: The dashboard is a visual workflow surface for both
humans and AI-assisted operators. Language switching improves usability while
keeping the no-database and local-file boundaries intact.

**Independent Test**: Open the dashboard, switch between supported languages,
refresh the page, and confirm the selected language remains active in the same
browser while no CLI configuration, auth, audit, or research file records that
preference.

**Acceptance Scenarios**:

1. **Given** the dashboard is open, **When** the user changes the language,
   **Then** visible navigation, controls, labels, status text, remediation text,
   and dashboard-specific messages change to the selected language.
2. **Given** a language has been selected, **When** the user refreshes or
   reopens the dashboard in the same browser, **Then** the dashboard restores
   the selected language from web cache.
3. **Given** the dashboard is opened in a different browser or with cleared web
   cache, **When** no cached language preference exists, **Then** the dashboard
   chooses a sensible default and remains fully usable.
4. **Given** command output, field names, record values, audit snapshots, or
   research report contents come from Lark, local files, or user input, **When**
   the dashboard language changes, **Then** the dashboard does not translate or
   rewrite those source-controlled values as if they were UI labels.

### Edge Cases

- The default dashboard port and several following ports are already occupied.
- The dashboard cannot bind to a local port or cannot open a browser.
- A user attempts to expose the no-login dashboard beyond the local machine.
- Configuration files are missing, malformed, unreadable, or changed by another
  process while the dashboard is open.
- Lark login is missing, expired, canceled, or returns insufficient scope.
- Lark app settings are incomplete, invalid, or have a redirect URI mismatch.
- The audit log is missing, empty, rotated, partially corrupt, very large, or
  contains entries from a newer schema version.
- Audit entries include secrets in command arguments, errors, or snapshots that
  must be redacted before display.
- A playground command takes a long time, fails, returns partial status, or
  produces more output than the UI can show comfortably.
- A playground request attempts a write, logout, or configuration change while
  another run is active.
- Research is requested before any triage selection exists.
- Research report names contain characters unsafe for file names, collide with
  an existing report, or include very long titles.
- The requested research output path already exists as a non-link file or
  points to a location where a link cannot be created safely.
- The platform does not allow symbolic links for the requested output path.
- Temporary dashboard state is lost after process restart or browser cache
  cleanup.
- The selected language is unsupported, missing translations, or cached from a
  previous dashboard version.
- Web cache is unavailable, disabled, cleared, or scoped differently across
  browsers or private browsing sessions.
- User-provided data contains mixed languages and must remain faithful to the
  original source when the dashboard UI language changes.

## Requirements _(mandatory)_

### Evidence & Fact Boundaries _(mandatory)_

- **Source Evidence**: User requests in this conversation, including the initial
  dashboard request and the follow-up request to add language switching with
  web-cache-only persistence; `AGENTS.md` pointing to
  `specs/003-add-write-command/plan.md`; current README describing
  configure, doctor, valid, lark login, schema, list, get, filter, search,
  triage, research, verify, media download, and write workflows; current source
  paths `src/cli/commands/configure.ts`, `src/cli/commands/lark.ts`,
  `src/cli/commands/research.ts`, `src/cli/commands/help.ts`,
  `src/cli/base-command.ts`, `src/audit/log.ts`, `src/config/store.ts`, and
  `src/config/schema.ts`; prior specs under `specs/001-lark-bitable/`,
  `specs/002-mode-aware-workflows/`, and `specs/003-add-write-command/`.
- **Assumptions vs Facts**: It is a fact that the current product is a local
  Lark Bitable CLI with configuration, Lark auth, evidence-backed reports,
  audit logging, QA/Developer modes, and guarded write behavior. It is a fact
  that the requested feature is a new `dashboard` command with no separate web
  login. It is an assumption that the no-login dashboard should be local-only by
  default to avoid exposing local config, auth state, audit details, and write
  controls to a network.
- **Unsupported Claims**: None. This specification defines desired behavior and
  selected defaults; it does not claim the dashboard already exists.
- **Conflict Handling**: If dashboard state, local files, Lark state, audit
  entries, or research report contents conflict, the dashboard must show the
  conflict explicitly and avoid presenting cached or inferred data as confirmed
  current state.

### Functional Requirements

- **FR-001**: The system MUST provide a user-facing `dashboard` command that
  starts a local dashboard UI for the current CLI workspace.
- **FR-002**: The dashboard command MUST use port `48731` by default and, when
  that port is unavailable, MUST try the next integer port until it finds an
  available local port or reports a clear startup failure.
- **FR-003**: The dashboard MUST be usable without a separate dashboard or web
  account login.
- **FR-004**: The dashboard MUST remain local-only by default and MUST report
  the exact local URL it starts on.
- **FR-005**: The dashboard MUST NOT require a persistent database to store
  schema, configuration snapshots, research indexes, or UI state. Short-lived
  local or browser cache may be used only as a convenience and must be
  rebuildable from existing local files and live command results.
- **FR-006**: The dashboard MUST provide a configuration page that can view,
  edit, save, clear where supported, and validate active source settings, Lark
  app settings, workflow mode, field mappings, owner defaults, and actionable
  status settings.
- **FR-007**: The configuration page MUST redact app secrets, tokens, and other
  sensitive values in display, validation output, audit details, playground
  output, and research views.
- **FR-008**: The dashboard MUST allow users to run readiness validation after
  configuration changes and see blocking issues, partial issues, remediation
  steps, evidence, and next safe command.
- **FR-009**: The dashboard MUST provide live Lark login, logout, and auth
  status controls, including waiting, ready, missing, expired, insufficient
  scope, canceled, and failed states.
- **FR-010**: Lark auth status in the dashboard MUST show only safe account,
  domain, scope, expiry, and storage-path metadata and MUST NOT expose access
  tokens, refresh tokens, authorization codes, or app secrets.
- **FR-011**: The dashboard MUST provide an audit log page that lists command
  history with command name, status, timestamps, duration, mode, source summary,
  auth summary, issue summary, evidence summary, and retention information when
  available.
- **FR-012**: The audit log page MUST support filtering by time range, command,
  status, workflow mode, source identity, issue code, text search, and whether
  evidence or errors are present.
- **FR-013**: The audit log page MUST support detail views that show sanitized
  arguments, issues, errors, evidence summaries, output snapshots, and
  retention/rotation context while preserving redaction.
- **FR-014**: The dashboard MUST provide a playground page for running supported
  workflows including setup validation, schema inspection, record listing,
  record retrieval, filtering, searching, triage, research generation, QA
  verification, media-related guidance, and write preview or committed write
  when explicitly confirmed.
- **FR-015**: Playground runs MUST display status, issues, warnings, evidence,
  source metadata, mode metadata, human-readable output when available,
  structured output when available, and next safe actions.
- **FR-016**: Playground write-capable actions MUST default to preview or
  non-mutating behavior and MUST require explicit confirmation before changing
  table content.
- **FR-017**: Playground runs and dashboard-initiated setup/auth actions MUST be
  auditable with enough metadata for a later audit-log query to identify what
  was requested, what completed, what failed, and what evidence was collected.
- **FR-018**: Every research invocation MUST create a canonical JSON report file
  under `~/.lark-bitable/research/{name}-{datetime}.json`.
- **FR-019**: Research report file names MUST use a safe report name and a
  sortable timestamp, and collisions MUST be avoided without overwriting an
  existing canonical report.
- **FR-020**: When the user supplies an output path through `-o` or the
  equivalent output option, the system MUST create the requested output as a
  symbolic link to the canonical research JSON report when safe and supported.
- **FR-021**: If a requested research output link cannot be created safely, the
  system MUST keep the canonical report, report the link failure, and avoid
  overwriting unrelated files.
- **FR-022**: The dashboard MUST provide a research report page that lists,
  searches, sorts, opens, and summarizes canonical research reports, including
  name, creation time, selected record when available, source mode, evidence
  count, assumptions, risks, next actions, canonical path, and output link
  status.
- **FR-023**: Research report views MUST distinguish observed facts,
  assumptions, analysis, likely causes, recommended fixes, risks, next actions,
  and evidence instead of merging them into a single narrative.
- **FR-024**: The dashboard MUST provide an operational overview that summarizes
  readiness, active mode, configured source, auth state, recent command
  outcomes, recent research reports, and recommended next actions.
- **FR-025**: The dashboard SHOULD provide table-context views for schema,
  configured field mappings, sampled values, recent records, current selection,
  and mode-specific workflow hints when source and auth are available.
- **FR-026**: The dashboard MUST handle missing, partial, stale, malformed, or
  inaccessible local files with user-facing errors and remediation instead of
  crashing or showing misleading empty success states.
- **FR-027**: The dashboard MUST avoid reporting cached data as current unless
  it identifies the cache age, source, and how the user can refresh it.
- **FR-028**: The dashboard MUST keep existing CLI behavior available for users
  who do not start the dashboard.
- **FR-029**: Help and readiness guidance MUST include the dashboard command,
  default port behavior, no-dashboard-login behavior, key dashboard pages, and
  security limitations of local no-login access.
- **FR-030**: The dashboard MUST provide a visible language switcher for the
  dashboard UI.
- **FR-031**: The dashboard MUST support at least Traditional Chinese and
  English UI text for dashboard-owned navigation, controls, labels, status
  messages, validation summaries, remediation text, and empty/error states.
- **FR-032**: The selected dashboard language MUST be stored only in web cache
  for the current browser context and MUST NOT be written to CLI configuration,
  auth storage, audit logs as a preference record, research reports, or a
  dashboard database.
- **FR-033**: When no cached language preference exists, the dashboard MUST
  choose an initial language from browser preference when available, otherwise
  use a documented default.
- **FR-034**: Changing the dashboard UI language MUST NOT translate, mutate, or
  relabel source data such as Lark field names, record values, command output,
  audit snapshots, research report contents, file paths, or user-provided text.
- **FR-035**: If a cached language value is unsupported, stale, or unreadable,
  the dashboard MUST fall back to a supported language without blocking other
  dashboard functions.

### Key Entities _(include if feature involves data)_

- **Dashboard Service Binding**: The chosen local host and port, startup time,
  launch URL, and startup status for a dashboard process.
- **Dashboard Session State**: Short-lived UI state such as active page,
  selected filters, pending playground form values, cached language preference,
  and last refresh time. This state is rebuildable and is not the source of
  truth.
- **Language Preference**: The dashboard UI language selected by the current
  browser user, stored only in web cache and used only for dashboard-owned text.
- **Configuration Draft**: A user-edited view of source, app, mode, field
  mapping, owner, and workflow settings before or after validation.
- **Lark Auth State**: The redacted status of local Lark authorization,
  including ready/missing/expired/invalid/insufficient-scope states, safe
  account metadata, domain, scopes, and expiry.
- **Audit Query**: A set of filters, sort order, and pagination controls used
  to find audit entries.
- **Audit Entry**: A sanitized record of a command or dashboard-initiated action,
  including timing, command, arguments, status, source/auth/mode summaries,
  issues, evidence summaries, and output snapshot.
- **Playground Run**: A dashboard-requested workflow execution with input
  parameters, status, output, evidence, warnings, issues, next actions, and
  audit trace.
- **Research Report File**: The canonical JSON report saved for each research
  invocation, including report identity, selected record context, observed
  facts, assumptions, analysis, likely causes, recommended fixes, risks, next
  actions, evidence, canonical path, and optional output link path.
- **Research Report Index**: A rebuildable list of canonical research report
  files and their safe summary metadata for dashboard browsing.

## Success Criteria _(mandatory)_

### Report Accuracy Criteria _(mandatory for AI-facing output)_

- **RA-001**: 100% of dashboard pages that display command, audit, playground,
  readiness, or research data identify the source of that data as live,
  file-backed, cached, missing, partial, or failed.
- **RA-002**: 100% of dashboard research views preserve the separation between
  observed facts, assumptions, analysis, likely causes, recommended fixes,
  risks, next actions, and evidence.
- **RA-003**: 100% of audit detail, playground output, configuration output,
  auth status, and research views redact tokens, app secrets, authorization
  codes, and other known sensitive values.
- **RA-004**: 100% of dashboard-initiated actions that can change config, auth,
  reports, or table content are traceable from an audit entry or an explicit
  local file path shown to the user.
- **RA-005**: 100% of language switching behavior preserves source-controlled
  facts exactly as provided and changes only dashboard-owned UI text.

### Measurable Outcomes

- **SC-001**: When no port conflict exists, users can start the dashboard and
  open the reported local URL in under 5 seconds on a typical developer
  workstation.
- **SC-002**: When port `48731` is occupied, the dashboard chooses the next
  available incremented port and reports the chosen URL in under 5 seconds for
  the first 10 occupied ports.
- **SC-003**: Users can correct an incomplete configuration and run readiness
  validation from the dashboard in under 3 minutes without restarting the
  dashboard.
- **SC-004**: After a successful, canceled, expired, or failed Lark login
  attempt, the dashboard reflects the updated auth state within 5 seconds of
  the result being available.
- **SC-005**: Users can filter 1,000 audit entries by command, status, and text
  and open a matching detail view in under 2 seconds, excluding filesystem
  delays outside the tool's control.
- **SC-006**: Users can run a non-mutating playground workflow and see status,
  issues, evidence, and structured output in under 10 seconds when the
  underlying Lark or local operation completes successfully in that time.
- **SC-007**: 100% of research invocations that reach report generation create a
  canonical JSON file under the research report directory.
- **SC-008**: 100% of research invocations with an explicit output path either
  create a safe symbolic link to the canonical report or report why the link was
  not created without deleting unrelated files.
- **SC-009**: In usability validation, at least 90% of users can identify from
  the dashboard whether setup is ready, blocked, or partial and what the next
  safe action is.
- **SC-010**: In redaction validation using representative secret-like values,
  zero secrets appear in visible dashboard output, audit detail views,
  playground output, or research report summaries.
- **SC-011**: Users can switch between supported dashboard languages and see
  dashboard-owned navigation, controls, status text, and remediation text update
  within 1 second without restarting the dashboard.
- **SC-012**: After a dashboard language is selected, refreshing the same
  browser restores that language in 100% of cases where web cache remains
  available, and no CLI configuration, auth, audit, or research file contains a
  saved language preference.

## Assumptions

- The dashboard is intended for local developer and AI-agent workstations, not
  as a shared hosted service.
- Port `48731` is selected as the default because it is uncommon for typical
  local developer services, and incrementing by one gives predictable conflict
  handling.
- No separate dashboard login means no dashboard-specific user accounts,
  passwords, or sessions are required; Lark login remains required for Lark API
  access.
- Because there is no dashboard login, local-only exposure is the safest default
  for v1. Remote sharing would require a separate security decision and is out
  of scope for this feature.
- Existing local configuration, auth, audit, and selection files remain the
  source of truth. Dashboard cache is only an acceleration or UI convenience.
- The dashboard initially supports Traditional Chinese and English because the
  project already uses both languages in user-facing context and documentation.
- Browser language preference is a reasonable first-run default when web cache
  has no dashboard language value.
- Language preference is UI-only. Lark data, local file contents, audit
  snapshots, command output, and research report body text remain in their
  original language unless the source itself changes.
- The research report name comes from an explicit user-provided name when
  available; otherwise it is derived from selected record context or a safe
  generic name.
- The research timestamp is sortable and precise enough to distinguish reports
  generated close together.
- The canonical research JSON report is the durable artifact. Any user-supplied
  output path is a convenience link to that canonical artifact.
- Existing command-line workflows must continue to work for users who never run
  the dashboard.
