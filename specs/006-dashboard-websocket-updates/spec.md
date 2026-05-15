# Feature Specification: Dashboard Real-Time Command Updates

**Feature Branch**: `006-dashboard-websocket-updates`  
**Created**: 2026-05-15  
**Status**: Draft  
**Input**: User description: "$speckit-specify dashboard 指令內的所有功能我希望透過 websocket 全部即時更新, 只要有指令觸發就更新, 但是如果 dashboard 服務沒啟動就不需要更新了"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See Command Activity Immediately in an Open Dashboard (Priority: P1)

A developer keeps the local dashboard open while using CLI commands or dashboard actions and sees the affected dashboard state change as soon as a command starts, progresses, completes, fails, or produces new evidence.

**Why this priority**: The dashboard is useful only if it reflects the current workflow without requiring manual refresh after every command.

**Independent Test**: Start the dashboard, open Overview and at least one page affected by command output, trigger representative CLI commands from a terminal and dashboard actions from the UI, and confirm visible status, data freshness, and audit activity update without a browser refresh.

**Acceptance Scenarios**:

1. **Given** the dashboard service is running and a browser dashboard is connected, **When** any supported CLI command starts, **Then** the dashboard shows new or updated command activity within 1 second.
2. **Given** a command completes successfully, **When** its result affects dashboard-visible state, **Then** all open dashboard views that show that state update within 2 seconds without a manual refresh.
3. **Given** a command returns partial, blocked, or failed status, **When** the result is available, **Then** the dashboard updates the relevant page with the same status, issues, remediation, and evidence boundaries shown by the command.
4. **Given** a dashboard action triggers a command-like workflow, **When** the action starts or finishes, **Then** the dashboard updates the same live activity and affected page state as it would for a terminal-triggered command.

---

### User Story 2 - Keep Every Dashboard Function Fresh (Priority: P1)

A developer uses any dashboard page and receives live updates for the page's visible data whenever a command changes configuration, authorization, audit history, playground runs, research reports, source table context, readiness, or language-independent UI state.

**Why this priority**: The requested behavior applies to all functions inside the dashboard command, not only a single page or action.

**Independent Test**: Open each primary dashboard page, trigger commands that update that page's underlying state, and verify the visible page content updates without leaving the page or pressing refresh.

**Acceptance Scenarios**:

1. **Given** the Configuration page is open, **When** configuration is saved or validated from any supported command path, **Then** source settings, field mappings, readiness, and validation issues update live.
2. **Given** the Lark Login page is open, **When** authorization starts, completes, expires, fails, or is cleared, **Then** account state, scopes, expiry, flow state, and remediation update live without exposing secrets.
3. **Given** the Audit Logs page is open, **When** any command writes a new audit entry or updates command evidence, **Then** the entry list, active filters, selected detail, and counts update consistently.
4. **Given** the Playground page is open, **When** a playground run starts, completes, fails, or is cleared, **Then** run status, output, issues, evidence, and session history update live.
5. **Given** the Research Reports page is open, **When** a research report is created, linked, changed, removed, malformed, or becomes unreadable, **Then** the report list and selected report state update live while preserving evidence boundaries.
6. **Given** the Source Table page is open, **When** schema, record availability, field discovery, or mapping state changes, **Then** record, schema, filter, mapping, empty, blocked, and partial states update live.
7. **Given** Overview is open, **When** any dashboard-visible state changes, **Then** readiness, next safe action, source, auth, mode, field mapping, recent activity, and recent research summaries update live.

---

### User Story 3 - Preserve Normal CLI Behavior When Dashboard Is Not Running (Priority: P1)

A developer runs CLI commands normally when the dashboard service is not running and does not receive update errors, extra prompts, or slower command behavior caused by live dashboard delivery.

**Why this priority**: The user explicitly stated that no update is required when the dashboard service is not started. CLI users who do not use the dashboard must not pay an operational cost.

**Independent Test**: Stop the dashboard service, run representative commands that would otherwise affect dashboard state, and confirm each command completes with the same user-visible result and no dashboard-update warning.

**Acceptance Scenarios**:

1. **Given** no dashboard service is running, **When** a supported CLI command starts, **Then** the command proceeds normally without requiring a dashboard connection.
2. **Given** no dashboard service is running, **When** a command completes, fails, or writes audit or research files, **Then** the command does not show dashboard update errors or ask the user to start the dashboard.
3. **Given** the dashboard service starts after earlier commands already ran, **When** the dashboard opens, **Then** it loads the latest persisted state from normal dashboard data sources and does not claim it received missed live updates.
4. **Given** a dashboard service stops while a command is running, **When** the command continues, **Then** the command outcome remains correct and the lost dashboard connection is handled as a dashboard availability issue rather than a command failure.

---

### User Story 4 - Trust Live Updates Across Connections and Failures (Priority: P2)

A developer opens multiple dashboard tabs or temporarily loses connection and can still tell whether visible data is current, stale, reconnecting, blocked, or failed.

**Why this priority**: Real-time behavior can become misleading if updates arrive out of order, disappear silently, or hide reconnection problems.

