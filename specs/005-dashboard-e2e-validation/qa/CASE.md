# Dashboard E2E QA Case

## Feature Reference

- Feature: 005-dashboard-e2e-validation
- Spec: specs/005-dashboard-e2e-validation/spec.md
- Plan: specs/005-dashboard-e2e-validation/plan.md
- Tasks: specs/005-dashboard-e2e-validation/tasks.md
- Coverage Contract: specs/005-dashboard-e2e-validation/contracts/dashboard-e2e-coverage-contract.md
- Browser Evidence Contract: specs/005-dashboard-e2e-validation/contracts/browser-evidence-contract.md
- QA Report Contract: specs/005-dashboard-e2e-validation/contracts/qa-report-contract.md

## Target

- Repository worktree: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run
- Branch: 005-dashboard-e2e-validation-run
- Commit: b684c3b
- Created At: 2026-05-14T07:45:03.027Z

## Objective

Validate the local lark-bitable dashboard end to end with browser-visible evidence for shell, configuration, Lark auth, audit logs, playground, research reports, source table, UI states, language switching, privacy, and error states.

## In Scope

- Seven primary dashboard pages: Overview, Configuration, Lark Login, Audit Logs, Playground, Research Reports, Source Table.
- Global navigation, keyboard shortcuts, command palette, refresh, copy actions, local-only/no-dashboard-login behavior.
- Focused regressions: field mapping dropdowns, field sync, Configuration scroll-position stability.
- Desktop and mobile UI evidence.
- Secret redaction and browser-only language preference.

## Out of Scope

- Hosted dashboard login or multi-user dashboard accounts.
- Real production Lark data mutation.
- Database persistence for dashboard state.

## Required Live Dependencies

- Test Lark account: not provided at run start.
- Test Lark app credentials: not provided at run start.
- Test Bitable with representative fields and records: not provided at run start.

Live Lark-dependent scenarios must be marked blocked unless these dependencies are supplied during the run.

## Evidence Storage

All run evidence is stored under /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/specs/005-dashboard-e2e-validation/qa.

## Pass Fail Blocked Policy

- Pass requires observed expected behavior and evidence.
- Fail requires defect finding with reproduction, expected, actual, evidence, severity, and follow-up.
- Blocked requires named missing dependency or tooling blocker plus impact.
- Final reports must not contain not-run scenarios.
