# Feature Specification: Dashboard Comprehensive E2E and UI Validation

**Feature Branch**: `005-dashboard-e2e-validation`  
**Created**: 2026-05-14  
**Status**: Draft  
**Input**: User description: "依照既定計劃，建立 dashboard 全面 E2E 與 UI 驗證規格；覆蓋整個 dashboard 的功能與 UI，不只驗證先前提到的設定頁 field 點擊會捲到頂部、field mapping sync 無效、mapping 欄位應為下拉選單，也要驗證所有元素、所有動作、視覺設計、空狀態、錯誤狀態、資料保護、多語系、responsive 與可交付 evidence。"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Validate Launch and Global Shell (Priority: P1)

A QA validator opens the local dashboard and confirms the application shell is usable without a dashboard account, routes correctly across all pages, and exposes reliable evidence for every global navigation and control.

**Why this priority**: The shell is the entry point for every dashboard workflow. If launch, navigation, routing, or global controls are unreliable, no page-level validation can be trusted.

**Independent Test**: Start the dashboard in an isolated local test environment, open it in a real browser, and verify the global shell, navigation, command palette, refresh, language control, copy controls, shortcut routing, visible status, and absence of dashboard login prompts.

**Acceptance Scenarios**:

1. **Given** the dashboard service is running locally, **When** the validator opens the dashboard, **Then** the browser shows the dashboard shell without asking for a dashboard username, password, or session login.
2. **Given** the dashboard is open, **When** the validator navigates through Overview, Configuration, Lark Login, Audit Logs, Playground, Research Reports, and Source Table, **Then** exactly one page is active at a time and the active navigation, breadcrumb, and browser location agree.
3. **Given** the validator uses keyboard shortcuts or the command palette, **When** a page switch occurs, **Then** the selected page is shown, page-specific data loads, and no unrelated page action is triggered.
4. **Given** the validator uses global refresh or copy actions, **When** the action completes, **Then** the current page remains selected and the copied or refreshed content matches the visible state.

---

### User Story 2 - Validate Configuration Repair and Field Mapping Behavior (Priority: P1)

A QA validator verifies that the dashboard configuration page can repair source setup, Lark application settings, workflow mode, and field mappings without disruptive page jumps or misleading sync behavior.

**Why this priority**: Configuration repair is a core dashboard promise. Field mapping is especially high risk because incorrect or unusable mappings break every table-backed workflow.

**Independent Test**: Open Configuration with missing and populated setup states, exercise every input and selection control, discover available fields, choose mappings from field lists, save the configuration, and verify Overview and downstream pages use the updated values.

**Acceptance Scenarios**:

1. **Given** no active source is configured, **When** the validator opens Configuration, **Then** the page shows editable source, app, workflow, mapping, actionable status, and owner controls with clear missing-state guidance.
2. **Given** the validator has scrolled to field mappings, **When** the validator focuses, opens, or changes any field mapping control, **Then** the page does not unexpectedly scroll to the top and does not switch pages.
3. **Given** field discovery succeeds, **When** the validator opens each mapping control, **Then** status, priority, title, and owner mappings are selectable from discovered source fields rather than requiring free-form guessing.
4. **Given** the validator changes mappings and saves, **When** the save completes, **Then** the saved draft, readiness state, and Overview field mapping card reflect the selected mappings without restarting the dashboard.
5. **Given** field discovery is blocked or unavailable, **When** the validator requests field sync, **Then** the page reports the blocked or unavailable state and does not present stale or fake mapping options as if sync succeeded.

---

### User Story 3 - Validate Lark Authorization Lifecycle (Priority: P1)

A QA validator verifies that Lark authorization can be started, observed, completed, failed, and cleared from the dashboard while preserving token secrecy.

**Why this priority**: The dashboard itself has no web login, but Lark-backed pages depend on Lark authorization. Users need trustworthy auth repair and status feedback.

**Independent Test**: Run the Lark Login page through missing, waiting, ready, failed, expired, and logout states using a test Lark setup where available, then verify visible status, remediation, page synchronization, and redaction.

**Acceptance Scenarios**:

