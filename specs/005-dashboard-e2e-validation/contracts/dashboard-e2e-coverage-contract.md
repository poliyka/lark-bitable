# Contract: Dashboard E2E Coverage

This contract defines the minimum dashboard scenario coverage required for a validation run to be considered complete.

## Status Rules

Each scenario must end in exactly one status:

- `pass`: Expected behavior was observed and evidence is attached.
- `fail`: Expected behavior was not observed and a defect finding is attached.
- `blocked`: The scenario could not be completed because a named dependency or environment capability was unavailable.
- `not-run`: Temporary state during execution only. No final report may contain `not-run`.

## Global Shell Scenarios

- `D-SHELL-01`: Open dashboard and verify no dashboard login prompt appears.
- `D-SHELL-02`: Verify sidebar brand, navigation, binding card, local-only status, and no-dashboard-login label.
- `D-SHELL-03`: Verify topbar breadcrumb, refresh, command palette, and language controls.
- `D-SHELL-04`: Click all seven navigation buttons and verify active page, breadcrumb, and location.
- `D-SHELL-05`: Use keyboard shortcuts for all seven pages and verify routing.
- `D-SHELL-06`: Use command palette action and verify it opens Playground.
- `D-SHELL-07`: Use global refresh and verify current page remains selected.
- `D-SHELL-08`: Exercise all shell copy actions and verify copied values.
- `D-SHELL-09`: Verify page-internal clicks do not trigger unintended page navigation.
- `D-SHELL-10`: Verify page navigation does not create an uncontrolled network request loop.

## Overview Scenarios

- `D-OVERVIEW-01`: Missing setup renders partial readiness and next safe action.
- `D-OVERVIEW-02`: Readiness ring, summary, and issue pills match status data.
- `D-OVERVIEW-03`: Source card renders source data or non-broken missing state.
- `D-OVERVIEW-04`: Auth card renders auth state without token leakage.
- `D-OVERVIEW-05`: Workflow card renders active mode, source, local-only, and web-login status.
- `D-OVERVIEW-06`: Field mappings card renders status, priority, title, and owner mapping states.
- `D-OVERVIEW-07`: Field mapping fix action navigates to Configuration intentionally.
- `D-OVERVIEW-08`: Recent activity renders latest audit entries or empty state.
- `D-OVERVIEW-09`: Overview valid action opens Playground and runs dashboard validation command.
- `D-OVERVIEW-10`: Copy next action copies the visible next safe command.

## Configuration Scenarios

- `D-CONFIG-01`: Configuration page renders Source, Lark App Credentials, Field Mappings, and output.
- `D-CONFIG-02`: Reset reloads server draft without changing active page.
- `D-CONFIG-03`: Save submits all visible configuration values.
- `D-CONFIG-04`: Save output redacts application secret values.
- `D-CONFIG-05`: Invalid source URL renders a recoverable error and preserves inputs.
- `D-CONFIG-06`: Workflow mode and Lark domain controls behave as selectable controls.
- `D-CONFIG-07`: Focusing or changing each mapping control does not scroll to top.
- `D-CONFIG-08`: Focusing page inputs does not change hash, active page, or breadcrumb.
- `D-CONFIG-09`: Status, priority, title, and owner mapping controls are selectable field controls populated from discovered fields.
- `D-CONFIG-10`: Field discovery or sync updates every mapping control with available fields.
- `D-CONFIG-11`: Changed mappings save and synchronize to Overview.
- `D-CONFIG-12`: Blocked field discovery reports blocked or missing dependency honestly.
- `D-CONFIG-13`: Scopes input normalizes to individual scope values.
- `D-CONFIG-14`: Callback port validation handles invalid values clearly.
- `D-CONFIG-15`: Default owner and actionable status save behavior matches visible form values.

## Lark Login Scenarios

- `D-AUTH-01`: Current Auth card renders account, domain, scopes, expiry, and storage state.
- `D-AUTH-02`: Missing auth renders missing status and remediation.
- `D-AUTH-03`: Requested scopes are reflected in login start behavior.
- `D-AUTH-04`: Start login renders waiting status and flow progress.
- `D-AUTH-05`: Authorization action opens or exposes the authorization URL.
- `D-AUTH-06`: Open In Browser does not open placeholder text as a URL.
- `D-AUTH-07`: Ready login status refreshes Current Auth.
- `D-AUTH-08`: Failed, canceled, or expired login shows remediation without corrupting valid auth.
- `D-AUTH-09`: Logout returns auth and Overview to missing or blocked state.
- `D-AUTH-10`: Auth UI never exposes tokens, refresh tokens, app secrets, or authorization codes.

## Audit Scenarios

- `D-AUDIT-01`: Audit page renders filters, entries table, detail card, and export action.
- `D-AUDIT-02`: Initial load renders newest-first entries and correct count.
- `D-AUDIT-03`: Every filter is reflected in the resulting query.
- `D-AUDIT-04`: Applying filters updates list and counts.
- `D-AUDIT-05`: Selecting a row loads matching detail and selected style.
- `D-AUDIT-06`: Detail renders sanitized command, argv, timing, mode, evidence, and JSON.
- `D-AUDIT-07`: Export copies the currently visible list.
- `D-AUDIT-08`: Empty audit data renders an empty state.
- `D-AUDIT-09`: Malformed, rotated, large, or skipped audit data renders partial/skipped evidence.
- `D-AUDIT-10`: Audit UI and details redact secret-like values.

