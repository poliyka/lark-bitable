# RUN-001 A4-ops Audit Logs & Playground

## Origin

- Lane: A4-ops
- Feature: specs/005-dashboard-e2e-validation
- Tasks: T066, T068-T075, A4 part of T084
- Dashboard origin: http://127.0.0.1:48771
- Browser validation: mcp**chrome_devtools_isolated** only, isolatedContext=RUN-001-A4-ops
- Lane state: .lark-bitable/dashboard-e2e/RUN-001/state/A4-ops/
- Artifact directory: specs/005-dashboard-e2e-validation/qa/artifacts/agents/A4-ops/
- Recorded at: 2026-05-14T08:46:12.144Z

## Summary

- Pass: 16
- Fail: 9
- Blocked: 0
- Unexecuted: 0
- Product defects: 8
- Blockers: none for A4 browser/tool execution

## Scenario Status

- [x] D-AUDIT-01: pass - Audit page renders filters, entries table, detail card, and export action. Evidence: RUN-001_D-AUDIT-01_02.png, RUN-001_D-AUDIT-01_02_snapshot.txt
- [x] D-AUDIT-02: pass - Initial load renders newest-first entries and correct count. Observed 5 entries after dashboard startup, newest dashboard entry first, followed by seeded write/search/schema and rotated valid entries. Evidence: RUN-001_D-AUDIT-01_02.png, RUN-001_D-AUDIT-01_02_snapshot.txt
- [!] D-AUDIT-03: fail - Most filters are reflected in API queries, but issue code and from-time filters fail: issueCode=a4-write-blocked returns zero after redaction, and the visible from ISO input has no form name so no from query is submitted. Evidence: RUN-001_D-AUDIT-03_04_filters.json
- [!] D-AUDIT-04: fail - Applying command/status/mode/text/hasEvidence/hasError updates counts, but applying issue code and from-time filters does not produce the expected filtered list/count. Evidence: RUN-001_D-AUDIT-03_04_filters.json
- [!] D-AUDIT-05: fail - Clicking a visible write row issues GET /api/audit/a4-audit-newest-error but the selected style/detail pane remain on the first dashboard row. Evidence: RUN-001_D-AUDIT-05_07_detail-export.json, RUN-001_D-AUDIT-05_07_detail-export.png
- [!] D-AUDIT-06: fail - Initial detail renders sanitized command/argv/timing/mode/JSON, but clicked-row detail does not replace the displayed detail; stale detail also remains after an empty filter. Evidence: RUN-001_D-AUDIT-05_07_detail-export.json, RUN-001_D-AUDIT-08_10_empty-skipped-redaction.json
- [x] D-AUDIT-07: pass - Export copies the visible audit list and copied JSON includes visible IDs with no seeded secret leakage. Evidence: RUN-001_D-AUDIT-05_07_detail-export.json
- [x] D-AUDIT-08: pass - Filtering to a non-existent text shows 0 entries and the no audit entries row. Evidence: RUN-001_D-AUDIT-08_empty.png, RUN-001_D-AUDIT-08_empty_snapshot.txt, RUN-001_D-AUDIT-08_10_empty-skipped-redaction.json
- [x] D-AUDIT-09: pass - Malformed rotated audit line is reported in skippedFiles with invalid audit entry reason while valid rotated entry remains queryable. Evidence: RUN-001_D-AUDIT-08_10_empty-skipped-redaction.json
- [x] D-AUDIT-10: pass - Audit list/detail/export redacts seeded secret-like values; visible body and export secret scans were negative. Evidence: RUN-001_D-AUDIT-08_10_empty-skipped-redaction.json
- [x] D-PLAY-01: pass - Command list renders valid, schema, list, get, filter, search, triage, research, verify, and write. Evidence: RUN-001_D-PLAY-01_02.png, RUN-001_D-PLAY-01_02_snapshot.txt
- [x] D-PLAY-02: pass - Selecting each command updates selected command, safety tag, parameter title/form, and preview. Evidence: RUN-001_D-PLAY-03_08_previews.json, RUN-001_D-PLAY-01_02_snapshot.txt
- [x] D-PLAY-03: pass - Valid workflow selection previews lark-bitable valid --workflow dashboard --json and POST /api/playground/run returns a partial run with expected missing-auth/source remediation. Evidence: RUN-001_D-PLAY-03_08_previews.json, RUN-001_D-PLAY-11_15_results.json
- [!] D-PLAY-04: fail - List limit preview works, but schema limit preview uses unsupported --limit and the run fails with Nonexistent flag: --limit; CLI expects --sample-limit. Evidence: RUN-001_D-PLAY-03_08_previews.json
- [x] D-PLAY-05: pass - Get and verify record identifiers are shaped positionally in the preview: get recA4Get and verify recA4Verify. Evidence: RUN-001_D-PLAY-03_08_previews.json
- [x] D-PLAY-06: pass - Filter parameters update preview with --field, --contains, --owner, and --limit. Evidence: RUN-001_D-PLAY-03_08_previews.json
- [x] D-PLAY-07: pass - Empty required search input produces a clear Search query must not be empty issue and the page remains inspectable. Evidence: RUN-001_D-PLAY-03_08_previews.json
- [!] D-PLAY-08: fail - Research preview supports --out but the form exposes unsupported --name and --record-id parameters that would create invalid payloads if filled. Evidence: RUN-001_D-PLAY-03_08_previews.json
- [!] D-PLAY-09: fail - Write without confirmation does not produce a valid preview-first operation because the UI omits required --op and uses field/value shaping inconsistent with CLI field assignment requirements. Evidence: RUN-001_D-PLAY-09_10_write-guard.json
- [!] D-PLAY-10: fail - Write with explicit confirmation is marked as write/dangerous, but confirm preview drops the previously entered record/field values and still fails with missing required --op. Evidence: RUN-001_D-PLAY-09_10_write-guard.json
- [x] D-PLAY-11: pass - Structured, Human, and Audit tabs remain inspectable for the same failed write run; Audit tab shows an empty object when no auditEntryId exists. Evidence: RUN-001_D-PLAY-11_15_results.json
- [x] D-PLAY-12: pass - Run History keeps the five most recent runs and Clear History changes it to no runs yet. Evidence: RUN-001_D-PLAY-11_15_results.json
- [x] D-PLAY-13: pass - Copy CLI copies the visible preview command exactly. Evidence: RUN-001_D-PLAY-11_15_results.json
- [!] D-PLAY-14: fail - Failed runs preserve status and issues, but route-level 500 envelopes do not render next safe actions for schema/search/write failures. Evidence: RUN-001_D-PLAY-11_15_results.json, RUN-001_A4-ops_network-summary.json
- [x] D-PLAY-15: pass - A completed/partial valid playground run is traceable from Audit via /api/audit?command=valid&limit=20. Evidence: RUN-001_D-PLAY-11_15_results.json