**Independent Test**: Open multiple dashboard views, trigger overlapping commands, interrupt and restore the browser connection, and verify each view either catches up to the latest state or clearly marks itself stale.

**Acceptance Scenarios**:

1. **Given** multiple dashboard browser views are connected, **When** a command changes dashboard-visible state, **Then** each connected view receives the same final state for the pages it displays.
2. **Given** multiple commands run close together, **When** their updates arrive, **Then** the dashboard shows the latest state in command order and does not replace newer facts with older updates.
3. **Given** a browser dashboard loses its live connection, **When** the connection is unavailable, **Then** the UI clearly indicates stale or reconnecting state and avoids presenting old data as current.
4. **Given** a browser dashboard reconnects, **When** current dashboard state is available, **Then** the UI catches up to the latest persisted or live state and clears stale indicators.

### Edge Cases

- Dashboard service is not running when a CLI command starts, completes, or fails.
- Dashboard service stops while a command is running.
- Dashboard service starts after commands have already updated config, auth, audit, research, or source data.
- A command completes so quickly that start and finish updates happen almost together.
- Long-running commands produce progress, partial evidence, or timeout states.
- Multiple commands run concurrently or finish out of order.
- Multiple browser tabs or windows are connected to the same dashboard service.
- Browser connection is interrupted, resumed, or refreshed during a command.
- Live Lark dependencies are unavailable, expired, blocked, or return partial state.
- Command output includes token-like values, app secrets, authorization codes, source data, long text, arrays, or nested objects.
- Audit logs, research reports, configuration files, or source data are changed outside the dashboard while it is open.
- A page has active filters, selected details, open tabs, scroll position, or unsaved local form edits when a live update arrives.

## Requirements _(mandatory)_

### Evidence & Fact Boundaries _(mandatory)_

- **Source Evidence**: User request in this conversation; dashboard feature specification in `specs/004-add-dashboard-command/spec.md`; dashboard design reference in `specs/004-add-dashboard-command/design.md`; dashboard HTTP contract in `specs/004-add-dashboard-command/contracts/dashboard-http-contract.md`; dashboard validation plan in `specs/005-dashboard-e2e-validation/plan.md`; current dashboard source references under `src/dashboard/` and CLI command references under `src/cli/commands/`.
- **Assumptions vs Facts**: It is a fact that the requested dashboard has Overview, Configuration, Lark Login, Audit Logs, Playground, Research Reports, and Source Table functions, and that the user requested real-time updates whenever commands are triggered while requiring no update when the dashboard service is not started. It is an assumption that "any command" means every supported CLI command or dashboard action whose start, progress, completion, failure, or persisted output can affect dashboard-visible state.
- **Unsupported Claims**: None. Live behavior must be proven with runtime evidence during planning and validation before implementation can be considered complete.
- **Conflict Handling**: If current implementation, existing dashboard specs, and runtime observations disagree, the existing dashboard feature spec defines expected product behavior, runtime observations define actual behavior, and this feature adds only the live-update expectations described here.

### Functional Requirements

- **FR-001**: The dashboard MUST provide a live update path for connected dashboard views while the dashboard service is running.
- **FR-002**: The system MUST publish dashboard-visible command activity when any supported CLI command or dashboard-triggered workflow starts.
- **FR-003**: The system MUST publish command completion, partial, blocked, failed, canceled, and timeout outcomes when those outcomes affect dashboard-visible state.
- **FR-004**: The dashboard MUST update Overview live when readiness, next safe action, source, auth, workflow mode, field mappings, recent activity, or recent research state changes.
- **FR-005**: The dashboard MUST update Configuration live when source settings, Lark app settings, workflow mode, field discovery, field mappings, actionable status, owner settings, or readiness validation change.
- **FR-006**: The dashboard MUST update Lark Login live when authorization flow state, account status, scopes, expiry, logout state, or auth remediation changes.
- **FR-007**: The dashboard MUST update Audit Logs live when audit entries are created, completed, filtered into view, selected, updated with evidence, skipped, malformed, or redacted.
- **FR-008**: The dashboard MUST update Playground live when a run starts, produces status, finishes, fails, is cleared, or changes output, issues, evidence, next safe actions, or session history.
- **FR-009**: The dashboard MUST update Research Reports live when canonical reports or report links are created, updated, removed, unreadable, malformed, or selected.
- **FR-010**: The dashboard MUST update Source Table live when record data, schema data, field discovery, mapping status, blocked state, partial state, empty state, or source availability changes.
- **FR-011**: Connected dashboard views MUST receive live updates without requiring a browser refresh, route change, or manual refresh action.
- **FR-012**: Live updates MUST preserve each page's current route, selected tab, active filter, selected detail, and scroll position unless the user explicitly changes them.
- **FR-013**: Live updates MUST NOT overwrite unsaved user input in dashboard forms without clearly preserving or distinguishing the user's draft from the incoming current state.
- **FR-014**: Live updates MUST identify whether displayed data is current, file-backed, cached, missing, partial, stale, reconnecting, or failed whenever that distinction affects user decisions.
- **FR-015**: Multiple connected dashboard views MUST converge on the same final visible state for the same underlying facts.
- **FR-016**: The dashboard MUST prevent older updates from replacing newer command facts when commands overlap or finish out of order.
- **FR-017**: The dashboard MUST show a clear stale or reconnecting indicator when a connected browser loses the live update path.
- **FR-018**: The dashboard MUST catch up to the latest available dashboard-visible state after reconnecting or refreshing.
- **FR-019**: CLI commands MUST continue normally when the dashboard service is not running.
- **FR-020**: CLI commands MUST NOT show dashboard update errors, warnings, prompts, or required setup steps when the dashboard service is not running.
- **FR-021**: CLI commands MUST NOT report their primary command result as failed solely because a dashboard live update could not be delivered.
- **FR-022**: Starting the dashboard after earlier commands have run MUST load current persisted state normally and MUST NOT claim to have received live updates for commands that happened before the service was available.
- **FR-023**: Live update content MUST follow existing dashboard privacy boundaries and redact tokens, refresh tokens, app secrets, authorization codes, authorization headers, and secret-like values.
- **FR-024**: Live updates MUST preserve source-controlled values exactly, including Lark field names, record values, audit snapshots, command output, file paths, and research report content.
- **FR-025**: Live updates MUST be observable and testable through dashboard-visible state, command output, audit evidence, and browser evidence.
- **FR-026**: Existing manual refresh behavior MUST remain available as a fallback and MUST produce the same final state as live updates for the same underlying facts.

