# Quickstart: Dashboard Comprehensive E2E and UI Validation

## Prerequisites

- Node.js `>=22`
- `pnpm install`
- A browser that can be controlled for screenshots, snapshots, console logs, network logs, and DOM observations
- Optional for live Lark scenarios: test Lark account, test Lark app, and test Bitable with representative fields and records

## Repository Baseline

Run from repository root:

```bash
pnpm format:check
pnpm build
pnpm test
```

Expected result:

- Formatting check passes.
- TypeScript build passes.
- Existing test suite passes.

If any command fails, record the failure in the run report before continuing.

## Start Dashboard With Isolated State

Run:

```bash
TMP_ROOT="$(mktemp -d /tmp/lark-dashboard-e2e.XXXXXX)"

pnpm dev dashboard \
  --no-open \
  --port 49123 \
  --host 127.0.0.1 \
  --config-cwd "$TMP_ROOT/config" \
  --auth-path "$TMP_ROOT/auth.json" \
  --research-dir "$TMP_ROOT/research" \
  --audit-path "$TMP_ROOT/audit.json"
```

Expected result:

- The command reports a local dashboard URL.
- `dashboardLoginRequired` is false.
- `localOnly` is true.
- The dashboard uses the temporary config, auth, audit, and research paths.

Keep the dashboard process running for browser validation.

## Browser Preflight

Open the reported dashboard URL in a controllable browser.

Record:

- Browser identity and version.
- Desktop viewport.
- Mobile viewport.
- Initial URL.
- Console summary after load.
- Initial network summary.
- Initial screenshot and accessibility snapshot.

If the browser automation tool cannot create or control a page, mark browser-dependent checks blocked. Do not replace browser validation with static asset inspection.

## Run the Coverage Contract

Use [dashboard-e2e-coverage-contract.md](./contracts/dashboard-e2e-coverage-contract.md) as the scenario list.

Minimum execution order:

1. Global shell scenarios.
2. Overview scenarios.
3. Configuration scenarios.
4. Lark Login scenarios.
5. Audit scenarios.
6. Playground scenarios.
7. Research scenarios.
8. Source Table scenarios.
9. Language and privacy scenarios.
10. Error and responsive scenarios.

For every scenario, record:

- Scenario id.
- Actions performed.
- Expected behavior.
- Actual behavior.
- Evidence ids.
- Status: pass, fail, or blocked.

## Required Focused Regression Checks

Configuration field mapping scroll check:

1. Open Configuration.
2. Scroll until Field Mappings is away from the top.
3. Record `window.scrollY`, active page, hash, and focused element.
4. Focus or open `statusField`.
5. Record `window.scrollY`, active page, hash, and focused element again.
6. Repeat for `priorityField`, `titleField`, and `ownerField`.

Expected result:

- The page does not scroll to top.
- The active page remains Configuration.
- The hash remains Configuration.
- The focused or selected field is the mapping control being tested.

Field mapping selectable-control check:

1. Trigger field discovery or sync.
2. Open each mapping control.
3. Verify each control exposes discovered source fields as selectable options.
4. Select distinct valid mappings.
5. Save configuration.
6. Confirm saved configuration and Overview mapping card reflect the selections.

Expected result:

- All four mapping controls are dropdowns or equivalent selectable controls.
- Sync updates every mapping control.
- Blocked sync reports a blocked state and does not claim success.

## Evidence Storage

Recommended evidence location:

```text
specs/005-dashboard-e2e-validation/qa/
```

Recommended files:

```text
CASE.md
RUN-001.md
REPORT-001.md
artifacts/
```

Follow [browser-evidence-contract.md](./contracts/browser-evidence-contract.md) and [qa-report-contract.md](./contracts/qa-report-contract.md).

## Final Report Decision

Use these rules:

- `pass`: All P1 scenarios pass, no unresolved console errors, no secret leakage, no unblocked failed UI checks.
- `fail`: Any P1 scenario fails, any secret leakage is observed, or any major UI action is broken.
- `blocked`: Browser control, live Lark account, test Lark app, or test Bitable is unavailable for required scenarios.

The report must explicitly state whether field mapping dropdown behavior, field mapping sync, and Configuration scroll-position checks passed, failed, or were blocked.
