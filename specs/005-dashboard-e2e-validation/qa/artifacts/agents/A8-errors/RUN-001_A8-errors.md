# RUN-001 A8 Error States

## Ownership

- Agent: A8
- Lane: A8-errors
- Owner: Error States
- Artifact directory: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/specs/005-dashboard-e2e-validation/qa/artifacts/agents/A8-errors

## Dashboard Startup

- Command: `pnpm dev dashboard --no-open --json --port 48811 --host 127.0.0.1 --config-cwd .lark-bitable/dashboard-e2e/RUN-001/state/A8-errors/config --auth-path .lark-bitable/dashboard-e2e/RUN-001/state/A8-errors/auth.json --audit-path .lark-bitable/dashboard-e2e/RUN-001/state/A8-errors/audit.json --research-dir .lark-bitable/dashboard-e2e/RUN-001/state/A8-errors/research`
- Requested port: 48811
- Actual origin: http://127.0.0.1:48811
- Browser-visible validation tool: `mcp__chrome_devtools_isolated__`
- Browser: Chrome/Edge 148 user agent via isolated DevTools context
- Startup evidence: `RUN-001_A8_startup.json`

## Scenario Statuses

- [x] D-ERR-01: blocked - Status load failure renders page error rather than blank page.
- [x] D-ERR-02: fail - Config validation failure renders recoverable error but does not keep all input values.
- [x] D-ERR-03: fail - Audit detail load failure does not keep the loaded list visible and does not render a recoverable detail error.
- [x] D-ERR-04: fail - Playground failure is inspectable in Structured/Human tabs but not across all response tabs; Audit Entry tab renders `{}`.
- [x] D-ERR-05: fail - Research detail failure does not keep the report list visible and does not render a recoverable detail error.
- [x] D-ERR-06: blocked - Partial table records-vs-schema failure could not be injected without live Lark source/auth or unsupported fault injection.
- [x] D-ERR-07: fail - Some observed error states lack visible remediation or next-step language.

## Evidence

- `RUN-001_A8_startup.json`
- `RUN-001_D-ERR-01_07_errors.json`
- `screenshots/RUN-001_A8_initial-overview.png`
- `snapshots/RUN-001_A8_initial-overview_snapshot.txt`
- `screenshots/RUN-001_D-ERR-02_config-validation-error.png`
- `snapshots/RUN-001_D-ERR-02_config-validation-error_snapshot.txt`
- `screenshots/RUN-001_D-ERR-03_audit-detail-file-removed.png`
- `snapshots/RUN-001_D-ERR-03_audit-detail-file-removed_snapshot.txt`
- `screenshots/RUN-001_D-ERR-04_playground-error-audit-empty.png`
- `screenshots/RUN-001_D-ERR-04_playground-partial-audit-tab.png`
- `snapshots/RUN-001_D-ERR-04_playground-error_snapshot.txt`
- `snapshots/RUN-001_D-ERR-04_playground-partial_snapshot.txt`
- `screenshots/RUN-001_D-ERR-05_research-detail-file-removed.png`
- `snapshots/RUN-001_D-ERR-05_research-detail-file-removed_snapshot.txt`
- `screenshots/RUN-001_D-ERR-06_table-blocked-schema.png`
- `snapshots/RUN-001_D-ERR-06_table-blocked_snapshot.txt`
- `.lark-bitable/dashboard-e2e/RUN-001/state/A8-errors/audit.json.removed-for-D-ERR-03`
- `.lark-bitable/dashboard-e2e/RUN-001/state/A8-errors/research/a8-removable-report.json.removed-for-D-ERR-05`

## Findings

- A8-DEF-001: Invalid config save clears the source URL field after validation failure, violating the input-preservation requirement for `D-ERR-02`.
- A8-DEF-002: Audit detail failure after the file-backed audit source disappears replaces the loaded list with an empty state and leaves stale detail content, violating `D-ERR-03`.
- A8-DEF-003: Playground error response loses issue/remediation detail on the Audit Entry response tab, violating the across-tabs inspectability requirement for `D-ERR-04`.
- A8-DEF-004: Research detail failure after the file-backed report disappears replaces the loaded list with an empty state and resets the reader, violating `D-ERR-05`.
- A8-DEF-005: Audit and Research detail failure states lack visible remediation or next-step language, violating `D-ERR-07`.

## Blocked Checks

- D-ERR-01: Blocked because A8 found no supported dashboard option, query parameter, UI control, or lane-state operation to force `/api/status` load failure without production source edits or unsupported browser request monkeypatching.
- D-ERR-06: Blocked because A8 has no live Lark source/auth and no supported table endpoint fault-injection mechanism to make only records or schema fail while the other pane has available data.
