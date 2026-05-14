# RUN-001 A2 Evidence Index

## Startup And Browser Context

- Evidence ID: `A2-E001`
- Scenario IDs: `D-CONFIG-01..15`
- Kind: command/browser-context
- Paths: `RUN-001_A2-config_startup.txt`, `RUN-001_A2-config_browser-context.json`
- Redaction status: redacted
- Summary: Dashboard started on `http://127.0.0.1:48751` using the A2 isolated state paths and isolated Chrome DevTools MCP.

## Configuration Render

- Evidence ID: `A2-E002`
- Scenario IDs: `D-CONFIG-01`
- Kind: screenshot/accessibility/DOM
- Paths: `RUN-001_D-CONFIG-01_desktop.png`, `RUN-001_D-CONFIG-01_snapshot.txt`, `RUN-001_D-CONFIG-01_dom.json`
- Redaction status: redacted
- Summary: Configuration page rendered Source, Lark App Credentials, Field Mappings, output, reset, save, and field discovery controls.

## Reset And Select Controls

- Evidence ID: `A2-E003`
- Scenario IDs: `D-CONFIG-02`, `D-CONFIG-06`
- Kind: DOM/network
- Paths: `RUN-001_D-CONFIG-02_reset.json`, `RUN-001_D-CONFIG-06_selects.json`
- Redaction status: redacted
- Summary: Reset restored the server draft on `#config`; workflow mode and Lark domain are native selects with expected options.

## Save And Redaction

- Evidence ID: `A2-E004`
- Scenario IDs: `D-CONFIG-03`, `D-CONFIG-04`, `D-CONFIG-13`, `D-CONFIG-15`
- Kind: network/DOM
- Paths: `RUN-001_D-CONFIG-03_save-payload.json`, `RUN-001_D-CONFIG-04_redaction.json`, `RUN-001_D-CONFIG-13_scopes.json`, `RUN-001_D-CONFIG-15_owner-status.json`
- Redaction status: redacted
- Summary: Save submitted visible values, output redacted app secret state, scopes were tokenized into array values, and owner/status values matched visible output.

## Invalid Configuration Handling

- Evidence ID: `A2-E005`
- Scenario IDs: `D-CONFIG-05`, `D-CONFIG-14`
- Kind: network/DOM
- Paths: `RUN-001_D-CONFIG-05_invalid-source.json`, `RUN-001_D-CONFIG-14_callback-port.json`
- Redaction status: redacted
- Summary: Invalid source URL and callback port returned visible errors; invalid source URL failed the input-preservation expectation.

## Scroll And Routing Stability

- Evidence ID: `A2-E006`
- Scenario IDs: `D-CONFIG-07`, `D-CONFIG-08`
- Kind: DOM scroll/focus
- Paths: `RUN-001_D-CONFIG-07_statusField-scroll.json`, `RUN-001_D-CONFIG-07_priorityField-scroll.json`, `RUN-001_D-CONFIG-07_titleField-scroll.json`, `RUN-001_D-CONFIG-07_ownerField-scroll.json`, `RUN-001_D-CONFIG-08_focus-routing.json`
- Redaction status: no-sensitive-data
- Summary: Mapping-field focus/change checks retained nonzero scroll and stable route; input focus preserved hash, active page, and breadcrumb.

## Mapping Controls And Field Sync

- Evidence ID: `A2-E007`
- Scenario IDs: `D-CONFIG-09`, `D-CONFIG-10`, `D-CONFIG-12`
- Kind: DOM/network
- Paths: `RUN-001_D-CONFIG-09_mapping-controls.json`, `RUN-001_D-CONFIG-10_field-sync.json`, `RUN-001_D-CONFIG-12_blocked-sync.json`
- Redaction status: redacted
- Summary: Mapping controls use a shared datalist with zero options; live field sync is blocked by missing Lark auth; blocked schema response is not visibly surfaced in Configuration output.

## Mapping Save To Overview

- Evidence ID: `A2-E008`
- Scenario IDs: `D-CONFIG-11`
- Kind: DOM
- Path: `RUN-001_D-CONFIG-11_mapping-save-overview.json`
- Redaction status: no-sensitive-data
- Summary: Saved mapping values appeared in Overview Field Mappings.

## Session Summaries

- Evidence ID: `A2-E009`
- Scenario IDs: `D-CONFIG-01..15`
- Kind: console/network/runner-summary
- Paths: `RUN-001_A2-config_console-summary.json`, `RUN-001_A2-config_network-summary.json`, `RUN-001_A2-config_runner-summary.json`
- Redaction status: redacted
- Summary: Console errors were limited to intentional invalid-save probes; network summary includes sanitized relevant requests and scenario counts.
