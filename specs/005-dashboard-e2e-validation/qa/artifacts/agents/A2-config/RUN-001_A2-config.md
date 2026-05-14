# RUN-001 A2 Configuration & Field Mapping

## Ownership

- Agent: A2
- Lane: A2-config
- Owner: Configuration & Field Mapping
- Artifact directory: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/specs/005-dashboard-e2e-validation/qa/artifacts/agents/A2-config
- Browser validation policy used: `mcp__chrome_devtools_isolated__` only

## Dashboard Startup

- Requested port: `48751`
- Actual origin: `http://127.0.0.1:48751`
- Startup artifact: `RUN-001_A2-config_startup.txt`
- Browser context artifact: `RUN-001_A2-config_browser-context.json`
- State paths:
  - Config cwd: `.lark-bitable/dashboard-e2e/RUN-001/state/A2-config/config`
  - Auth path: `.lark-bitable/dashboard-e2e/RUN-001/state/A2-config/auth.json`
  - Audit path: `.lark-bitable/dashboard-e2e/RUN-001/state/A2-config/audit.json`
  - Research dir: `.lark-bitable/dashboard-e2e/RUN-001/state/A2-config/research`

## Scenario Statuses

- [x] D-CONFIG-01: pass - Configuration page renders Source, Lark App Credentials, Field Mappings, output, reset, save, and discovery controls.
- [x] D-CONFIG-02: pass - Reset reloads the server draft and keeps `#config` active.
- [x] D-CONFIG-03: pass - Save submits all visible configuration values via `POST /api/config`; secret payload is redacted in artifacts.
- [x] D-CONFIG-04: pass - Save output shows `larkAppSecretState: stored-redacted` and does not expose the submitted secret.
- [x] D-CONFIG-05: fail - Invalid source URL renders a recoverable error, but the form does not preserve the typed invalid source URL or source name.
- [x] D-CONFIG-06: pass - Workflow mode and Lark domain are native selectable controls with expected options.
- [x] D-CONFIG-07: pass - `statusField`, `priorityField`, `titleField`, and `ownerField` focus/change checks did not scroll to top.
- [x] D-CONFIG-08: pass - Focusing page inputs preserved hash, active page, and breadcrumb.
- [x] D-CONFIG-09: fail - Mapping controls expose combobox/list semantics, but the shared discovered-field datalist has zero options.
- [x] D-CONFIG-10: blocked - Missing Lark auth/test account prevents proving successful live field sync updates every mapping control.
- [x] D-CONFIG-11: pass - Changed mappings saved and synchronized to Overview.
- [x] D-CONFIG-12: fail - Field discovery endpoint reports blocked state, but Configuration UI does not visibly surface the blocked discovery result/remediation.
- [x] D-CONFIG-13: pass - Scopes input is tokenized into individual array values on save; duplicate values are retained.
- [x] D-CONFIG-14: pass - Invalid callback port returns a visible validation error mentioning `callbackPort` and keeps the route stable.
- [x] D-CONFIG-15: pass - Default owner and actionable status save behavior matches visible form/output values.

## Counts

- Pass: 11
- Fail: 3
- Blocked: 1
- Total: 15

## Findings

- `A2-CONFIG-DEFECT-001` (`D-CONFIG-05`, severity: medium): Invalid source URL save shows an error, but the Configuration form reverts `sourceUrl` and `sourceName` to the saved server draft instead of preserving the typed invalid values. Evidence: `RUN-001_D-CONFIG-05_invalid-source.json`.
- `A2-CONFIG-DEFECT-002` (`D-CONFIG-09`, severity: high): Field mapping controls are rendered as `input[list=schema-fields]`, but `datalist#schema-fields` has zero options, so users cannot select populated discovered fields. Evidence: `RUN-001_D-CONFIG-09_mapping-controls.json`.
- `A2-CONFIG-DEFECT-003` (`D-CONFIG-12`, severity: high): Clicking “從 Base 重新探索” calls `/api/table/schema` and receives a blocked `Lark auth is missing` response, but the Configuration output remains the config draft and does not visibly report the blocked field-discovery remediation. Evidence: `RUN-001_D-CONFIG-12_blocked-sync.json`.

## Blocked Checks

- `A2-CONFIG-BLOCKER-001` (`D-CONFIG-10`): Live field discovery success could not be verified because this lane has no Lark auth/test account. The observed `/api/table/schema` response was `partial` with `data.status: blocked`, `fields: []`, and `Lark auth is missing`.

## Evidence

- Startup and context: `RUN-001_A2-config_startup.txt`, `RUN-001_A2-config_browser-context.json`
- Page render: `RUN-001_D-CONFIG-01_desktop.png`, `RUN-001_D-CONFIG-01_snapshot.txt`, `RUN-001_D-CONFIG-01_dom.json`
- Reset/save/redaction/invalid controls: `RUN-001_D-CONFIG-02_reset.json`, `RUN-001_D-CONFIG-03_save-payload.json`, `RUN-001_D-CONFIG-04_redaction.json`, `RUN-001_D-CONFIG-05_invalid-source.json`, `RUN-001_D-CONFIG-06_selects.json`
- Scroll/focus routing: `RUN-001_D-CONFIG-07_statusField-scroll.json`, `RUN-001_D-CONFIG-07_priorityField-scroll.json`, `RUN-001_D-CONFIG-07_titleField-scroll.json`, `RUN-001_D-CONFIG-07_ownerField-scroll.json`, `RUN-001_D-CONFIG-08_focus-routing.json`
- Mapping/sync/save-overview: `RUN-001_D-CONFIG-09_mapping-controls.json`, `RUN-001_D-CONFIG-10_field-sync.json`, `RUN-001_D-CONFIG-11_mapping-save-overview.json`, `RUN-001_D-CONFIG-12_blocked-sync.json`
- Additional config validation: `RUN-001_D-CONFIG-13_scopes.json`, `RUN-001_D-CONFIG-14_callback-port.json`, `RUN-001_D-CONFIG-15_owner-status.json`
- Session summaries: `RUN-001_A2-config_console-summary.json`, `RUN-001_A2-config_network-summary.json`, `RUN-001_A2-config_runner-summary.json`
