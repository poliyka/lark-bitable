# REPORT-001 Dashboard E2E Validation

## Summary Status

Fail.

RUN-001 completed the full dashboard E2E/UI validation package with isolated dashboard state and isolated Chrome DevTools MCP browser evidence. The dashboard launches without a dashboard login and 82 scenarios passed, but 27 scenarios failed with reproducible product defects and 12 scenarios remain blocked by named live Lark or fault-injection dependencies.

## Coverage Summary

- Total scenarios: 121
- Passed: 82
- Failed: 27
- Blocked: 12
- Not run: 0
- Primary tracker: `specs/005-dashboard-e2e-validation/qa/artifacts/RUN-001_scenario-tracker.md`

## High Severity Findings

- `A2-CONFIG-DEFECT-002`: field mapping controls are not populated selectable field dropdowns. The controls use an empty datalist, so the user cannot select discovered source fields.
- `A2-CONFIG-DEFECT-003`: blocked field discovery/sync response is not surfaced with remediation in Configuration.
- `A4-AUDIT-ROW-SELECTION`: Audit row click fetches detail but selected row/detail remain stale.
- `A4-PLAY-SCHEMA-LIMIT`: Playground schema uses unsupported `--limit` instead of the CLI contract.
- `A4-PLAY-WRITE-CONTRACT`: Playground write omits required `--op` and uses invalid write shaping.
- `A5-DATA-DEFECT-002`: Research report row click does not switch selected reader/detail.
- `A6-DEF-001`: keyboard focus is reachable but not visibly distinct on primary controls.
- `A7-D-SEC-03-secret-input-retained`: app secret password input keeps the raw submitted value in DOM after save.
- `A8-DEF-002`: Audit detail failure loses the list and leaves stale detail.
- `A8-DEF-004`: Research detail failure loses the list and resets reader.

## Required Regression Calls

- Field mapping dropdown behavior: failed. Evidence: `agents/A2-config/RUN-001_D-CONFIG-09_mapping-controls.json`; finding `A2-CONFIG-DEFECT-002`.
- Field mapping sync: live successful sync is blocked by missing Lark auth/test account for `D-CONFIG-10`; additionally, the blocked sync/remediation UI failed in `D-CONFIG-12` with `A2-CONFIG-DEFECT-003`.
- Configuration scroll-position checks: passed. Evidence: `agents/A2-config/RUN-001_D-CONFIG-07_statusField-scroll.json`, `priorityField-scroll.json`, `titleField-scroll.json`, and `ownerField-scroll.json`; no scroll-to-top regression was observed for the four mapping fields.

## Blocked Scenarios

- `D-CONFIG-10`: requires Lark auth/test account for successful field sync.
- `D-AUTH-07`: requires live Lark test account/app/Bitable and app secret.
- `D-TABLE-03`, `D-TABLE-04`, `D-TABLE-05`, `D-TABLE-06`, `D-TABLE-08`, `D-TABLE-11`, `D-TABLE-12`: require live Lark source/auth plus test records/schema/source values.
- `D-I18N-06`: local source/report boundary passed, but live Source Table value boundary requires live Lark data.
- `D-ERR-01`: requires supported status-failure fault injection or a safe test hook.
- `D-ERR-06`: requires live source/auth or supported one-pane table fault injection.

## Evidence Index

- Master evidence index: `specs/005-dashboard-e2e-validation/qa/artifacts/RUN-001_evidence-index.md`
- Run log: `specs/005-dashboard-e2e-validation/qa/RUN-001.md`
- Console summary: `specs/005-dashboard-e2e-validation/qa/artifacts/RUN-001_console-final.json`
- Network summary: `specs/005-dashboard-e2e-validation/qa/artifacts/RUN-001_network-final.json`

## Observed Facts

- Dashboard opened locally with no dashboard login requirement and loopback/local-only binding.
- Shell navigation, keyboard shortcuts, command palette, refresh, and copy actions mostly passed.
- Configuration save/reset/select/scroll/focus behavior mostly passed, but invalid error preservation, populated mapping dropdowns, and blocked sync UI failed.
- Lark auth local/missing/login-start/logout/redaction behavior passed; real ready-auth callback remains blocked by live credentials.
- Audit and Playground are visible and usable, but several filter/detail and CLI-command contract paths fail.
- Research and Source Table missing-state rendering works, but Research selection/empty/copy/malformed handling fails and live Source Table rows/schema remain blocked.
- Desktop/mobile visual evidence was captured; design language is present, but focus visibility and direct hash/viewport shell binding behavior fail.
- Language switching works for English/Traditional Chinese and browser cache, but breadcrumb state can desynchronize.
- Security scans passed for visible text, rendered response redaction, local-only binding, no DB/session persistence, and browser storage; app secret DOM retention failed.
- Error-state validation found multiple stale-list/stale-detail and missing-remediation behaviors.

## Assumptions

- No live Lark test account/app/Bitable credentials were available during RUN-001.
- Blocked live Lark scenarios must not be treated as passed until rerun with real test credentials and source data.
- Fault-injection scenarios must use supported dashboard/test hooks; RUN-001 did not edit production source or use unsupported browser request monkeypatching.

## Risks

- Several failures are state synchronization defects; fixing one page may require shared selection/detail/error-state patterns across Audit and Research.
- Playground command builders appear out of sync with CLI contracts; similar drift may exist in commands not deeply covered by RUN-001.
- Focus visibility is an accessibility risk even when mouse interaction works.
- Secret values are redacted in rendered/API evidence, but app secret DOM retention is a high-risk local privacy issue.

## Developer Follow-up

- Fix field mapping option population and blocked discovery/sync remediation first because they directly affect the user's explicit concerns.
- Repair Playground command builder contracts against the actual CLI commands, especially schema, research, and write.
- Normalize selection/detail/error-state behavior for Audit and Research lists.
- Add visible focus styling for all primary controls and validate keyboard focus screenshots.
- Add safe dashboard test hooks for status failure and partial table pane failure so blocked error scenarios can be verified without source edits.
- Rerun blocked live Lark scenarios with a dedicated test Lark account, app, Bitable, schema, and records.

## Retest Recommendation

Retest after fixes. Minimum retest scope should include `D-CONFIG-09` through `D-CONFIG-12`, all failed A4 Playground/Audit scenarios, all failed A5 Research scenarios, `D-UI-02`, `D-UI-03`, `D-UI-07`, `D-I18N-07`, `D-SEC-03`, and all A8 failed error-state scenarios. A live-dependency retest should separately rerun blocked `D-AUTH-07`, `D-TABLE-*`, `D-I18N-06`, and live field sync `D-CONFIG-10`.
