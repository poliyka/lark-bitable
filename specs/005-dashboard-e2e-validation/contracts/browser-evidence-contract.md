# Contract: Browser Evidence

This contract defines required evidence artifacts for dashboard E2E/UI validation.

## Required Evidence Kinds

- Screenshot evidence: Captures visible UI state for a page, viewport, and scenario.
- Accessibility snapshot evidence: Captures browser-visible structure and interactive elements.
- DOM observation evidence: Captures computed or runtime state such as active page, selected tab, focused control, localStorage value, clipboard stub value, or scroll position.
- Console evidence: Captures browser errors and warnings for the validation window.
- Network evidence: Captures request method, request path, response status, and sanitized payload summary.
- Command evidence: Captures local dashboard startup, repository validation commands, or supporting CLI output.
- HTTP response evidence: Captures local endpoint behavior when browser evidence needs API correlation.

## Minimum Run Evidence

Every completed run must include:

- One startup command artifact with dashboard origin and isolated paths.
- One console summary artifact for the browser session.
- One network summary artifact for each primary page.
- One desktop screenshot for each of the seven primary pages.
- One mobile screenshot for Overview, Configuration, Playground, Research, and Source Table.
- One accessibility snapshot for each primary page.
- One scroll/focus before-and-after artifact for each Configuration field mapping control.
- One language storage artifact before and after switching language.
- One secret scan artifact covering visible text and rendered details.

## Artifact Naming

Use stable names that include run id, scenario id, viewport when relevant, and evidence kind.

Examples:

```text
RUN-001_D-CONFIG-07_desktop_scroll-before.json
RUN-001_D-CONFIG-07_desktop_scroll-after.json
RUN-001_D-UI-01_overview_desktop.png
RUN-001_D-AUDIT-05_snapshot.txt
RUN-001_console-summary.json
```

## Redaction Rules

- Evidence must not store access tokens, refresh tokens, app secrets, authorization codes, bearer headers, or secret-like values.
- If a secret is visible, keep the artifact only as a failure artifact and mark `redactionStatus` as `contains-sensitive-data-failure`.
- Network payload summaries must redact secret-like fields before they are written into a report.
- Screenshots that expose secrets fail the associated scenario and must be treated as sensitive evidence.

## Pass/Fail Evidence Requirements

`pass` requires:

- Evidence artifact proving the expected visible state or action result.
- No conflicting console or network evidence.
- If data comes from a live dependency, evidence that the dependency was available.

`fail` requires:

- Reproduction steps.
- Expected and actual observations.
- At least one evidence artifact showing the failure.
- Developer follow-up.

`blocked` requires:

- Named missing dependency or tool failure.
- Impact statement explaining which scenarios remain unverified.
- Any partial evidence collected before blocking.

## Browser Session Rules

- Validation must use a fresh or clearly identified browser profile for each run.
- Browser storage state must be recorded before language tests.
- If a browser automation tool cannot create or control a page, the run is blocked for browser-dependent checks and must not be downgraded to static-only validation.
- Viewports must include one desktop-size viewport and one mobile-width viewport.