1. **Given** Lark auth is missing, **When** the validator starts login with requested scopes, **Then** the dashboard shows a waiting login flow, an authorization action, and visible progress steps.
2. **Given** Lark authorization completes, **When** the dashboard refreshes auth state, **Then** account, domain, scopes, expiry, and ready status are shown without exposing tokens or authorization codes.
3. **Given** login fails, expires, or is canceled, **When** the status is shown, **Then** the dashboard reports the failure state and remediation without corrupting any previously valid auth state.
4. **Given** the validator logs out, **When** logout completes, **Then** the auth page and Overview both show missing auth and Lark-backed pages show blocked or partial states.

---

### User Story 4 - Validate Operational Pages and Workflows (Priority: P1)

A QA validator verifies every dashboard operational page and action: audit search/detail, playground commands, research report browsing, source records, and source schema inspection.

**Why this priority**: These pages are the dashboard's main work surfaces. Each page must prove that user actions, displayed data, and evidence traces match the actual workflow state.

**Independent Test**: Seed or generate audit entries, playground runs, research reports, and source table states; then exercise every visible filter, selector, tab, list item, action button, copy action, and data view.

**Acceptance Scenarios**:

1. **Given** audit logs exist, **When** the validator filters entries and opens details, **Then** results, counts, selected state, detail content, evidence, and redaction match the selected audit data.
2. **Given** the validator uses Playground, **When** every supported command is selected and run in safe, partial, and failure states, **Then** parameters, command preview, run result, response tabs, history, issues, evidence, and next safe actions are correct.
3. **Given** research reports exist, **When** the validator searches, selects, reloads, and copies report content or paths, **Then** the report list and reader preserve report sections, evidence, canonical path, and link status.
4. **Given** source table data is available or blocked, **When** the validator switches record and schema views, filters records, refreshes, and exports visible state, **Then** the page accurately shows records, schema, mappings, blocked states, and empty states.

---

### User Story 5 - Validate Complete UI Quality and Visual States (Priority: P1)

A QA validator verifies that the dashboard looks and behaves like the approved dark developer-console design across desktop and mobile layouts, including active, hover, focus, selected, empty, error, and loading states.

**Why this priority**: The dashboard is a visual workflow surface. A feature can be functionally wired but still fail if the UI is broken, misleading, inaccessible, or inconsistent with the design reference.

**Independent Test**: Capture desktop and mobile browser evidence for all pages and critical states, compare against the design reference, and verify that all interactive elements have visible state changes and readable content.

**Acceptance Scenarios**:

1. **Given** the dashboard is displayed on a desktop viewport, **When** each page is captured, **Then** the shell, cards, pills, forms, tables, terminal output, research reader, and playground builder match the approved visual language.
2. **Given** the dashboard is displayed on a mobile-width viewport, **When** key pages are captured, **Then** content remains readable, controls remain reachable, and wide content can be inspected without layout collapse.
3. **Given** the validator focuses or selects any interactive control, **When** the visual state changes, **Then** the state is visible and unambiguous.
4. **Given** a page has no data, partial data, or failed data, **When** the state is rendered, **Then** the UI uses clear dashboard-styled empty or error messaging rather than broken layout or raw failures.

---

### User Story 6 - Validate Language, Source Data Boundaries, and Privacy (Priority: P2)

A QA validator verifies that language switching, source-data preservation, browser-only preferences, and secret redaction work across the full dashboard.

**Why this priority**: Language switching and source-data boundaries are cross-cutting requirements. A failure can silently corrupt user understanding or leak sensitive data.

**Independent Test**: Switch languages, refresh the browser, inspect all pages, scan visible text and captured evidence, and confirm dashboard-owned labels change while source-controlled values and secrets remain protected.

**Acceptance Scenarios**:

1. **Given** the validator switches between supported languages, **When** each dashboard page is viewed, **Then** dashboard-owned labels and controls change language consistently.
2. **Given** source field names, record values, audit snapshots, command output, file paths, or research content are visible, **When** the dashboard language changes, **Then** those source-controlled values remain unchanged.
3. **Given** the browser is refreshed, **When** a language preference exists in browser storage, **Then** the selected language is restored without server-side dashboard preference storage.
4. **Given** sensitive values exist in configuration, auth, audit, playground, or research data, **When** any page renders them, **Then** token-like values, application secrets, authorization codes, and secret-like fields are redacted.

### Edge Cases

