# RUN-001 A6 Evidence Index

## Scope

- Agent: A6-ui
- Dashboard origin: `http://127.0.0.1:48791`
- Browser-visible evidence tool: `mcp__chrome_devtools_isolated__`
- Redaction status for all listed artifacts: `redacted-or-no-sensitive-data`

## Startup and Runtime

- Evidence ID: A6-E000
- Scenario IDs: D-UI-01, D-UI-02, D-UI-03, D-UI-04, D-UI-05, D-UI-06, D-UI-07
- Kind: startup command JSON
- Path: `RUN-001_A6-ui_startup.json`
- Summary: Actual dashboard binding, requested and actual port, isolated A6 state paths, and browser policy.

- Evidence ID: A6-E001
- Scenario IDs: D-UI-03, D-UI-04, D-UI-06, D-UI-07
- Kind: console summary
- Path: `RUN-001_console-summary.json`
- Summary: Console issues and expected induced 500 error during invalid Configuration save.

- Evidence ID: A6-E002
- Scenario IDs: D-UI-04, D-UI-06
- Kind: network summary
- Path: `RUN-001_network-summary.json`
- Summary: Local dashboard request statuses, including expected `POST /api/config` 500 for recoverable error-state evidence.

## D-UI-01 Desktop Page Evidence

- Evidence ID: A6-E010
- Scenario IDs: D-UI-01
- Kind: desktop screenshot and accessibility snapshot
- Path: `RUN-001_D-UI-01_desktop-pages/RUN-001_D-UI-01_overview_desktop.png`
- Path: `RUN-001_D-UI-01_desktop-pages/RUN-001_D-UI-01_overview_desktop_snapshot.txt`
- Summary: Overview desktop page.

- Evidence ID: A6-E011
- Scenario IDs: D-UI-01
- Kind: desktop screenshot and accessibility snapshot
- Path: `RUN-001_D-UI-01_desktop-pages/RUN-001_D-UI-01_config_desktop.png`
- Path: `RUN-001_D-UI-01_desktop-pages/RUN-001_D-UI-01_config_desktop_snapshot.txt`
- Summary: Configuration desktop page.

- Evidence ID: A6-E012
- Scenario IDs: D-UI-01
- Kind: desktop screenshot and accessibility snapshot
- Path: `RUN-001_D-UI-01_desktop-pages/RUN-001_D-UI-01_auth_desktop.png`
- Path: `RUN-001_D-UI-01_desktop-pages/RUN-001_D-UI-01_auth_desktop_snapshot.txt`
- Summary: Lark Login desktop page.

- Evidence ID: A6-E013
- Scenario IDs: D-UI-01
- Kind: desktop screenshot and accessibility snapshot
- Path: `RUN-001_D-UI-01_desktop-pages/RUN-001_D-UI-01_audit_desktop.png`
- Path: `RUN-001_D-UI-01_desktop-pages/RUN-001_D-UI-01_audit_desktop_snapshot.txt`
- Summary: Audit Logs desktop page.

- Evidence ID: A6-E014
- Scenario IDs: D-UI-01
- Kind: desktop screenshot and accessibility snapshot
- Path: `RUN-001_D-UI-01_desktop-pages/RUN-001_D-UI-01_playground_desktop.png`
- Path: `RUN-001_D-UI-01_desktop-pages/RUN-001_D-UI-01_playground_desktop_snapshot.txt`
- Summary: Playground desktop page.

- Evidence ID: A6-E015
- Scenario IDs: D-UI-01, D-UI-04, D-UI-06
- Kind: desktop screenshot and accessibility snapshot
- Path: `RUN-001_D-UI-01_desktop-pages/RUN-001_D-UI-01_research_desktop.png`
- Path: `RUN-001_D-UI-01_desktop-pages/RUN-001_D-UI-01_research_desktop_snapshot.txt`
- Summary: Research Reports desktop page and empty research state.

- Evidence ID: A6-E016
- Scenario IDs: D-UI-01, D-UI-04, D-UI-06
- Kind: desktop screenshot and accessibility snapshot
- Path: `RUN-001_D-UI-01_desktop-pages/RUN-001_D-UI-01_table_desktop.png`
- Path: `RUN-001_D-UI-01_desktop-pages/RUN-001_D-UI-01_table_desktop_snapshot.txt`
- Summary: Source Table desktop page and empty table state.

## D-UI-02 Mobile Page Evidence

