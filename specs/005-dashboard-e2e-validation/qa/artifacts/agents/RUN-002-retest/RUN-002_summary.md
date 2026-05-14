# RUN-002 Retest Summary

- Scope: targeted retest of previously suspected remaining dashboard defects only.
- Dashboard origin: `http://127.0.0.1:56882`
- Browser policy: `mcp__chrome_devtools_isolated__`
- Result: both targeted scenarios passed.

## Retested Items

- `A6-DEF-003` / `D-UI-02`: PASS
  Initial shell binding card rendered `ready`, `127.0.0.1`, and `56882` on first load. The stale `starting` / `48731` placeholder was not observed.

- `A2-CONFIG-DEFECT-003` / `D-CONFIG-12`: PASS
  Clicking `從 Base 重新探索` on Configuration without source/auth visibly rendered `schema-discovery`, `missing-source`, `missing-auth`, and both remediation messages. Output pane also switched to the blocked schema response instead of staying on stale config draft.

## Evidence

- JSON notes: `RUN-002_retest_notes.json`
- Screenshot: `RUN-002_config_blocked-sync.png`
- Browser snapshot evidence was captured during the isolated MCP session and summarized into the JSON notes.
