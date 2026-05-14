# Research: Dashboard Comprehensive E2E and UI Validation

## Decision 1: Validate With a Real Browser, Not Static Asset Inspection

**Decision**: Treat real browser evidence as mandatory for completion. Static checks against HTML/CSS/JS and HTTP endpoints can support the run, but cannot replace browser screenshots, accessibility snapshots, focus/scroll observations, storage checks, console logs, and network request evidence.

**Rationale**: The feature explicitly targets UI behavior, every element, every action, visual states, responsive layout, language persistence, and the reported scroll-to-top defect. These cannot be proven from static source inspection alone.

**Alternatives considered**:

- Static asset tests only: rejected because they cannot prove focus, scroll, responsive rendering, clipboard, localStorage, popup behavior, or real browser layout.
- HTTP contract tests only: rejected because they verify service data but not UI state or visual behavior.
- Fully manual visual inspection only: rejected because it would produce inconsistent and weak evidence unless structured by scenario IDs and required artifacts.

## Decision 2: Use Existing Dashboard Command With Isolated State

**Decision**: Launch the existing dashboard command with isolated temporary paths for config, auth, audit, and research data during validation.

**Rationale**: The dashboard reads and writes local CLI state. Isolating all paths prevents test runs from modifying the user's real `~/.lark-bitable` files while still exercising realistic dashboard behavior.

**Alternatives considered**:

- Use the user's real dashboard state: rejected because it risks destructive or privacy-sensitive validation.
- Mock every backend response in the browser: rejected because it would not validate the current local dashboard integration.
- Validate only built assets without starting the service: rejected because it bypasses startup, binding, route, and live action behavior.

## Decision 3: Treat Live Lark Dependencies as Pass or Blocked, Never Implied

**Decision**: Live Lark-dependent scenarios require a test Lark account and test Bitable to pass. If those dependencies are unavailable, affected checks are marked blocked with the missing dependency named.

**Rationale**: The dashboard supports live Lark login, field discovery, source schema, and records. Claiming those paths pass without credentials would violate evidence and unsupported-claim rules.

**Alternatives considered**:

- Skip live checks silently: rejected because missing coverage would be hidden.
- Mark live checks passed based on unit or HTTP tests: rejected because those do not prove real auth or source-table behavior.
- Require live credentials for any validation at all: rejected because no-auth, empty-state, blocked-state, visual, and local behavior remain valuable and independently verifiable.

## Decision 4: Use Scenario IDs and Evidence Artifacts as the QA Contract

**Decision**: Define scenario IDs for every global shell area and page. Each scenario records expected behavior, required evidence, status, and any defect finding.

**Rationale**: The user requested full coverage for every element and action. Scenario IDs make the run auditable, allow partial reruns, and prevent vague claims like "dashboard looks good" or "playground works."

**Alternatives considered**:

- Narrative-only report: rejected because it is hard to audit for coverage gaps.
- Screenshot-only report: rejected because screenshots do not prove data flow, network requests, copy values, or hidden state.
- Generic checklist without IDs: rejected because failures become difficult to reproduce and track.

## Decision 5: Record Actual QA Evidence Under the Feature QA Directory

**Decision**: Keep reusable planning artifacts and actual run evidence under `specs/005-dashboard-e2e-validation/`, with run evidence in `specs/005-dashboard-e2e-validation/qa/`.

**Rationale**: This repository is an independent project for this feature, so dashboard QA evidence should stay inside the project instead of writing to `../hybrid-im-knowledge/04_QA_tasks/`. Keeping the QA run under the feature directory makes the validation plan, run evidence, and report self-contained and worktree-safe.

**Alternatives considered**:

- Store all screenshots and run reports in `../hybrid-im-knowledge/04_QA_tasks/`: rejected because the user clarified this is an independent project and should not write QA artifacts into that external repository.
- Store only a final summary in the feature directory: rejected because traceability requires run-level evidence and defect details.
- Update long-term technical docs immediately after each run: rejected because QA findings are evidence first; reusable conclusions can be promoted later by a developer follow-up.

## Decision 6: Preserve Design Expectations From the Dashboard Design Reference

**Decision**: Validate UI against the approved dashboard design reference: dark local developer console, terminal-green accent, sidebar/topbar shell, cards, pills, terminal output, research reader, playground builder, source table, and responsive behavior.

**Rationale**: The user explicitly asked for UI validation as well as functionality. Existing `design.md` is the current design source of truth and records both visual tokens and interaction boundaries.

**Alternatives considered**:

- Validate only whether controls are present: rejected because visual state, readability, and design fidelity are explicit requirements.
- Pixel-perfect screenshot matching: rejected for this first validation plan because font fallback, system rendering, and local browser differences make exact pixel equality fragile. Evidence should identify visible regressions and design-language mismatches instead.

## Decision 7: Treat Known Field Mapping and Scroll Problems as Required Regression Checks

**Decision**: The coverage contract must include focused scenarios for field mapping dropdown behavior, mapping sync, and scroll-position preservation after focusing or changing mapping fields.

**Rationale**: The user explicitly called out those issues as examples of subtle problems that the validation must catch. They are also high-impact because field mappings affect all table-backed workflows.

**Alternatives considered**:

- Include them only as general configuration tests: rejected because the defects are specific and easy to miss.
- Defer them to implementation tasks: rejected because the validation feature must define how they will be detected before any fixes are claimed.
