# RUN-001 A5 Research & Source Table

## Ownership

- Agent: A5
- Lane: A5-data
- Owner: Research & Source Table
- Artifact directory: `/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/specs/005-dashboard-e2e-validation/qa/artifacts/agents/A5-data`

## Dashboard Startup

- Status: started and stopped after validation
- Requested port: `48781`
- Dashboard origin used for browser validation: `http://127.0.0.1:48781`
- Config cwd: `/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A5-data/config`
- Auth path: `/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A5-data/auth.json`
- Audit path: `/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A5-data/audit.json`
- Research dir: `/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A5-data/research`
- Startup/seed evidence: `RUN-001_D-RESEARCH_seed.txt`

## Browser Control Status

Isolated browser control was available and used.

- Browser MCP namespace: `mcp__chrome_devtools_isolated__`
- Isolated context: `A5-data-RUN-001`
- Initial URL: `http://127.0.0.1:48781/#research`
- No shared `mcp__chrome_devtools__`, Playwright, Puppeteer, custom CDP browser, or fallback browser was used.

## Seed State

- Seeded two valid local research reports in the A5 research dir only.
- Seeded one malformed JSON report in the A5 research dir to exercise invalid-report handling.
- `/api/research` returned two valid reports and one skipped malformed report.
- `/api/status`, `/api/table/records`, and `/api/table/schema` reported missing Lark auth and missing source configuration for A5 state.

## Summary Counts

- Pass: 13
- Fail: 4
- Blocked: 7
- Total A5 scenarios: 24

## Scenario Statuses

