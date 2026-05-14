# Contract: QA Report Artifacts

Actual validation evidence should be recorded under the project-local feature QA
area:

```text
specs/005-dashboard-e2e-validation/qa/
├── CASE.md
├── RUN-001.md
├── REPORT-001.md
└── artifacts/
```

## CASE.md Contract

`CASE.md` defines the QA task scope and stable references.

Required sections:

- Title and feature reference.
- Target dashboard branch or commit.
- Validation objective.
- In-scope pages and scenarios.
- Out-of-scope items.
- Required live dependencies.
- Evidence storage location.
- Pass/fail/blocked policy.

## RUN-NN.md Contract

`RUN-NN.md` records one validation attempt.

Required sections:

- Run metadata: run id, date, validator, branch, dashboard origin, browser, Node version, package manager, operating system.
- Isolated state paths: config, auth, audit, research, screenshots, artifacts.
- Preflight commands and results.
- Scenario execution log grouped by shell, Overview, Configuration, Auth, Audit, Playground, Research, Table, language/privacy, error/responsive.
- Evidence artifact list.
- Blocked checks with reasons.
- Defect findings discovered in this run.
- Console and network summary.
- Final run status.

## REPORT-NN.md Contract

`REPORT-NN.md` is the conclusion for one or more runs.

Required sections:

- Summary status: pass, fail, or blocked.
- Coverage summary: total scenarios, passed, failed, blocked, not run.
- High-severity findings first.
- Blocked scenarios and unblock requirements.
- Evidence index.
- Observed facts.
- Assumptions.
- Risks.
- Developer follow-up.
- Retest recommendation.

## Defect Finding Format

Each defect finding must include:

- Finding id.
- Severity.
- Scenario id.
- Page or control.
- Title.
- Reproduction steps.
- Expected behavior.
- Actual behavior.
- Evidence artifacts.
- Developer follow-up.

## Completion Rules

- A final report cannot claim pass while any P1 scenario is failed or not run.
- A final report can be blocked when live Lark dependencies or browser control are unavailable, but it must still report completed local checks.
- A final report cannot hide failed UI checks behind API-level success.
- A final report must explicitly call out whether the known field mapping dropdown/sync and scroll-position regression checks passed, failed, or were blocked.