- Evidence ID: A6-E020
- Scenario IDs: D-UI-02
- Kind: mobile screenshot and accessibility snapshot
- Path: `RUN-001_D-UI-02_mobile-pages/RUN-001_D-UI-02_overview_mobile.png`
- Path: `RUN-001_D-UI-02_mobile-pages/RUN-001_D-UI-02_overview_mobile_snapshot.txt`
- Summary: Overview mobile viewport.

- Evidence ID: A6-E021
- Scenario IDs: D-UI-02
- Kind: mobile screenshot and accessibility snapshot
- Path: `RUN-001_D-UI-02_mobile-pages/RUN-001_D-UI-02_config_mobile.png`
- Path: `RUN-001_D-UI-02_mobile-pages/RUN-001_D-UI-02_config_mobile_snapshot.txt`
- Summary: Configuration mobile viewport.

- Evidence ID: A6-E022
- Scenario IDs: D-UI-02
- Kind: mobile screenshot and accessibility snapshot
- Path: `RUN-001_D-UI-02_mobile-pages/RUN-001_D-UI-02_playground_mobile.png`
- Path: `RUN-001_D-UI-02_mobile-pages/RUN-001_D-UI-02_playground_mobile_snapshot.txt`
- Summary: Playground mobile viewport.

- Evidence ID: A6-E023
- Scenario IDs: D-UI-02
- Kind: mobile screenshot and accessibility snapshot
- Path: `RUN-001_D-UI-02_mobile-pages/RUN-001_D-UI-02_research_mobile.png`
- Path: `RUN-001_D-UI-02_mobile-pages/RUN-001_D-UI-02_research_mobile_snapshot.txt`
- Summary: Research Reports mobile viewport.

- Evidence ID: A6-E024
- Scenario IDs: D-UI-02
- Kind: mobile screenshot and accessibility snapshot
- Path: `RUN-001_D-UI-02_mobile-pages/RUN-001_D-UI-02_table_mobile.png`
- Path: `RUN-001_D-UI-02_mobile-pages/RUN-001_D-UI-02_table_mobile_snapshot.txt`
- Summary: Source Table mobile viewport.

## Interaction and State Evidence

- Evidence ID: A6-E030
- Scenario IDs: D-UI-03
- Kind: state observation JSON
- Path: `RUN-001_D-UI-03_states.json`
- Summary: Active, selected, hover, and failed focus-state observations.

- Evidence ID: A6-E031
- Scenario IDs: D-UI-03
- Kind: screenshot
- Path: `RUN-001_D-UI-03_state-screenshots/RUN-001_D-UI-03_table-tab-hover-focus.png`
- Summary: Hover/selected state capture on Source Table tabs.

- Evidence ID: A6-E040
- Scenario IDs: D-UI-04
- Kind: empty/blocked/error observation JSON
- Path: `RUN-001_D-UI-04_empty-blocked-error.json`
- Summary: Partial overview, missing auth/source, empty research/table, and recoverable Configuration error.

- Evidence ID: A6-E041
- Scenario IDs: D-UI-04
- Kind: screenshot and accessibility snapshot
- Path: `RUN-001_D-UI-04_state-screenshots/RUN-001_D-UI-04_config-error-state.png`
- Path: `RUN-001_D-UI-04_state-screenshots/RUN-001_D-UI-04_config-error-state_snapshot.txt`
- Summary: Invalid source URL recoverable error state.

- Evidence ID: A6-E050
- Scenario IDs: D-UI-05
- Kind: design assessment
- Path: `RUN-001_D-UI-05_design-assessment.md`
- Summary: Design fidelity comparison against `specs/004-add-dashboard-command/design.md`.

- Evidence ID: A6-E060
- Scenario IDs: D-UI-06
- Kind: loading/empty observation JSON and screenshot
- Path: `RUN-001_D-UI-06_loading-empty.json`
- Path: `RUN-001_D-UI-06_loading-refresh.png`
- Summary: Slow-network refresh capture and empty-state checks.

- Evidence ID: A6-E070
- Scenario IDs: D-UI-07
- Kind: keyboard focus observation JSON and screenshot
- Path: `RUN-001_D-UI-07_keyboard-focus.json`
- Path: `RUN-001_D-UI-07_keyboard-screenshots/RUN-001_D-UI-07_topbar-focus.png`
- Summary: Keyboard reachability passed, visible focus styling failed.
