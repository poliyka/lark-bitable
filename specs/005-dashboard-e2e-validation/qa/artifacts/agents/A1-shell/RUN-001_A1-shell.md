# RUN-001 A1 Shell & Overview

## Ownership

- Agent: A1
- Lane: A1-shell
- Owner: Shell & Overview
- Artifact directory: `/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/specs/005-dashboard-e2e-validation/qa/artifacts/agents/A1-shell`

## Dashboard Startup

- Status: pass
- Requested origin: `http://127.0.0.1:48741`
- Observed origin: `http://127.0.0.1:48741`
- Command: `pnpm dev dashboard --no-open --json --port 48741 --host 127.0.0.1 --config-cwd ".lark-bitable/dashboard-e2e/RUN-001/state/A1-shell/config" --auth-path ".lark-bitable/dashboard-e2e/RUN-001/state/A1-shell/auth.json" --audit-path ".lark-bitable/dashboard-e2e/RUN-001/state/A1-shell/audit.json" --research-dir ".lark-bitable/dashboard-e2e/RUN-001/state/A1-shell/research"`
- Fresh rerun: started 2026-05-14T08:32:30.807Z, `dashboardLoginRequired=false`, `localOnly=true`, `requestedPort=48741`, `port=48741`
- Origin evidence: `RUN-001_A1-shell_startup.json`, `RUN-001_A1-shell_startup-observation.json`, `RUN-001_A1_api-status-rerun.json`

## Scenario Statuses

- [x] D-SHELL-01: pass - Dashboard opens at `#overview` without a visible dashboard login gate; local-only and no-dashboard-login labels are visible.
- [x] D-SHELL-02: pass - Sidebar brand, seven navigation entries, binding card, `local only`, and `no dashboard login` labels are visible.
- [x] D-SHELL-03: pass - Topbar breadcrumb, refresh button, command palette button, and language controls are visible.
- [x] D-SHELL-04: pass - Clicking Overview, Configuration, Lark Login, Audit Logs, Playground, Research Reports, and Source Table updates hash, visible page heading, and breadcrumb state.
- [x] D-SHELL-05: pass - Meta+1 through Meta+7 keyboard shortcuts route to the seven expected pages.
- [x] D-SHELL-06: pass - Command palette control intentionally opens Playground with no extra network request required for the client-side route switch.
- [x] D-SHELL-07: pass - Global refresh preserves the active Research page and selected hash.
- [x] D-SHELL-08: pass - Visible shell copy actions copy `Run lark-bitable lark --login` through the clipboard stub and do not copy `undefined`.
- [x] D-SHELL-09: pass - Page-internal copy clicks preserve `#overview`; valid action navigation is intentional and covered by D-OVERVIEW-09.
- [x] D-SHELL-10: pass - Navigation and explicit actions produce bounded HTTP requests with all observed document/fetch/xhr responses at 200 and no idle request loop.
- [x] D-OVERVIEW-01: pass - Missing setup renders partial readiness and visible next safe action.
- [x] D-OVERVIEW-02: pass - Readiness summary matches `/api/status`: status `partial`, 0 blocking issues, 2 partial issues.
- [x] D-OVERVIEW-03: pass - Source card renders a non-broken missing state with source field labels.
- [x] D-OVERVIEW-04: pass - Auth card renders missing auth state without visible token leakage.
- [x] D-OVERVIEW-05: pass - Workflow card renders Developer mode, defaulted source, local-only true, and web login not required.
- [x] D-OVERVIEW-06: pass - Field mappings card renders Status, Priority, Title, and Owner mapping states as missing.
- [x] D-OVERVIEW-07: fail - The Overview field-mapping `fix` action is enabled but does not navigate to Configuration.
- [x] D-OVERVIEW-08: pass - Recent activity renders latest audit entries and a view-all action.
- [x] D-OVERVIEW-09: pass - Overview `valid` action opens Playground and posts `valid --workflow dashboard` to `/api/playground/run`.
- [x] D-OVERVIEW-10: pass - Copy next action copies the visible next safe command and does not copy `undefined`.

## Status Counts

- Pass: 19
- Fail: 1
- Blocked: 0
- Not-run: 0

## Evidence

- Startup and origin: `RUN-001_A1-shell_startup.json`, `RUN-001_A1-shell_startup-observation.json`, `RUN-001_A1_api-status-rerun.json`
- Browser identity: `RUN-001_A1_edge.txt`
- Shell screenshot and DOM: `RUN-001_D-SHELL-02_desktop.png`, `RUN-001_D-SHELL-02_desktop.json`
- Topbar snapshot: `RUN-001_D-SHELL-03_snapshot.txt`, `RUN-001_D-SHELL-03_snapshot.json`
- Navigation and keyboard routing: `RUN-001_D-SHELL-04_dom.json`, `RUN-001_D-SHELL-05_shortcuts.json`
- Command palette, refresh, copy, internal clicks, network: `RUN-001_D-SHELL-06_command-palette.json`, `RUN-001_D-SHELL-07_refresh.json`, `RUN-001_D-SHELL-08_clipboard.json`, `RUN-001_D-SHELL-09_internal-clicks.json`, `RUN-001_D-SHELL-10_network.json`
- Overview screenshot and status correlation: `RUN-001_D-OVERVIEW-01_05_desktop.png`, `RUN-001_D-OVERVIEW-01_05.json`
- Overview actions and defect evidence: `RUN-001_D-OVERVIEW-06_10.json`
- Fresh rerun reconciliation: `RUN-001_A1-rerun_initial_snapshot.txt`, `RUN-001_A1-rerun_overview_desktop.png`, `RUN-001_A1-rerun_playground_after-valid.png`, `RUN-001_A1-rerun_reconciliation.json`
- Browser summaries: `RUN-001_A1_console-summary.json`, `RUN-001_A1_network-summary.json`

## Findings

- A1-DEFECT-001: D-OVERVIEW-07 fail. Overview field-mapping `fix` button has `data-page-jump="config"` and is enabled, but clicking it leaves the dashboard at `#overview` instead of navigating to `#config`. Evidence: `RUN-001_D-OVERVIEW-06_10.json`, `RUN-001_D-SHELL-09_internal-clicks.json`, `RUN-001_A1-rerun_reconciliation.json`.
- A1-OBS-001: DevTools accessibility issues were observed during rerun: `No label associated with a form field` count 18, and `A form field element should have an id or name attribute` count 1. These are non-blocking for A1 shell/overview flow status but should be reviewed by the UI/accessibility lane.

## Blocked Checks

- None.