- Dashboard starts with missing source and missing Lark auth.
- Dashboard starts with partial source setup, stale field mappings, or unavailable field discovery.
- Lark authorization is missing, expired, canceled, failed, or completed in another browser window.
- Audit logs are empty, malformed, rotated, too large, or contain secret-like values.
- Playground commands return success, partial results, validation errors, blocked states, failures, or long-running responses.
- Research directory is empty, contains valid reports, contains malformed reports, or contains unsafe or unreadable links.
- Source table data is unavailable, empty, very wide, contains long text, contains arrays/objects, or contains source-language values.
- Browser viewport is desktop, tablet-width, or mobile-width.
- Browser storage is populated, cleared, or opened from a separate browser profile.
- User clicks or focuses controls inside a page after scrolling away from the top.

## Requirements _(mandatory)_

### Evidence & Fact Boundaries _(mandatory)_

- **Source Evidence**: User requests in this conversation; the approved dashboard design reference captured in `specs/004-add-dashboard-command/design.md`; the dashboard feature specification in `specs/004-add-dashboard-command/spec.md`; the dashboard HTTP contract in `specs/004-add-dashboard-command/contracts/dashboard-http-contract.md`; the implementation surface currently exposed by the local dashboard UI; the user's explicit callouts about field click scroll jumps, field mapping sync, dropdown expectations, whole-dashboard coverage, and UI coverage.
- **Assumptions vs Facts**: It is a fact that the dashboard has seven primary pages, no dashboard/web login requirement, browser-only language preference, local-only default service behavior, configuration repair, Lark login, audit browsing, playground, research browsing, and source table inspection requirements. It is an assumption that full live Lark validation will use a dedicated test Bitable and test Lark account when available.
- **Unsupported Claims**: None. Live Lark success states must be marked blocked rather than passed when credentials or a test table are unavailable.
- **Conflict Handling**: If the design reference, current implementation, and runtime observation disagree, runtime observation is recorded as evidence and the design/spec expectation is used as the expected result unless the product owner explicitly revises the expectation.

### Functional Requirements

- **FR-001**: The validation MUST cover every dashboard page and every visible interactive element on each page.
- **FR-002**: The validation MUST record evidence for launch, local-only access, no-dashboard-login behavior, global shell rendering, active navigation, breadcrumb state, route state, refresh, command palette, copy actions, and keyboard shortcuts.
- **FR-003**: The validation MUST verify that page-level clicks, focus changes, selections, filters, tabs, and form interactions do not unintentionally trigger page navigation or reset the scroll position.
- **FR-004**: The validation MUST explicitly verify that Configuration field mapping controls for status, priority, title, and owner behave as selectable field controls populated from discovered source fields.
- **FR-005**: The validation MUST explicitly verify that field discovery or sync updates every field mapping control, reports blocked states honestly, and does not present stale options as successful sync results.
- **FR-006**: The validation MUST verify that saving configuration updates saved state, readiness state, Overview mapping state, and later dashboard workflows without requiring a dashboard restart.
- **FR-007**: The validation MUST verify all Lark Login page states: missing, waiting, ready, failed, canceled or expired, and logged out.
- **FR-008**: The validation MUST verify that requested Lark scopes shown or entered in the dashboard are reflected in the started authorization flow.
- **FR-009**: The validation MUST verify that Audit Logs filters, result counts, entry selection, detail rendering, export/copy behavior, skipped data reporting, and redaction are correct.
- **FR-010**: The validation MUST verify every supported Playground command selection, parameter form, command preview, run action, response tab, run history item, clear history action, copy action, issue display, evidence display, and next safe action.
- **FR-011**: The validation MUST verify that write-capable Playground workflows are preview-first unless the user explicitly confirms a write.
- **FR-012**: The validation MUST verify Research Reports list loading, searching, selecting, reloading, section-preserving detail rendering, copy content, copy path, copy directory, malformed report handling, and unsafe report handling.
- **FR-013**: The validation MUST verify Source Table records, schema, source banner, record filtering, tab switching, refresh, export/copy behavior, empty states, blocked states, and wide/long data rendering.
- **FR-014**: The validation MUST verify Overview readiness, next safe action, source card, auth card, workflow card, field mappings, recent activity, and shortcut actions.
- **FR-015**: The validation MUST verify desktop and mobile layouts for all primary pages or, when a full mobile capture is redundant, for the pages most likely to expose layout failures: Overview, Configuration, Playground, Research, and Source Table.
- **FR-016**: The validation MUST verify visual state for active, hover, focus, selected, loading, empty, partial, blocked, error, warning, success, and disabled or unavailable controls where those states appear.
- **FR-017**: The validation MUST compare rendered UI against the approved design language: dark canvas, terminal-green accent, sidebar shell, sticky topbar, cards, pills, tables, terminal output, research reader, playground builder, and responsive behavior.
- **FR-018**: The validation MUST verify that supported language switching changes dashboard-owned text and persists only in browser storage.
- **FR-019**: The validation MUST verify that Lark field names, record values, audit snapshots, command output, file paths, and research report contents are not translated or rewritten by dashboard language switching.
- **FR-020**: The validation MUST scan visible UI and rendered detail views for sensitive values and fail if tokens, refresh tokens, application secrets, authorization codes, authorization headers, or secret-like values are exposed.
- **FR-021**: The validation MUST capture browser console and request evidence for each run and treat unhandled errors as failures unless explicitly classified as environment noise with justification.
- **FR-022**: The validation MUST produce a final report that separates passed checks, failed checks, blocked checks, evidence links, reproduction steps, expected behavior, actual behavior, and developer follow-up.
- **FR-023**: The validation MUST mark live Lark-dependent checks as blocked, not passed, when a live test account or test Bitable is unavailable.
- **FR-024**: The validation MUST ensure no check is considered complete without either browser-visible evidence or a clearly documented blocked reason.

