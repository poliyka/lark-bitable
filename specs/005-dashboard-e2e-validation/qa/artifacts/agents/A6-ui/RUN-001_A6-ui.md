# RUN-001 A6 UI & Responsive

## Ownership

- Agent: A6
- Lane: A6-ui
- Owner: UI & Responsive
- Artifact directory: `/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/specs/005-dashboard-e2e-validation/qa/artifacts/agents/A6-ui`
- Browser policy used: `mcp__chrome_devtools_isolated__` only

## Dashboard Startup

- Status: pass
- Dashboard origin: `http://127.0.0.1:48791`
- Requested port: `48791`
- Actual port: `48791`
- Startup evidence: `RUN-001_A6-ui_startup.json`
- Dashboard JSON reported `dashboardLoginRequired: false` and `localOnly: true`.
- Previous A6 Playwright helper artifacts were reconciled by deleting `a6-capture.mjs` and stale `*_dom.json` files. Screenshots/snapshots referenced below were captured with isolated MCP.

## Scenario Statuses

- [x] D-UI-01: pass - Desktop visual evidence covers all seven pages through isolated MCP screenshots and accessibility snapshots.
- [x] D-UI-02: fail - Required mobile screenshots were captured, but responsive/deep-link validation exposed stale binding values after viewport emulation/reload.
- [x] D-UI-03: fail - Active, hover, and selected states are visible, but keyboard focus styling is not visually distinct on primary controls.
- [x] D-UI-04: pass - Empty, blocked/missing, partial, and induced recoverable error states are readable and styled.
- [x] D-UI-05: pass - The approved dark developer-console design language and core tokens are present; defects are tracked under interaction/responsive scenarios.
- [x] D-UI-06: pass - Refresh/empty-state captures did not show broken raw layout or blank unstyled UI.
- [x] D-UI-07: fail - Primary controls are reachable by keyboard, but focused controls do not show a visible focus ring or equivalent state.

## Counts

- Passed: 4
- Failed: 3
- Blocked: 0
- Not run: 0

## Evidence Summary

- Desktop pages: `RUN-001_D-UI-01_desktop-pages/`
- Mobile pages: `RUN-001_D-UI-02_mobile-pages/`
- Interactive state evidence: `RUN-001_D-UI-03_states.json`
- Empty/blocked/error evidence: `RUN-001_D-UI-04_empty-blocked-error.json`
- Design assessment: `RUN-001_D-UI-05_design-assessment.md`
- Loading/empty evidence: `RUN-001_D-UI-06_loading-empty.json`
- Keyboard focus evidence: `RUN-001_D-UI-07_keyboard-focus.json`
- Console summary: `RUN-001_console-summary.json`
- Network summary: `RUN-001_network-summary.json`

## Findings

### A6-DEF-001: Keyboard focus is not visibly distinct on primary controls

- Severity: High
- Scenarios: D-UI-03, D-UI-07
- Reproduction steps: Open the dashboard, navigate to Source Table, press `Tab` until focus reaches the topbar command palette or Source Table refresh button.
- Expected: Focused controls show a visible green focus ring, glow, border, or similarly clear focus indicator per the design reference.
- Actual: Focus moves to primary controls, but computed styles show `outline-style: none`, `box-shadow: none`, and unchanged border color. Screenshots do not show a reliable focus indicator.
- Evidence: `RUN-001_D-UI-07_keyboard-screenshots/RUN-001_D-UI-07_topbar-focus.png`
- Evidence: `RUN-001_D-UI-07_keyboard-focus.json`
- Developer follow-up: Add a visible `:focus-visible` treatment for buttons, tabs, nav items, inputs, and topbar controls that matches the approved terminal-green focus-ring design.

### A6-DEF-002: Direct hash deep links do not activate the matching page on load/navigation

- Severity: Medium
- Scenarios: D-UI-01, D-UI-02
- Reproduction steps: Navigate the isolated browser directly from `/#overview` to `http://127.0.0.1:48791/#config`.
- Expected: The Configuration page becomes active, the breadcrumb changes to Configuration, and the sidebar marks Configuration current.
- Actual: The URL changed to `/#config`, but the active page remained `overview-page`, the heading remained `總覽`, and the active nav remained Overview until the sidebar Configuration button was clicked.
- Evidence: Captured as browser-visible observation during D-UI-01 setup before the Configuration desktop screenshot; page capture proceeded by real sidebar click to avoid contaminating screenshot evidence.
- Developer follow-up: Ensure initial hash and direct hash navigation call the same route activation logic as sidebar clicks.

### A6-DEF-003: Responsive viewport emulation/reload can show stale binding defaults

- Severity: Medium
- Scenarios: D-UI-02
- Reproduction steps: Capture mobile views with isolated MCP emulation, return to desktop emulation on `/#table`, and inspect the sidebar binding card before any later data mutation.
- Expected: Binding card continues to show the actual lane origin values: status `ready`, port `48791`.
- Actual: Sidebar binding card showed status `starting` and port `48731` while `fetch('/api/status')` returned ready binding data for port `48791`. The card later refreshed back to `ready` / `48791` after a Configuration save action.
- Evidence: `RUN-001_D-UI-02_mobile-pages/` mobile screenshots and `RUN-001_network-summary.json`; the API status observation is summarized in this finding.
- Developer follow-up: Make the shell binding card derive from the current `/api/status` result after viewport-triggered reloads and direct deep-link loads, not stale default binding data.

## Blocked Checks

- None.

## Notes

- The induced `POST /api/config` 500 is expected evidence for the recoverable error-state check and is not counted as an unexpected network failure.
- Chrome DevTools reported form-label and autocomplete issues during the run. These are recorded in `RUN-001_console-summary.json`; A6 did not classify them as product defects because this lane is focused on visual UI and responsive behavior, but they are relevant for accessibility follow-up.