## Product Defects

### A4-AUDIT-FILTER-ISSUECODE (medium)

- Title: Audit issue-code filter cannot match seeded issue codes because audit summaries redact issue.code before filter matching; issueCode=a4-write-blocked returns 0 entries instead of the write error entry.
- Reproduction: Use Audit Logs issue code field with a known issue code such as a4-write-blocked and apply.
- Expected: Matching audit entries are listed and count updates.
- Actual: 0 entries are shown; API returns an empty entries array.
- Evidence: RUN-001_D-AUDIT-03_04_filters.json
- Developer follow-up: align dashboard UI/query behavior with the CLI/API contract and add regression coverage for this scenario.

### A4-AUDIT-FILTER-FROM (medium)

- Title: Audit from-time filter input is visible but has no name, so applying it sends no from query and count does not change.
- Reproduction: Enter 2026-05-14T07:05:00.000Z in from ISO time and apply.
- Expected: Older schema/search/rotated entries before the timestamp are excluded.
- Actual: Query string is empty and all entries remain visible.
- Evidence: RUN-001_D-AUDIT-03_04_filters.json
- Developer follow-up: align dashboard UI/query behavior with the CLI/API contract and add regression coverage for this scenario.

### A4-AUDIT-ROW-SELECTION (high)

- Title: Audit row clicks fetch the requested detail but UI selection/detail stay on the first row.
- Reproduction: Click the write row in the Audit entries table.
- Expected: The write row is selected and detail title/content changes to a4-audit-newest-error.
- Actual: Network GET /api/audit/a4-audit-newest-error returns 200, but first dashboard row remains selected and detail title remains the first row.
- Evidence: RUN-001_D-AUDIT-05_07_detail-export.json, RUN-001_D-AUDIT-05_07_detail-export.png
- Developer follow-up: align dashboard UI/query behavior with the CLI/API contract and add regression coverage for this scenario.

