<!--
Sync Impact Report
Version change: template -> 1.0.0
Modified principles:
- Principle placeholder 1 -> I. AI-First Consumer Contract
- Principle placeholder 2 -> II. Evidence-Backed Outputs
- Principle placeholder 3 -> III. No Unsupported Claims
- Principle placeholder 4 -> IV. Reproducible Validation
- Principle placeholder 5 -> V. Traceable Reporting
Added sections:
- Evidence and Data Constraints
- AI Workflow and Review Gates
Removed sections:
- None
Templates requiring updates:
- ✅ .specify/templates/plan-template.md
- ✅ .specify/templates/spec-template.md
- ✅ .specify/templates/tasks-template.md
- ✅ .specify/templates/checklist-template.md
- ✅ .specify/templates/commands/*.md (directory absent; no command templates to update)
Follow-up TODOs:
- None
-->

# Hybrid IM QA Lark CLI Constitution

## Core Principles

### I. AI-First Consumer Contract

This project produces specifications, plans, task lists, reports, and command
outputs primarily for AI agents. Every artifact MUST be structured, explicit,
and machine-checkable enough for an AI agent to consume without guessing hidden
intent. Required inputs, outputs, assumptions, source locations, and validation
steps MUST be written in concrete terms.

Rationale: AI consumers amplify ambiguity. Precise structure reduces fabricated
implementation details, incorrect summaries, and non-reproducible decisions.

### II. Evidence-Backed Outputs

Every factual claim in a generated result or report MUST be traceable to an
observable source: repository file path, command output, documented user input,
external source citation, or explicitly marked runtime observation. Claims about
current state, behavior, failures, counts, dates, versions, and completion MUST
include the evidence used or the exact verification command that produced it.

Rationale: The project exists to support QA. QA artifacts lose value when readers
cannot distinguish verified facts from inference.

### III. No Unsupported Claims

AI-generated artifacts MUST NOT present assumptions, estimates, inferences, or
unverified third-party information as facts. Unknowns MUST be marked with
`NEEDS CLARIFICATION` or `TODO(<FIELD>)` and MUST include the missing evidence
needed to resolve them. If evidence conflicts, the artifact MUST report the
conflict and stop short of choosing a fact without a documented tie-break rule.

Rationale: A biased or overconfident answer is worse than a clearly bounded
unknown because it can drive incorrect implementation and review decisions.

### IV. Reproducible Validation

Each feature plan, task list, and report MUST define how its factual results can
be reproduced. Verification steps MUST use deterministic commands or documented
manual observations, include relevant environment constraints, and record
whether validation passed, failed, or was not run. Completion claims MUST NOT be
made until the listed validation evidence exists.

Rationale: Reproducibility is the practical test that a report matches reality
rather than a one-time interpretation by an agent.

### V. Traceable Reporting

Reports MUST separate observed facts, analysis, assumptions, risks, and next
actions. Report conclusions MUST cite the facts they depend on, and generated
summaries MUST preserve material caveats from source evidence. When output is
transformed, summarized, filtered, or sampled, the report MUST state that method.

Rationale: Traceable report structure prevents selective presentation and makes
it possible to audit how an AI agent reached a conclusion.

## Evidence and Data Constraints

- Repository facts MUST be collected from the working tree, Git metadata, or
  command output in the current workspace.
- User-provided facts MUST be treated as requirements or constraints, but they
  MUST NOT be expanded into additional factual claims without evidence.
- External facts MUST be verified against current, authoritative sources when
  they can change over time or materially affect a result.
- Generated artifacts MUST preserve exact file paths, command names, versions,
  dates, and error messages when those details support a claim.
- Reports MUST identify skipped validation, inaccessible evidence, or stale
  source material before making recommendations based on incomplete data.

## AI Workflow and Review Gates

- Specifications MUST include acceptance criteria that can be validated without
  relying on unstated AI interpretation.
- Plans MUST include a Constitution Check that covers evidence sources,
  unsupported-claim prevention, reproducible validation, and report traceability.
- Task lists MUST include explicit validation and report-review tasks whenever a
  feature produces AI-facing output or QA conclusions.
- Reviews MUST reject artifacts that contain factual claims without traceable
  evidence, unresolved contradictions, or completion statements without recorded
  validation.
- Amendments that weaken evidence, validation, or traceability requirements MUST
  be treated as MAJOR version changes.

## Governance

This constitution supersedes conflicting informal practices for this repository.
Every specification, implementation plan, task list, checklist, and QA report
MUST be checked against the Core Principles before it is treated as complete.

Amendments MUST update this file and any affected templates in the same change.
Each amendment MUST include a Sync Impact Report that lists version changes,
principle changes, template updates, and deferred follow-up work. The versioning
policy is:

- MAJOR: Removes or weakens a principle, changes the AI consumer contract, or
  redefines evidence and validation requirements in a backward-incompatible way.
- MINOR: Adds a principle or materially expands required evidence, validation,
  reporting, workflow, or review gates.
- PATCH: Clarifies wording, fixes errors, or improves examples without changing
  required behavior.

Compliance review MUST verify that generated artifacts separate facts from
assumptions, cite evidence for factual claims, record validation status, and
avoid unsupported completion claims. Any exception MUST be documented in the
artifact with the reason, risk, and required follow-up evidence.

**Version**: 1.0.0 | **Ratified**: 2026-05-07 | **Last Amended**: 2026-05-07