- [x] D-RESEARCH-01: pass - Research page rendered list, search, count, reader, copy controls, and load controls in isolated browser. Evidence: `RUN-001_D-RESEARCH-01_03.png`, `RUN-001_D-RESEARCH-01_03_snapshot.txt`, `RUN-001_D-RESEARCH-01_03.json`.
- [x] D-RESEARCH-02: fail - Empty research directory list rendered `0 reports` and `no research reports`, but the reader retained stale `source-copy-boundary` detail from the previous selected report. Evidence: `RUN-001_D-RESEARCH-02_empty-stale-detail.png`, `RUN-001_D-RESEARCH-01_03.json`.
- [x] D-RESEARCH-03: pass - Valid report list rendered report names, selected record ids, created times, canonical paths, and visible snippets/list text. Evidence: `RUN-001_D-RESEARCH-01_03.png`, `RUN-001_D-RESEARCH-01_03.json`.
- [x] D-RESEARCH-04: fail - Clicking the visible `dashboard-layout-regression` report did not switch selected style or reader detail; the page remained on `source-copy-boundary`. Evidence: `RUN-001_D-RESEARCH-04_selection-failure.png`, `RUN-001_D-RESEARCH-04_selection-failure_snapshot.txt`, `RUN-001_D-RESEARCH-04_07_detail-search.json`.
- [x] D-RESEARCH-05: pass - The initial selected reader preserved Observed Facts, Assumptions, Analysis, Likely Causes, Recommended Fixes, Risks, Next Actions, and Evidence sections. Evidence: `RUN-001_D-RESEARCH-01_03_snapshot.txt`, `RUN-001_D-RESEARCH-04_07_detail-search.json`.
- [x] D-RESEARCH-06: pass - Searching `Copy Boundary Beacon` reduced the browser-visible report list to one matching report. Evidence: `RUN-001_D-RESEARCH-04_07_detail-search.json`.
- [x] D-RESEARCH-07: pass - Clicking Load Reports preserved the intentional `Copy Boundary Beacon` filter and kept the one matching result. Evidence: `RUN-001_D-RESEARCH-04_07_detail-search.json`.
- [x] D-RESEARCH-08: pass - Copy Path wrote the selected report canonical path and did not write `undefined`. Evidence: `RUN-001_D-RESEARCH-08_12_copy-malformed-i18n.json`.
- [x] D-RESEARCH-09: pass - Copy Content wrote readable rendered report text containing `# source-copy-boundary`, `rec_A5_COPY_002`, and `Copy Boundary Beacon`. Evidence: `RUN-001_D-RESEARCH-08_12_copy-malformed-i18n.json`.
- [x] D-RESEARCH-10: fail - Copy Dir wrote hard-coded `~/.lark-bitable/research` instead of the configured A5 lane research directory. Evidence: `RUN-001_D-RESEARCH-08_12_copy-malformed-i18n.json`.
- [x] D-RESEARCH-11: fail - Malformed report was skipped by API and valid reports stayed visible, but the browser did not mark the malformed/unavailable report in the UI; it was hidden from the list. Evidence: `RUN-001_D-RESEARCH-08_12_copy-malformed-i18n.json`.
- [x] D-RESEARCH-12: pass - Switching dashboard chrome to EN did not translate source-owned report content such as `Copy Boundary Beacon` or `rec_A5_COPY_002`. Evidence: `RUN-001_D-RESEARCH-08_12_i18n-copy.png`, `RUN-001_D-RESEARCH-08_12_copy-malformed-i18n.json`.
- [x] D-TABLE-01: pass - Source Table page rendered source banner, tabs, search/filter controls, records pane, and schema pane entry point. Evidence: `RUN-001_D-TABLE-01_03.png`, `RUN-001_D-TABLE-01_03_snapshot.txt`, `RUN-001_D-TABLE-01_03.json`.
- [x] D-TABLE-02: pass - Missing source/auth rendered non-broken empty states: source banner `missing`, Records `no records`, and Schema `no schema fields`. Evidence: `RUN-001_D-TABLE-01_03.json`.
- [x] D-TABLE-03: blocked - Ready source banner requires unavailable dependencies: `test-lark-auth-session` and `test-lark-bitable-source-url`. Evidence: `RUN-001_D-TABLE-01_03.json`.
- [x] D-TABLE-04: blocked - Record ids and field columns require unavailable dependencies: `test-lark-auth-session`, `test-lark-bitable-source-url`, and live `test-lark-records`. Evidence: `RUN-001_D-TABLE-04_06_records.json`.
- [x] D-TABLE-05: blocked - Search/apply over real records requires unavailable dependencies: `test-lark-auth-session`, `test-lark-bitable-source-url`, and live `test-lark-records`. Evidence: `RUN-001_D-TABLE-04_06_records.json`.
- [x] D-TABLE-06: blocked - Array, object, null, and long-cell rendering requires unavailable live records with complex values. Evidence: `RUN-001_D-TABLE-04_06_records.json`.
- [x] D-TABLE-07: pass - Schema tab toggled panes and selected state correctly in the missing-source state. Evidence: `RUN-001_D-TABLE-07_10_schema-export.json`.
- [x] D-TABLE-08: blocked - Schema rows with field names, sample counts, observed values, and pills require unavailable dependencies: `test-lark-auth-session`, `test-lark-bitable-source-url`, and `test-lark-schema-fields`. Evidence: `RUN-001_D-TABLE-07_10_schema-export.json`.
- [x] D-TABLE-09: pass - Refresh reloaded table data without changing the selected Schema tab. Evidence: `RUN-001_D-TABLE-07_10_schema-export.json`.
- [x] D-TABLE-10: pass - Export JSON copied the current records/schema response state in the missing-source scenario. Evidence: `RUN-001_D-TABLE-07_10_schema-export.json`.
- [x] D-TABLE-11: blocked - Wide/long table inspectability requires unavailable dependencies: `test-lark-auth-session`, `test-lark-bitable-source-url`, and `test-lark-records-with-wide-long-values`. Evidence: `RUN-001_D-TABLE-11_12_layout-i18n.json`.
- [x] D-TABLE-12: blocked - Source field/record no-translation behavior requires unavailable dependencies: `test-lark-auth-session`, `test-lark-bitable-source-url`, and `test-lark-source-values-for-language-boundary`. Evidence: `RUN-001_D-TABLE-11_12_layout-i18n.json`.

## Product Defects