## Playground Scenarios

- `D-PLAY-01`: Command list renders valid, schema, list, get, filter, search, triage, research, verify, and write.
- `D-PLAY-02`: Selecting each command updates selected style, parameters, safety, and preview.
- `D-PLAY-03`: Valid workflow selection updates preview and run payload.
- `D-PLAY-04`: Schema and list limit changes update preview and run payload.
- `D-PLAY-05`: Get and verify record identifiers are shaped as expected by the command preview.
- `D-PLAY-06`: Filter parameters update preview and run payload.
- `D-PLAY-07`: Empty required search input produces a clear issue, not a broken page.
- `D-PLAY-08`: Research parameters update preview and run payload.
- `D-PLAY-09`: Write without confirmation remains preview-first.
- `D-PLAY-10`: Write with explicit confirmation is clearly marked as dangerous and requires confirmation evidence.
- `D-PLAY-11`: Response Structured, Human, and Audit tabs represent the same run.
- `D-PLAY-12`: Run History keeps recent runs and Clear History clears it.
- `D-PLAY-13`: Copy CLI copies the visible preview command.
- `D-PLAY-14`: Run failure or timeout preserves status, issues, evidence, and next safe actions.
- `D-PLAY-15`: Completed runs are traceable from Audit when an audit entry exists.

## Research Scenarios

- `D-RESEARCH-01`: Research page renders list, search, count, reader, copy, and load controls.
- `D-RESEARCH-02`: Empty research directory renders no reports state.
- `D-RESEARCH-03`: Valid reports render name, selected record, created time, canonical path, and snippet.
- `D-RESEARCH-04`: Selecting a report loads matching detail and selected style.
- `D-RESEARCH-05`: Reader preserves observed facts, assumptions, analysis, likely causes, recommended fixes, risks, next actions, and evidence.
- `D-RESEARCH-06`: Search filters the report list.
- `D-RESEARCH-07`: Load Reports reloads list without losing intentional filter state unless specified.
- `D-RESEARCH-08`: Copy Path copies selected report path and never copies `undefined`.
- `D-RESEARCH-09`: Copy Content copies readable report content.
- `D-RESEARCH-10`: Copy Dir copies the research directory path.
- `D-RESEARCH-11`: Malformed, unreadable, or unsafe reports are marked unavailable without hiding valid reports.
- `D-RESEARCH-12`: Report source content is not translated by dashboard language switching.

## Source Table Scenarios

- `D-TABLE-01`: Source Table page renders source banner, tabs, filters, records, and schema panes.
- `D-TABLE-02`: Missing source or auth renders blocked or empty states without a broken page.
- `D-TABLE-03`: Ready source renders source banner values.
- `D-TABLE-04`: Records tab renders record ids and field columns.
- `D-TABLE-05`: Search and apply filter records consistently.
- `D-TABLE-06`: Array, object, null, and long cell values remain readable.
- `D-TABLE-07`: Schema tab toggles panes and selected state correctly.
- `D-TABLE-08`: Schema rows render field names, sample counts, observed values, and mapping/sample pills.
- `D-TABLE-09`: Refresh reloads table data without changing the selected tab.
- `D-TABLE-10`: Export copies current records and schema state.
- `D-TABLE-11`: Wide and long table content remains inspectable.
- `D-TABLE-12`: Source field and record values are not translated by language switching.

## Language and Privacy Scenarios

- `D-I18N-01`: Default language resolves from browser storage or browser preference.
- `D-I18N-02`: English switch updates dashboard-owned text and document language.
- `D-I18N-03`: Traditional Chinese switch updates dashboard-owned text and document language.
- `D-I18N-04`: Refresh restores browser-stored language preference.
- `D-I18N-05`: Clearing browser storage resets fallback and does not write server-side language state.
- `D-I18N-06`: Source-controlled values are not translated.
- `D-I18N-07`: Language switching does not reset active page, selected tabs, form values, or run history.
- `D-SEC-01`: Visible text scan finds no unredacted token-like or secret-like values.
- `D-SEC-02`: Rendered network response details are redacted.
- `D-SEC-03`: App Secret is never shown after save except as state.
- `D-SEC-04`: Dashboard binding remains local-only by default.
- `D-SEC-05`: Validation does not create dashboard DB/session/schema persistence.
- `D-SEC-06`: Browser storage does not contain tokens, secrets, or auth codes.

## Error and Responsive Scenarios

- `D-ERR-01`: Status load failure renders page error rather than blank page.
- `D-ERR-02`: Config validation failure renders recoverable error and keeps input values.
- `D-ERR-03`: Audit detail load failure keeps list visible.
- `D-ERR-04`: Playground failure remains inspectable across response tabs.
- `D-ERR-05`: Research detail failure keeps report list visible.
- `D-ERR-06`: Partial table failure renders available pane data and failed pane state.
- `D-ERR-07`: Error states include remediation or next-step language.
- `D-UI-01`: Desktop visual evidence covers all seven pages.
- `D-UI-02`: Mobile visual evidence covers Overview, Configuration, Playground, Research, and Source Table.
- `D-UI-03`: Active, hover, focus, and selected states are visible.
- `D-UI-04`: Empty, blocked, partial, and error states are readable and styled.
- `D-UI-05`: UI follows the approved design language without material regressions.
- `D-UI-06`: Loading and empty states do not use broken raw layout.
- `D-UI-07`: Keyboard focus is visible and primary controls are reachable.
