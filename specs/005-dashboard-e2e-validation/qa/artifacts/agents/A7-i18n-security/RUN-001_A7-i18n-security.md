# RUN-001 A7 I18n & Privacy

## Ownership

- Agent: A7
- Lane: A7-i18n-security
- Owner: I18n & Privacy
- Artifact directory: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/specs/005-dashboard-e2e-validation/qa/artifacts/agents/A7-i18n-security
- Browser tool: `mcp__chrome_devtools_isolated__`

## Dashboard Startup

- Requested origin: `http://127.0.0.1:48801`
- Bound origin: `http://127.0.0.1:48801`
- Host: `127.0.0.1`
- Port: `48801`
- Dashboard login required: `false`
- Local-only: `true`
- Config cwd: `/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A7-i18n-security/config`
- Auth path: `/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A7-i18n-security/auth.json`
- Audit path: `/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A7-i18n-security/audit.json`
- Research dir: `/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A7-i18n-security/research`
- Startup evidence: `RUN-001_A7-i18n-security_startup.txt`

## Scenario Statuses

- [x] D-I18N-01: pass - Default language resolved from browser zh-TW preference after storage clear and wrote `lark-bitable.dashboard.lang=zh-TW` to browser localStorage.
- [x] D-I18N-02: pass - English switch updated dashboard-owned headings and controls on Overview, Configuration, Lark Login, Audit Logs, Playground, Research Reports, and Source Table.
- [x] D-I18N-03: pass - Traditional Chinese switch updated dashboard-owned headings and controls on all seven primary pages.
- [x] D-I18N-04: pass - Browser refresh restored stored English preference and preserved `#research`.
- [x] D-I18N-05: pass - Clearing browser storage reset fallback to browser zh-TW preference and no server-side language state was found in browser API responses or A7 state files.
- [x] D-I18N-06: blocked - Local source config and research report values stayed verbatim across language switches, but live Source Table record/schema value boundary was blocked by missing live Lark auth session and test Bitable records in the A7 isolated state.
- [x] D-I18N-07: fail - Active page, selected response tab, form values, and run history were preserved, but language switching reset the breadcrumb to Overview/總覽 while the active page remained Playground or Configuration.
- [x] D-SEC-01: pass - Visible text scan found no unredacted token-like or secret-like values across all seven primary pages.
- [x] D-SEC-02: pass - Rendered details and checked network/API response bodies exposed redacted state/markers, not raw secret values.
- [x] D-SEC-03: fail - App Secret is not visible in text or API output after save, but the password input retains the submitted secret in its DOM value after save instead of clearing to display state only.
- [x] D-SEC-04: pass - Dashboard binding remained local-only on `127.0.0.1:48801` and reported no dashboard login requirement.
- [x] D-SEC-05: pass - A7 validation created no dashboard DB/session/schema persistence files under the A7 isolated state path.
- [x] D-SEC-06: pass - Browser localStorage contained only `lark-bitable.dashboard.lang`; sessionStorage was empty and no token/secret/auth-code fragments were found.

## Counts

- Total scenarios: 13
- Passed: 10
- Failed: 2
- Blocked: 1
- Not run: 0

## Findings

- A7-D-I18N-07-crumb-reset: Language switching on a non-overview page preserves the active page and hash, but `#crumb-page` changes to Overview/總覽. The breadcrumb element retains `data-i18n="navOverview"` and is overwritten by `applyLanguage()` even after page routing set it to the active page label.
- A7-D-SEC-03-secret-input-retained: After saving a new App Secret, rendered output remains redacted and visible text does not expose the secret, but the App Secret password input keeps the submitted secret in its DOM `value`. Expected post-save display state is `stored-redacted` with an empty password input.

## Blocked Checks

- D-I18N-06 live Source Table record/schema value translation boundary: blocked by missing live Lark auth session and test Bitable records in the A7 isolated state. Local source config values, source banner values, and research report values were verified as not translated.

## Evidence

- Startup: `RUN-001_A7-i18n-security_startup.txt`
- Browser snapshots/screenshots: `RUN-001_A7_initial_snapshot.txt`, `RUN-001_A7_after-seed_snapshot.txt`, `RUN-001_A7_final-visible-state.png`
- I18n evidence: `RUN-001_D-I18N-01_default.json` through `RUN-001_D-I18N-07_state-preservation.json`
- Privacy evidence: `RUN-001_D-SEC-01_visible-secret-scan.json` through `RUN-001_D-SEC-06_browser-storage.json`
- Console/network summaries: `RUN-001_A7-i18n-security_console-summary.json`, `RUN-001_A7-i18n-security_network-summary.json`

## Notes

- A7 wrote controlled non-sensitive source/report fixtures under its own lane state to validate local source-boundary behavior without touching other lanes.
- A7 used only `mcp__chrome_devtools_isolated__` for browser-visible validation.