### Key Entities _(include if feature involves data)_

- **Dashboard Service Availability**: Whether the local dashboard service is running and able to accept connected browser views.
- **Connected Dashboard View**: A browser tab or window currently displaying the local dashboard and eligible to receive live updates.
- **Command Activity Event**: A user-observable command lifecycle change, including start, progress, completion, partial, blocked, failed, canceled, or timeout state.
- **Dashboard State Surface**: A dashboard page or shared shell region whose visible data can be affected by command activity.
- **Live Update Delivery Result**: The dashboard-facing outcome of attempting to deliver an update, separated from the primary command result.
- **Stale State Indicator**: A visible dashboard state that tells users the page may not currently reflect the latest command activity.
- **Current State Snapshot**: The latest dashboard-visible facts loaded from normal dashboard data sources after startup, refresh, or reconnect.

## Success Criteria _(mandatory)_

### Report Accuracy Criteria _(mandatory for AI-facing output)_

- **RA-001**: Every validation claim about live updates MUST cite browser-visible evidence, command-output evidence, audit evidence, or an explicit blocked reason.
- **RA-002**: Validation reports MUST distinguish live-delivered updates from state loaded by startup, manual refresh, browser refresh, or reconnect catch-up.
- **RA-003**: Any failed live-update scenario MUST include the triggering command, affected dashboard surface, expected update, actual update, timing observation, and reproduction steps.

### Measurable Outcomes

- **SC-001**: With the dashboard running and a browser connected, 95% of command start events are visible in the dashboard within 1 second in local validation runs.
- **SC-002**: With the dashboard running and a browser connected, 95% of command completion, partial, blocked, or failed outcomes that affect dashboard-visible state appear in relevant dashboard views within 2 seconds.
- **SC-003**: All seven primary dashboard pages demonstrate at least one live update scenario without browser refresh.
- **SC-004**: Every supported dashboard-triggered workflow demonstrates the same live activity visibility as a terminal-triggered command.
- **SC-005**: When the dashboard service is not running, representative CLI commands complete with no dashboard-specific warnings, prompts, or result failures in 100% of validation cases.
- **SC-006**: In overlapping-command validation, the dashboard final visible state matches the newest completed facts in 100% of tested cases.
- **SC-007**: In multi-tab validation, all connected views converge to the same final visible facts within 3 seconds of the final relevant command update.
- **SC-008**: In disconnect and reconnect validation, the dashboard shows stale or reconnecting state within 2 seconds of detected loss and catches up to current visible state within 3 seconds after reconnection.
- **SC-009**: No completed live update validation exposes token-like or secret-like values in visible dashboard text, command activity, audit detail, playground output, auth state, or research report views.

## Assumptions

- The scope is limited to dashboard-visible state created or changed by supported local CLI commands and dashboard actions in the same local environment.
- The user-requested real-time mechanism will be addressed during planning and implementation, while this specification defines the required observable behavior and validation outcomes.
- Commands that have no effect on dashboard-visible state still publish command activity when the dashboard service is running, but they do not need to force unrelated page data changes.
- Manual refresh remains a user-facing fallback and does not replace the required live update behavior.
- When the dashboard service is not running, commands should not attempt user-visible recovery or display dashboard-specific delivery failures.
- Live updates should not introduce a persistent dashboard database or change existing browser-only and local-file state boundaries.
- Live Lark-backed updates require the same valid test account, app permissions, and test Bitable access as the existing dashboard workflows.
