# RUN-001 Master Evidence Index

Merged by A0 from lane evidence shards. Redaction audit result: final tracked QA artifacts contain no raw A7/A4 fixture secret values after A0 redaction cleanup. Ignored lane-state fixtures may contain redacted placeholders only.

## A0 Foundation Evidence

- `RUN-001_preflight-format-check.txt`: repo format preflight passed.
- `RUN-001_preflight-build.txt`: repo build preflight passed.
- `RUN-001_preflight-test.txt`: repo test preflight passed.
- `RUN-001_dashboard-smoke-startup.txt`: smoke dashboard startup output.
- `RUN-001_api-status.json`: smoke `/api/status` summary.
- `RUN-001_console-initial.json`: initial console summary.
- `RUN-001_network-initial.json`: initial network summary.
- `agents/A0-orchestrator/RUN-001_A0_smoke-initial/desktop.png`: initial dashboard screenshot.
- `agents/A0-orchestrator/RUN-001_A0_smoke-initial/snapshot.txt`: initial accessibility snapshot.
- `agents/A0-orchestrator/RUN-001_A0_smoke-initial/browser.json`: browser identity and initial URL.

## Lane Evidence Shards

- A1 Shell & Overview: `agents/A1-shell/RUN-001_A1-shell_evidence-index.md`, status shard `agents/A1-shell/RUN-001_A1-shell.md`.
- A2 Configuration & Field Mapping: `agents/A2-config/RUN-001_A2-config_evidence-index.md`, status shard `agents/A2-config/RUN-001_A2-config.md`.
- A3 Lark Auth: `agents/A3-auth/RUN-001_A3-auth_evidence-index.md`, status shard `agents/A3-auth/RUN-001_A3-auth.md`.
- A4 Audit & Playground: `agents/A4-ops/RUN-001_A4-ops_evidence-index.md`, status shard `agents/A4-ops/RUN-001_A4-ops.md`.
- A5 Research & Source Table: `agents/A5-data/RUN-001_A5-data_evidence-index.md`, status shard `agents/A5-data/RUN-001_A5-data.md`.
- A6 UI & Responsive: `agents/A6-ui/RUN-001_A6-ui_evidence-index.md`, status shard `agents/A6-ui/RUN-001_A6-ui.md`.
- A7 I18n & Privacy: `agents/A7-i18n-security/RUN-001_A7-i18n-security_evidence-index.md`, status shard `agents/A7-i18n-security/RUN-001_A7-i18n-security.md`.
- A8 Error States: `agents/A8-errors/RUN-001_A8-errors_evidence-index.md`, status shard `agents/A8-errors/RUN-001_A8-errors.md`.

## High-Risk Evidence Pointers

- Field mapping dropdown options: `agents/A2-config/RUN-001_D-CONFIG-09_mapping-controls.json`, finding `A2-CONFIG-DEFECT-002`.
- Field mapping sync blocked UI: `agents/A2-config/RUN-001_D-CONFIG-10_field-sync.json` and `agents/A2-config/RUN-001_D-CONFIG-12_blocked-sync.json`, blocker `A2-CONFIG-BLOCKER-001`, finding `A2-CONFIG-DEFECT-003`.
- Configuration scroll-position regression: `agents/A2-config/RUN-001_D-CONFIG-07_statusField-scroll.json`, `RUN-001_D-CONFIG-07_priorityField-scroll.json`, `RUN-001_D-CONFIG-07_titleField-scroll.json`, `RUN-001_D-CONFIG-07_ownerField-scroll.json`.
- Audit filter/detail defects: `agents/A4-ops/RUN-001_D-AUDIT-03_04_filters.json`, `RUN-001_D-AUDIT-05_07_detail-export.json`, `RUN-001_D-AUDIT-08_10_empty-skipped-redaction.json`.
- Playground command contract defects: `agents/A4-ops/RUN-001_D-PLAY-03_08_previews.json`, `RUN-001_D-PLAY-09_10_write-guard.json`, `RUN-001_D-PLAY-11_15_results.json`.
- Research reader/copy/malformed defects: `agents/A5-data/RUN-001_D-RESEARCH-01_03.json`, `RUN-001_D-RESEARCH-04_07_detail-search.json`, `RUN-001_D-RESEARCH-08_12_copy-malformed-i18n.json`.
- UI focus/deep-link/stale binding defects: `agents/A6-ui/RUN-001_D-UI-03_states.json`, `RUN-001_D-UI-07_keyboard-focus.json`, mobile screenshots under `agents/A6-ui/RUN-001_D-UI-02_mobile-pages/`.
- I18n breadcrumb and app-secret DOM retention defects: `agents/A7-i18n-security/RUN-001_D-I18N-07_state-preservation.json`, `RUN-001_D-SEC-03_app-secret.json`.
- Error resilience defects: `agents/A8-errors/RUN-001_D-ERR-01_07_errors.json` and screenshots/snapshots under `agents/A8-errors/screenshots/` and `agents/A8-errors/snapshots/`.

## Final Console and Network Summaries

- `RUN-001_console-final.json`: final per-lane console summary aggregation.
- `RUN-001_network-final.json`: final per-lane network summary aggregation.

## Redaction Audit Notes

- A1, A2, A3, A4, A5, A6, A7, and A8 lane evidence indexes report `redacted`, `safe`, or `no-sensitive-data` statuses.
- A0 redacted raw A4/A7 fixture secret strings from final QA evidence/state copies before final reporting.
- `RUN-001_preflight-test.txt` includes literal help text placeholders such as `<secret>` and Lark permission names; these are not real credentials.