### Key Entities _(include if feature involves data)_

- **Validation Run**: One complete dashboard validation attempt, including environment, start time, dashboard URL, browser profile state, checked scenarios, evidence, pass/fail/blocked summary, and residual risks.
- **Validation Scenario**: A user-observable dashboard behavior to verify, such as navigating to a page, changing a field mapping, starting Lark login, filtering audit logs, running a playground command, or switching language.
- **UI Element Coverage Item**: A visible element or control that must be observed and exercised, including its page, role, expected state, action, and result.
- **Evidence Artifact**: A captured proof item such as screenshot, browser accessibility snapshot, observed text, copied value, request summary, console summary, or recorded state before and after an action.
- **Defect Finding**: A failed expected behavior with reproduction steps, expected result, actual result, severity, affected page, evidence artifacts, and developer follow-up.
- **Blocked Check**: A validation scenario that cannot be completed because required live credentials, test data, browser capability, or environment access is unavailable.

## Success Criteria _(mandatory)_

### Report Accuracy Criteria _(mandatory for AI-facing output)_

- **RA-001**: Every pass, fail, and blocked conclusion MUST cite at least one evidence artifact or an explicit blocked reason.
- **RA-002**: The final report MUST distinguish observed facts from assumptions and must not treat inferred behavior as verified behavior.
- **RA-003**: Any defect finding MUST include reproduction steps, expected behavior, actual behavior, affected page or control, severity, and evidence sufficient for another engineer to reproduce the issue.

### Measurable Outcomes

- **SC-001**: 100% of the seven primary dashboard pages have captured evidence for initial render, at least one page-specific action, and the page's empty or blocked state.
- **SC-002**: 100% of visible interactive controls in the validation coverage matrix have either a passed action result, a failed defect finding, or a blocked reason.
- **SC-003**: The field mapping validation includes all four required mappings and confirms both selection behavior and save synchronization for each mapping.
- **SC-004**: The validation report identifies unexpected scroll-to-top behavior, if present, with before and after scroll position evidence for every affected configuration control.
- **SC-005**: No completed validation run contains unresolved browser console errors unless each error is explicitly classified and justified as unrelated environment noise.
- **SC-006**: No completed validation run exposes token-like or secret-like values in visible dashboard text or rendered detail views.
- **SC-007**: Desktop and mobile evidence covers the approved visual design and identifies all layout regressions that block reading or interacting with primary controls.
- **SC-008**: Live Lark-dependent scenarios are either verified with a test account and test table or explicitly marked blocked with the missing dependency named.

## Assumptions

- The dashboard validation target is the local dashboard created by the existing dashboard command.
- A real browser is required for completion because routing, focus, scroll, storage, responsive layout, and visual states cannot be fully validated from static assets alone.
- Browser automation may be used to collect evidence, but the product requirement is evidence quality and coverage, not a specific automation tool.
- A dedicated Lark test account and test Bitable are required to pass live auth, field discovery, source records, and source schema scenarios.
- If live Lark access is unavailable, the affected checks remain blocked and the rest of the dashboard is still validated.
- The validation deliverable is a QA evidence report and defect list; it does not itself change dashboard product behavior.
