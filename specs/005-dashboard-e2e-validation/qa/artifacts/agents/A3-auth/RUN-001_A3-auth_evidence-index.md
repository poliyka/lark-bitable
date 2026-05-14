# RUN-001 A3 Auth Evidence Index

## Summary

- Run: RUN-001
- Lane: A3-auth
- Dashboard origin: `http://127.0.0.1:48761`
- Browser evidence method: `mcp__chrome_devtools_isolated__`
- Scenario coverage: D-AUTH-01 through D-AUTH-10
- Final counts: 9 pass, 0 fail, 1 blocked
- Redaction status: no sensitive token, refresh token, app secret, bearer header, or authorization-code value stored in A3 evidence; authorization URL `state` value is redacted as `[REDACTED_STATE]`.

## Evidence Files

- `RUN-001_A3-auth_startup.json`: dashboard startup, requested/actual port, state paths, local-only/no-dashboard-login flags, isolated MCP browser identity.
- `RUN-001_D-AUTH-01_current-auth.png`: full-page screenshot of the Lark Auth page with Current Auth missing state.
- `RUN-001_D-AUTH-01_snapshot.txt`: accessibility snapshot of the Lark Auth page and Current Auth/Login Flow controls.
- `RUN-001_D-AUTH-02_missing.json`: DOM and `/api/status` evidence for missing auth status and remediation.
- `RUN-001_D-AUTH-03_scopes.json`: requested scopes field, sanitized login-start request, and sanitized authorization URL scope evidence.
- `RUN-001_D-AUTH-04_login-waiting.png`: screenshot of waiting login flow progress after start login.
- `RUN-001_D-AUTH-05_authorization-url.json`: sanitized authorization URL exposure evidence and intercepted `window.open` metadata.
- `RUN-001_D-AUTH-06_placeholder-guard.json`: evidence that placeholder text was not opened as a URL.
- `RUN-001_D-AUTH-07_ready-auth.json`: blocked record for live ready-auth verification.
- `RUN-001_D-AUTH-08_failed-flow.json`: failed/unknown flow remediation evidence and auth-state non-corruption check.
- `RUN-001_D-AUTH-09_logout.json`: logout result, Current Auth missing state, and Overview missing/partial state evidence.
- `RUN-001_D-AUTH-10_secret-scan.json`: visible UI, authorization URL, config projection, and localStorage redaction scan.
- `RUN-001_A3-auth_console-summary.json`: isolated browser console summary.
- `RUN-001_A3-auth_network-summary.json`: isolated browser network summary with secret-like values and flow IDs redacted.
- `RUN-001_A3-auth.md`: lane status shard with scenario statuses, findings, blockers, and evidence references.

## Scenario Traceability

- D-AUTH-01: pass; evidence `RUN-001_D-AUTH-01_current-auth.png`, `RUN-001_D-AUTH-01_snapshot.txt`.
- D-AUTH-02: pass; evidence `RUN-001_D-AUTH-02_missing.json`.
- D-AUTH-03: pass; evidence `RUN-001_D-AUTH-03_scopes.json`, `RUN-001_A3-auth_network-summary.json`.
- D-AUTH-04: pass; evidence `RUN-001_D-AUTH-04_login-waiting.png`, `RUN-001_D-AUTH-03_scopes.json`.
- D-AUTH-05: pass; evidence `RUN-001_D-AUTH-05_authorization-url.json`.
- D-AUTH-06: pass; evidence `RUN-001_D-AUTH-06_placeholder-guard.json`.
- D-AUTH-07: blocked; evidence `RUN-001_D-AUTH-07_ready-auth.json`.
- D-AUTH-08: pass; evidence `RUN-001_D-AUTH-08_failed-flow.json`.
- D-AUTH-09: pass; evidence `RUN-001_D-AUTH-09_logout.json`.
- D-AUTH-10: pass; evidence `RUN-001_D-AUTH-10_secret-scan.json`.

## Blocked Dependencies

- `LIVE_LARK_TEST_ACCOUNT`
- `LIVE_LARK_TEST_APP`
- `LIVE_LARK_TEST_BITABLE`
- `LARK_APP_SECRET_FOR_TEST_APP`

## Notes

- The generated authorization URL was observed in the browser, but the evidence shard redacts the `state` parameter value to avoid storing secret-like flow identifiers.
- `mcp__chrome_devtools_isolated__` was available and used for all browser-visible validation.
- The dashboard process was stopped after evidence capture.