- A5-DATA-DEFECT-001: Empty research reload leaves stale reader content. Repro: open Research with a selected report, remove/move all A5 research JSON files, click Load Reports. Expected reader empty state; actual list shows no reports while reader still displays stale `source-copy-boundary` content. Evidence: `RUN-001_D-RESEARCH-02_empty-stale-detail.png`.
- A5-DATA-DEFECT-002: Research report row click does not switch the selected reader/detail. Repro: clear search filter, click `dashboard-layout-regression`. Expected selected row and reader switch to `rec_A5_LAYOUT_001`; actual selected/detail remain `source-copy-boundary` / `rec_A5_COPY_002`. Evidence: `RUN-001_D-RESEARCH-04_selection-failure.png`.
- A5-DATA-DEFECT-003: Research Copy Dir ignores configured `--research-dir`. Repro: click Research page top Copy Path/dir action in A5 run. Expected A5 lane research path; actual clipboard write is `~/.lark-bitable/research`. Evidence: `RUN-001_D-RESEARCH-08_12_copy-malformed-i18n.json`.
- A5-DATA-DEFECT-004: Malformed research reports are skipped/hidden rather than marked unavailable in the browser UI. Repro: seed malformed JSON next to valid reports and load Research. Expected visible unavailable/skipped marker without hiding valid reports; actual only valid reports render. Evidence: `RUN-001_D-RESEARCH-08_12_copy-malformed-i18n.json`.

## Blockers

- `test-lark-auth-session`: unavailable for Source Table ready/live validation.
- `test-lark-bitable-source-url`: unavailable for Source Table ready/live validation.
- `test-lark-records`: unavailable for record id, field column, search/apply, wide/long, and complex cell checks.
- `test-lark-schema-fields`: unavailable for schema row field/sample/mapping checks.
- `test-lark-source-values-for-language-boundary`: unavailable for Source Table no-translation validation.

## Evidence

- `RUN-001_D-RESEARCH_seed.txt`: A5 startup, origin, isolated state paths, and seeded report files.
- `RUN-001_D-RESEARCH-01_03.png`: Research page browser screenshot with two valid reports.
- `RUN-001_D-RESEARCH-01_03_snapshot.txt`: Research page accessibility snapshot.
- `RUN-001_D-RESEARCH-01_03.json`: Research render, empty-state, valid-list, and API correlation evidence.
- `RUN-001_D-RESEARCH-02_empty-stale-detail.png`: Failed empty-state screenshot showing stale reader detail.
- `RUN-001_D-RESEARCH-04_selection-failure.png`: Failed selection screenshot.
- `RUN-001_D-RESEARCH-04_selection-failure_snapshot.txt`: Failed selection accessibility snapshot.
- `RUN-001_D-RESEARCH-04_07_detail-search.json`: Selection, section preservation, search, reload, and API correlation evidence.
- `RUN-001_D-RESEARCH-08_12_copy-malformed-i18n.json`: Copy, malformed handling, and language-boundary evidence.
- `RUN-001_D-RESEARCH-08_12_i18n-copy.png`: EN language switch screenshot with source report content preserved.
- `RUN-001_D-TABLE-01_03.png`: Source Table missing-source browser screenshot.
- `RUN-001_D-TABLE-01_03_snapshot.txt`: Source Table accessibility snapshot.
- `RUN-001_D-TABLE-01_03.json`: Source Table render/missing/ready-blocked evidence.
- `RUN-001_D-TABLE-04_06_records.json`: Live records blocker evidence.
- `RUN-001_D-TABLE-07_10_schema-export.json`: Schema tab, refresh, export, and live schema blocker evidence.
- `RUN-001_D-TABLE-11_12_layout-i18n.json`: Wide/long and source-value language blocker evidence.
- `RUN-001_A5-data_browser-console-network.json`: Browser console/network summary for A5.

## Out-of-Lane Observation

The shell status card still displayed `starting` and port `48731` while the actual A5 origin was `http://127.0.0.1:48781`. This was observed on A5 pages but is not counted in A5 Research/Source Table scenario totals because global shell ownership belongs to A1.