### A4-AUDIT-EMPTY-STALE-DETAIL (low)

- Title: Audit detail card remains stale after filters return an empty result set.
- Reproduction: Apply a text filter with no matching audit entries.
- Expected: Detail card clears or shows an empty detail state.
- Actual: Entries show no audit entries, but detail title remains a previous id.
- Evidence: RUN-001_D-AUDIT-08_10_empty-skipped-redaction.json
- Developer follow-up: align dashboard UI/query behavior with the CLI/API contract and add regression coverage for this scenario.

### A4-PLAY-SCHEMA-LIMIT (high)

- Title: Playground schema command exposes --limit even though schema CLI supports --sample-limit, causing schema runs to fail.
- Reproduction: Select schema, set limit 3, click run.
- Expected: Run succeeds or preview uses lark-bitable schema --sample-limit 3 --json.
- Actual: Preview uses --limit 3 and POST /api/playground/run fails with Nonexistent flag: --limit.
- Evidence: RUN-001_D-PLAY-03_08_previews.json
- Developer follow-up: align dashboard UI/query behavior with the CLI/API contract and add regression coverage for this scenario.

### A4-PLAY-RESEARCH-UNSUPPORTED-PARAMS (medium)

- Title: Playground research form exposes unsupported --name and --record-id parameters.
- Reproduction: Select research and inspect/fill parameters.
- Expected: Only supported research parameters are shown, such as --out/evidence.
- Actual: Form includes --name and --record-id, which ResearchCommand does not support.
- Evidence: RUN-001_D-PLAY-03_08_previews.json
- Developer follow-up: align dashboard UI/query behavior with the CLI/API contract and add regression coverage for this scenario.

### A4-PLAY-WRITE-CONTRACT (high)

- Title: Playground write command is not aligned with WriteCommand contract; it omits required --op and uses value/targetStatus-style shaping instead of field name=value or fields-json.
- Reproduction: Select write, enter record/field/value or confirm, click run.
- Expected: Preview-first write is valid without commit, and confirm preserves reviewed operation details.
- Actual: Runs fail with Missing required flag op; confirm preview can collapse to lark-bitable write --confirm --json.
- Evidence: RUN-001_D-PLAY-09_10_write-guard.json
- Developer follow-up: align dashboard UI/query behavior with the CLI/API contract and add regression coverage for this scenario.

### A4-PLAY-FAILED-NEXT-ACTIONS (medium)

- Title: Failed playground route-level errors preserve status/issues but do not display next safe actions.
- Reproduction: Trigger schema/search/write failures in Playground.
- Expected: Failure output includes status, issues, evidence when present, and next safe actions/remediation.
- Actual: Output shows issues/remediation only; no nextSafeActions are rendered for 500 envelopes.
- Evidence: RUN-001_D-PLAY-11_15_results.json
- Developer follow-up: align dashboard UI/query behavior with the CLI/API contract and add regression coverage for this scenario.

## Blockers

None. Live Lark credentials/source are absent in this lane, but A4 scenarios were validated against seeded local audit state and local Playground partial/error behavior as planned.

## Notes

- Sidebar binding card still displays port 48731 while this lane is bound to 48771. This is visible in A4 screenshots but is shell/status ownership rather than an A4 Audit/Playground scenario failure.
- DevTools console recorded accessibility issues for unlabeled form fields and four 500 resource errors from failed Playground runs. See RUN-001_A4-ops_console-summary.json.
