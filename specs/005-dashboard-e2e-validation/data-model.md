# Data Model: Dashboard Comprehensive E2E and UI Validation

## Validation Run

Represents one complete dashboard E2E/UI validation attempt.

Fields:

- `runId`: Stable run identifier, for example `RUN-001`.
- `feature`: Feature identifier, expected `005-dashboard-e2e-validation`.
- `dashboardOrigin`: Local dashboard URL used for the run.
- `branch`: Git branch under validation.
- `startedAt`: ISO timestamp when validation began.
- `finishedAt`: ISO timestamp when validation ended, if completed.
- `environment`: Node version, package manager version, browser identity, viewport set, and operating system summary.
- `stateIsolation`: Paths used for config, auth, audit, and research during validation.
- `liveLarkAvailable`: Boolean indicating whether test Lark credentials and test Bitable were available.
- `statuses`: Counts for passed, failed, blocked, and not-run scenarios.
- `artifacts`: Evidence artifacts captured during the run.
- `findings`: Defect findings discovered during the run.
- `blockedChecks`: Blocked checks with reasons.

Validation rules:

- A run cannot be marked complete unless every required scenario is passed, failed, or blocked.
- A run cannot mark live Lark scenarios passed unless `liveLarkAvailable` is true and evidence exists.
- A run must include console evidence and at least one screenshot for each primary dashboard page.

## Validation Scenario

Represents one expected dashboard behavior to verify.

Fields:

- `scenarioId`: Stable identifier, for example `D-CONFIG-09`.
- `page`: Dashboard area such as shell, overview, config, auth, audit, playground, research, table, language, security, or responsive.
- `priority`: `P1`, `P2`, or `P3`.
- `description`: User-observable behavior being checked.
- `preconditions`: Required dashboard state, browser state, data seed, or live dependency.
- `actions`: Ordered user actions to perform.
- `expectedResults`: Observable outcomes required to pass.
- `requiredEvidence`: Evidence artifact kinds needed for the scenario.
- `status`: `pass`, `fail`, `blocked`, or `not-run`.
- `evidenceIds`: References to captured evidence artifacts.
- `findingIds`: References to defect findings when failed.

Validation rules:

- Every scenario must have at least one required evidence kind.
- `pass` requires all expected results to be observed.
- `fail` requires a defect finding.
- `blocked` requires a concrete missing dependency or environment blocker.

## UI Element Coverage Item

Represents one visible element or interactive control that must be exercised.

Fields:

- `elementId`: Stable coverage identifier.
- `page`: Page where the element appears.
- `labelOrRole`: Visible label, semantic role, or selector description.
- `expectedState`: Initial visible state.
- `actions`: Actions to validate, such as click, focus, type, select, hover, copy, refresh, shortcut, or tab switch.
- `expectedOutcome`: Result after action.
- `sourceScenarioId`: Scenario that covers the element.

Validation rules:

- Every visible action-bearing element must be mapped to at least one scenario.
- Controls that mutate state must include before and after evidence.
- Controls that copy text must include the copied value or a clipboard stub observation.

## Evidence Artifact

Represents proof collected during validation.

Fields:

- `evidenceId`: Stable identifier, for example `EVID-001`.
- `kind`: Screenshot, accessibility snapshot, DOM observation, console log, network summary, copied value, command output, HTTP response, scroll measurement, localStorage observation, or source file citation.
- `pathOrReference`: File path, command reference, request reference, or inline observation reference.
- `capturedAt`: ISO timestamp.
- `scenarioIds`: Scenarios supported by the artifact.
- `summary`: Short factual summary of what the artifact proves.
- `redactionStatus`: `not-needed`, `redacted`, or `contains-sensitive-data-failure`.

Validation rules:

- Evidence must not contain unredacted secrets unless the associated scenario fails for secret leakage.
- Screenshots must include viewport and page name in their artifact metadata.
- Network evidence must include method, path, response status, and payload summary without secrets.

## Defect Finding

Represents a failed dashboard behavior.

Fields:

- `findingId`: Stable identifier, for example `FIND-001`.
- `severity`: `critical`, `high`, `medium`, or `low`.
- `scenarioId`: Scenario that failed.
- `page`: Affected dashboard page or shell area.
- `title`: Short defect title.
- `reproductionSteps`: Ordered steps another engineer can repeat.
- `expected`: Expected behavior.
- `actual`: Observed behavior.
- `evidenceIds`: Evidence proving the failure.
- `developerFollowUp`: Concrete follow-up needed.
- `status`: `open`, `retested`, or `closed`.

Validation rules:

- A finding must cite evidence.
- A finding must separate expected and actual behavior.
- A finding must include enough detail to reproduce from a fresh dashboard run.

## Blocked Check

Represents a scenario that could not be completed.

Fields:

- `scenarioId`: Blocked scenario.
- `reason`: Missing dependency or environment limitation.
- `requiredToUnblock`: Concrete requirement needed to run the scenario.
- `impact`: What coverage remains unverified.
- `fallbackEvidence`: Any partial evidence collected before blocking.

Validation rules:

- Blocked checks cannot be counted as passed.
- Live Lark checks blocked by missing credentials must name the missing account, app, or test Bitable dependency.
- Browser-tooling failures must identify whether the dashboard itself was unreachable or only the automation tool was unavailable.

## State Transitions

Validation Scenario:

```text
not-run -> pass
not-run -> fail
not-run -> blocked
blocked -> not-run
fail -> pass
pass -> fail
```

Validation Run:

```text
draft -> running -> completed
draft -> running -> blocked
draft -> running -> failed
```

Defect Finding:

```text
open -> retested -> closed
open -> closed
```
