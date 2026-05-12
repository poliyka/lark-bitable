# Tasks: Lark Bitable CLI for AI Bug Triage

**Input**: Design documents from `/specs/001-lark-bitable/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md),
[research.md](./research.md), [data-model.md](./data-model.md),
[contracts/cli-contract.md](./contracts/cli-contract.md),
[quickstart.md](./quickstart.md)

**Tests**: Included because the feature spec and quickstart require deterministic
validation, token redaction checks, workflow readiness checks, and
evidence-backed AI-facing reports.

**Organization**: Tasks are grouped by user story so each story can be
implemented, tested, and reviewed independently after the shared foundation is
complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and does not
  depend on an incomplete task in the same phase.
- **[Story]**: Maps a task to a user story from [spec.md](./spec.md).
- Every task description includes an exact file path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the TypeScript oclif CLI package, test runner, and
repository-local structure.

- [x] T001 Create Node package metadata, single `lark-bitable` binary entry, and scripts in package.json
- [x] T002 Add TypeScript compiler settings for Node.js 22 and oclif ESM output in tsconfig.json
- [x] T003 [P] Add Vitest configuration for unit and integration tests in vitest.config.ts
- [x] T004 [P] Add repository ignore rules for build output, coverage, local reports, and auth artifacts in .gitignore
- [x] T005 [P] Create source directory structure for CLI, Lark, config, triage, reporting, and bootstrap modules in src/cli/index.ts
- [x] T006 [P] Create test directory structure and fixture index for mocked Lark data in tests/fixtures/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared contracts, schemas, stores, formatting, and client seams that
must exist before user-story commands can be implemented.

**CRITICAL**: No user story work should begin until this phase is complete.

- [x] T007 Define shared command status, evidence, issue, auth, source, and structured output types in src/cli/output.ts
- [x] T008 [P] Define zod schemas for source config, auth session, records, candidates, validation results, and reports in src/config/schema.ts
- [x] T009 [P] Define shared CLI error classes and fail-closed prerequisite helpers in src/cli/errors.ts
- [x] T010 Implement human and JSON output rendering with stable field order in src/cli/output.ts
- [x] T011 Implement secret redaction helpers for tokens, auth paths, command output, and reports in src/reporting/evidence.ts
- [x] T012 Implement local configuration store using conf for active source, field mappings, and last selection in src/config/store.ts
- [x] T013 Implement auth storage path resolution and atomic read/write/delete helpers for `~/.lark-bitable/auth.json` in src/config/auth-store.ts
- [x] T014 Implement Lark Base/Bitable URL parser for app token, table id, view id, and domain metadata in src/lark/url-parser.ts
- [x] T015 Implement Bitable record normalization and visible field rendering helpers in src/lark/record-mapper.ts
- [x] T016 Implement official Lark SDK client wrapper interface with injectable transport for tests in src/lark/client.ts
- [x] T017 Implement shared prerequisite checks for auth, source config, field mappings, live access, and selected bug context in src/config/readiness.ts
- [x] T018 Implement base oclif command superclass with shared flags, structured output, and prerequisite handling in src/cli/base-command.ts
- [x] T019 Implement oclif command export/registration entrypoint for the `lark-bitable` binary in src/cli/index.ts
- [x] T020 [P] Add mocked Lark source, fields, records, pagination, and auth fixtures in tests/fixtures/lark.ts
- [x] T021 [P] Add fixture for malformed, expired, insufficient-scope, and ready auth sessions in tests/fixtures/auth.ts
- [x] T022 [P] Add fixture for selected bug context and repository evidence examples in tests/fixtures/research.ts
- [x] T023 Add unit tests for schemas, output contracts, redaction, URL parsing, and record mapping in tests/unit/foundation.test.ts
- [x] T024 Add integration test harness for running CLI commands with mocked stores and mocked Lark client in tests/integration/cli-harness.ts
- [x] T025 Implement minimal `doctor` health command shell that reports CLI version, config status, auth status, and issues in src/cli/commands/doctor.ts

**Checkpoint**: Foundation ready. Command implementations can now be built and
tested by user story.

---

## Phase 3: User Story 7 - Login to Lark for API Access (Priority: P1)

**Goal**: Provide interactive `lark-bitable lark --login`, safe token storage, token refresh
or re-login handling, logout, and fail-closed auth checks before Lark API calls.

**Independent Test**: Starting with no auth file fixture, run mocked login,
verify `~/.lark-bitable/auth.json` state is written outside the repository
with redacted output, then run logout and confirm API commands require login.

### Tests for User Story 7

> Write these tests first and confirm they fail before implementation.

- [x] T026 [P] [US7] Add auth store permission, malformed file, expired token, and deletion tests in tests/unit/auth-store.test.ts
- [x] T027 [P] [US7] Add login success, canceled login, failed code exchange, and token redaction command tests in tests/integration/login.test.ts
- [x] T028 [P] [US7] Add logout absent-file, successful removal, and permission failure command tests in tests/integration/logout.test.ts
- [x] T029 [P] [US7] Add API-command fail-closed auth prerequisite tests in tests/integration/auth-prerequisite.test.ts

### Implementation for User Story 7

- [x] T030 [US7] Implement Lark authorization flow adapter and token refresh decision logic in src/lark/auth.ts
- [x] T031 [US7] Implement interactive Lark auth command prompts, SSO/code handling, scope checks, and auth writes in src/cli/commands/lark.ts
- [x] T032 [US7] Implement logout option with optional non-interactive confirmation and auth deletion in src/cli/commands/lark.ts
- [x] T033 [US7] Integrate auth readiness, refresh attempts, and re-login remediation in src/config/readiness.ts
- [x] T034 [US7] Integrate auth status into doctor output without raw token values in src/cli/commands/doctor.ts
- [x] T035 [US7] Keep Lark auth under the single `lark-bitable lark` command surface in package.json
- [x] T036 [US7] Document login/logout examples and redaction guarantees in README.md

**Checkpoint**: Login and logout are usable independently and every Lark API
command refuses to run without valid auth.

---

## Phase 4: User Story 1 - Configure a Lark Bitable Source (Priority: P1)

**Goal**: Let a user paste a Lark Base/Bitable URL, parse and confirm the active
source, replace it safely, and store configurable field mappings.

**Independent Test**: Start with empty config, run configure with a valid URL
fixture, confirm parsed app token/table id/view id and stored mappings, then run
configure with an invalid URL and verify previous config remains unchanged.

### Tests for User Story 1

> Write these tests first and confirm they fail before implementation.

- [x] T037 [P] [US1] Add valid, missing table, missing app token, and non-Lark URL parser tests in tests/unit/url-parser.test.ts
- [x] T038 [P] [US1] Add config replacement, clear, field mapping, and unchanged-on-invalid tests in tests/unit/config-store.test.ts
- [x] T039 [P] [US1] Add configure command tests for new source, replacement confirmation, invalid URL, and JSON output in tests/integration/configure.test.ts

### Implementation for User Story 1

- [x] T040 [US1] Extend Bitable source schema with status, priority, title aliases, actionable status, and priority order validation in src/config/schema.ts
- [x] T041 [US1] Implement source summary, replacement transaction, clear behavior, and field mapping persistence in src/config/store.ts
- [x] T042 [US1] Implement configure command URL input, confirmation, field mapping flags, clear option, and structured output in src/cli/commands/configure.ts
- [x] T043 [US1] Add source summary rendering and invalid URL remediation messages in src/cli/output.ts
- [x] T044 [US1] Add active source checks to doctor output without attempting Lark table access in src/cli/commands/doctor.ts
- [x] T045 [US1] Add configure workflow examples and required URL shape to README.md
- [x] T046 [US1] Add configure quickstart validation notes for source replacement and invalid URL behavior in specs/001-lark-bitable/quickstart.md

**Checkpoint**: Source configuration works without hard-coded tables and can be
validated independently of record inspection.

---

## Phase 5: User Story 8 - Validate Readiness and Guide Missing Configuration (Priority: P1)

**Goal**: Provide `valid` so users and AI agents can detect blocked, partial, or
ready workflow states and receive concrete remediation commands.

**Independent Test**: Start from fresh config/auth fixtures, run `valid` for
global, inspect, triage, and research workflows, then follow fixture remediation
steps until each workflow reports the correct readiness state.

### Tests for User Story 8

> Write these tests first and confirm they fail before implementation.

- [x] T047 [P] [US8] Add readiness matrix tests for missing CLI, skill, auth, source, field mapping, live access, and selection in tests/unit/readiness.test.ts
- [x] T048 [P] [US8] Add valid command tests for global, inspect, triage, research, guided remediation, and JSON output in tests/integration/valid.test.ts
- [x] T049 [P] [US8] Add partial live-access validation tests for network and authorization uncertainty in tests/integration/valid-live-access.test.ts

### Implementation for User Story 8

- [x] T050 [US8] Implement workflow prerequisite matrix for global, inspect, triage, and research in src/config/readiness.ts
- [x] T051 [US8] Implement blocking issue ordering and remediation command generation in src/config/readiness.ts
- [x] T052 [US8] Implement partial status handling for skipped, failed, or inconclusive live checks in src/config/readiness.ts
- [x] T053 [US8] Implement valid command flags for workflow scope, guided remediation, and structured output in src/cli/commands/valid.ts
- [x] T054 [US8] Add readiness result formatting with checked prerequisites, evidence, issues, remediation, and next safe command in src/cli/output.ts
- [x] T055 [US8] Integrate valid-ready and valid-blocked summaries into doctor output in src/cli/commands/doctor.ts
- [x] T056 [US8] Add `valid` workflow guidance and remediation examples to README.md
- [x] T057 [US8] Add valid scenario coverage notes to specs/001-lark-bitable/quickstart.md

**Checkpoint**: `valid` can be used as the gate before table inspection,
triage, and research workflows.

---

## Phase 6: User Story 2 - Inspect, Filter, and Search Table Records (Priority: P1)

**Goal**: Let users and AI agents list records, retrieve a record, filter by
field criteria, and search visible text fields with source evidence metadata.

**Independent Test**: With mocked auth and source fixtures, run list/get/filter/
search and verify returned records include stable IDs, visible fields, matched
fields where relevant, criteria, source metadata, and retrieval time.

### Tests for User Story 2

> Write these tests first and confirm they fail before implementation.

- [x] T058 [P] [US2] Add Lark client wrapper tests for list fields, list records, get record, pagination, and SDK errors in tests/unit/lark-client.test.ts
- [x] T059 [P] [US2] Add list command tests for limit, selected fields, pagination metadata, empty results, and JSON output in tests/integration/list.test.ts
- [x] T060 [P] [US2] Add get command tests for record id, missing id, unknown record, and inaccessible source in tests/integration/get.test.ts
- [x] T061 [P] [US2] Add filter command tests for equals, contains, unknown field, unsupported operator, and empty result in tests/integration/filter.test.ts
- [x] T062 [P] [US2] Add search command tests for query validation and matched fields in tests/integration/search.test.ts

### Implementation for User Story 2

- [x] T063 [US2] Implement Bitable field and record read methods with pagination in src/lark/client.ts
- [x] T064 [US2] Implement field normalization, empty value rendering, matched field tracking, and source metadata in src/lark/record-mapper.ts
- [x] T065 [US2] Implement list command with limit, field selection, pagination state, auth/source checks, and structured output in src/cli/commands/list.ts
- [x] T066 [US2] Implement get command with stable record id lookup, source evidence, and error output in src/cli/commands/get.ts
- [x] T067 [US2] Implement filter comparison logic and criteria reporting in src/lark/record-mapper.ts
- [x] T068 [US2] Implement filter command with field/operator/value flags and explicit empty result handling in src/cli/commands/filter.ts
- [x] T069 [US2] Implement search logic across visible text-like fields and matched field evidence in src/lark/record-mapper.ts
- [x] T070 [US2] Implement search command with query validation, selected field support, and structured output in src/cli/commands/search.ts
- [x] T071 [US2] Add inspect command examples for list/get/filter/search to README.md

**Checkpoint**: Table inspection works against mocked Lark responses and fails
closed when auth or source prerequisites are missing.

---

## Phase 7: User Story 3 - Guided Bug Selection for AI Workflows (Priority: P1)

**Goal**: Query bug records, exclude non-actionable statuses, sort by priority,
present numbered choices, and persist selected bug context for research.

**Independent Test**: With mocked records across statuses and priorities, run
triage and verify only actionable records appear, sorting follows configured
priority order, empty candidate cases are explicit, and the selected snapshot is
stored.

### Tests for User Story 3

> Write these tests first and confirm they fail before implementation.

- [x] T072 [P] [US3] Add candidate extraction, missing field, actionable status, and priority sort tests in tests/unit/candidate-sort.test.ts
- [x] T073 [P] [US3] Add selection state write/read, stale source, and missing snapshot tests in tests/unit/selection-state.test.ts
- [x] T074 [P] [US3] Add triage command tests for sorting, empty candidates, selection, and JSON in tests/integration/triage.test.ts

### Implementation for User Story 3

- [x] T075 [US3] Implement bug candidate extraction from configured field aliases and required mapping checks in src/triage/candidate-sort.ts
- [x] T076 [US3] Implement actionable status filtering with default `待處理` and override support in src/triage/candidate-sort.ts
- [x] T077 [US3] Implement priority ordering with unknown-priority fallback behavior in src/triage/candidate-sort.ts
- [x] T078 [US3] Implement triage selection persistence, selection evidence, and source snapshot handling in src/triage/selection-state.ts
- [x] T079 [US3] Implement triage command with Inquirer numbered selection and non-interactive structured output in src/cli/commands/triage.ts
- [x] T080 [US3] Integrate selected bug context checks into research workflow readiness in src/config/readiness.ts
- [x] T081 [US3] Add triage output formatting for candidates, missing fields, selection evidence, and no-actionable-records state in src/cli/output.ts
- [x] T082 [US3] Add triage workflow examples and field mapping prerequisites to README.md

**Checkpoint**: AI workflows can select one actionable bug with preserved
selection evidence before research starts.

---

## Phase 8: User Story 6 - Bootstrap AI Usage Through Installable Skill (Priority: P1)

**Goal**: Ship installable AI-facing skill guidance and self-check behavior so
an AI agent can discover the CLI, verify installation, and follow the supported
workflow without guessing syntax.

**Independent Test**: Install or link the bootstrap skill into a test repository,
run doctor/valid, and verify the skill guidance matches CLI help and stops on
missing prerequisites.

### Tests for User Story 6

> Write these tests first and confirm they fail before implementation.

- [x] T083 [P] [US6] Add bootstrap installer tests for install path, overwrites, and missing CLI in tests/unit/bootstrap-installer.test.ts
- [x] T084 [P] [US6] Add bootstrap skill contract tests for required workflow commands and evidence rules in tests/unit/bootstrap-skill.test.ts
- [x] T085 [P] [US6] Add doctor bootstrap status tests for skill and CLI conflicts in tests/integration/doctor-bootstrap.test.ts

### Implementation for User Story 6

- [x] T086 [US6] Write AI-facing bootstrap skill with install and workflow rules in src/bootstrap/skill/SKILL.md
- [x] T087 [US6] Implement bootstrap installer that copies or links skill assets into the configured agent skill directory in src/bootstrap/installer.ts
- [x] T088 [US6] Implement bootstrap install command or doctor sub-flow for installing skill guidance in src/cli/commands/doctor.ts
- [x] T089 [US6] Add bootstrap skill discovery and stale-help comparison logic in src/bootstrap/installer.ts
- [x] T090 [US6] Integrate bootstrap readiness into valid global workflow checks in src/config/readiness.ts
- [x] T091 [US6] Integrate bootstrap status, CLI command path, and version evidence into doctor output in src/cli/commands/doctor.ts
- [x] T092 [US6] Add bootstrap installation and AI-agent workflow instructions to README.md
- [x] T093 [US6] Add bootstrap validation flow to specs/001-lark-bitable/quickstart.md

**Checkpoint**: A fresh AI agent can learn the install and usage workflow from
the shipped skill and self-check before attempting table access.

---

## Phase 9: User Story 5 - Discover Commands Through Help (Priority: P2)

**Goal**: Provide complete global and command-specific help for users and AI
agents, including purpose, inputs, outputs, examples, and common failures.

**Independent Test**: Run global help and command-specific help for every
supported command and verify syntax, examples, common errors, and bootstrap/
valid/login ordering are discoverable without external docs.

### Tests for User Story 5

> Write these tests first and confirm they fail before implementation.

- [x] T094 [P] [US5] Add global help snapshot tests for workflow ordering and command list in tests/integration/help-global.test.ts
- [x] T095 [P] [US5] Add command-specific help snapshot tests for all commands in tests/integration/help-commands.test.ts

### Implementation for User Story 5

- [x] T096 [US5] Add oclif command descriptions, examples, flags, args, and failure summaries to src/cli/commands/lark.ts
- [x] T097 [US5] Add auth login/logout examples and failure summaries under src/cli/commands/lark.ts
- [x] T098 [US5] Add oclif command descriptions, examples, flags, args, and failure summaries to src/cli/commands/valid.ts
- [x] T099 [US5] Add oclif command descriptions, examples, flags, args, and failure summaries to src/cli/commands/configure.ts
- [x] T100 [US5] Add oclif command descriptions, examples, flags, args, and failure summaries to src/cli/commands/list.ts
- [x] T101 [US5] Add oclif command descriptions, examples, flags, args, and failure summaries to src/cli/commands/get.ts
- [x] T102 [US5] Add oclif command descriptions, examples, flags, args, and failure summaries to src/cli/commands/filter.ts
- [x] T103 [US5] Add oclif command descriptions, examples, flags, args, and failure summaries to src/cli/commands/search.ts
- [x] T104 [US5] Add oclif command descriptions, examples, flags, args, and failure summaries to src/cli/commands/triage.ts
- [x] T105 [US5] Add oclif command descriptions, examples, flags, args, and failure summaries to src/cli/commands/research.ts
- [x] T106 [US5] Add oclif command descriptions, examples, flags, args, and failure summaries to src/cli/commands/doctor.ts
- [x] T107 [US5] Add help/README consistency check documentation in README.md

**Checkpoint**: Help is sufficiently explicit for humans and AI agents to use
the CLI without guessing command syntax.

---

## Phase 10: User Story 4 - Research and Report on a Selected Bug (Priority: P2)

**Goal**: Turn a selected bug into a first evidence-backed investigation report
that separates facts, assumptions, analysis, likely causes, recommended fixes,
risks, next actions, and evidence.

**Independent Test**: With a selected bug fixture and repository evidence
fixtures, run research and verify every factual claim cites evidence, unresolved
causes remain labeled, raw tokens are absent, and the report is written when an
output path is provided.

### Tests for User Story 4

> Write these tests first and confirm they fail before implementation.

- [x] T108 [P] [US4] Add evidence model tests for all evidence types and statuses in tests/unit/evidence.test.ts
- [x] T109 [P] [US4] Add research report rendering tests for sections and citations in tests/unit/research-report.test.ts
- [x] T110 [P] [US4] Add research command tests for selection, evidence, and output path in tests/integration/research.test.ts

### Implementation for User Story 4

- [x] T111 [US4] Implement evidence item creation, citation identifiers, redacted excerpts, and claim support checks in src/reporting/evidence.ts
- [x] T112 [US4] Implement repository context collectors for files and commands in src/reporting/repository-context.ts
- [x] T113 [US4] Implement research report assembly with required sections and unresolved cause handling in src/reporting/research-report.ts
- [x] T114 [US4] Implement research command with selection lookup and output path in src/cli/commands/research.ts
- [x] T115 [US4] Integrate missing selection, missing evidence, and partial report states in src/config/readiness.ts
- [x] T116 [US4] Add research report formatting for human and JSON outputs in src/cli/output.ts
- [x] T117 [US4] Add research workflow examples and report evidence rules to README.md
- [x] T118 [US4] Add report accuracy validation notes to specs/001-lark-bitable/quickstart.md

**Checkpoint**: The CLI can produce the first AI-facing report without turning
unverified analysis into facts.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Final documentation, validation, security, and consistency checks
across all user stories.

- [x] T119 [P] Add package usage, install, build, test, and local linking instructions to README.md
- [x] T120 [P] Add deterministic large-record test fixtures in tests/fixtures/lark-large.ts
- [x] T121 Add quickstart command validation script for the full CLI flow in scripts/quickstart-validate.ts
- [x] T122 Add package script for quickstart validation in package.json
- [x] T123 Run and record `pnpm test` validation results in specs/001-lark-bitable/validation-notes.md
- [x] T124 Run and record TypeScript build validation results in specs/001-lark-bitable/validation-notes.md
- [x] T125 Audit command output, test snapshots, README examples, and report fixtures for raw token leakage in specs/001-lark-bitable/validation-notes.md
- [x] T126 Audit research report fixtures for unsupported claims in specs/001-lark-bitable/validation-notes.md
- [x] T127 Compare bootstrap skill examples against oclif help output and record consistency results in specs/001-lark-bitable/validation-notes.md
- [x] T128 Run `git diff --check` and record whitespace validation results in specs/001-lark-bitable/validation-notes.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user-story work.
- **US7 Login (Phase 3)**: Depends on Foundational because API commands need
  shared auth storage, output, and readiness helpers.
- **US1 Configure (Phase 4)**: Depends on Foundational and can be developed in
  parallel with US7 after shared stores and schemas exist.
- **US8 Valid (Phase 5)**: Depends on US7 and US1 for meaningful auth/source
  checks.
- **US2 Inspect (Phase 6)**: Depends on US7, US1, and US8 because table commands
  must check auth, source, and readiness before Lark access.
- **US3 Triage (Phase 7)**: Depends on US2 record inspection plus configured
  field mappings.
- **US6 Bootstrap (Phase 8)**: Depends on doctor/valid/help command contracts;
  it can be developed after the command surface is stable enough to document.
- **US5 Help (Phase 9)**: Depends on command implementations enough to keep help
  output accurate, but can be refined in parallel with late implementation.
- **US4 Research (Phase 10)**: Depends on US3 selected bug context and shared
  evidence/reporting foundation.
- **Polish (Phase 11)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US7 (P1)**: Can start after Foundational; required before live Lark access.
- **US1 (P1)**: Can start after Foundational; required before table commands.
- **US8 (P1)**: Requires US7 and US1 concepts, then gates other workflows.
- **US2 (P1)**: Requires US7, US1, and readiness checks.
- **US3 (P1)**: Requires US2 record retrieval and configured bug field mappings.
- **US6 (P1)**: Requires stable doctor/valid/help behavior to avoid stale AI
  guidance.
- **US5 (P2)**: Can be completed once command behavior is stable.
- **US4 (P2)**: Requires selected bug context from US3.

### Within Each User Story

- Tests are written before implementation and should fail first.
- Schemas and data models precede stores and services.
- Stores and services precede command adapters.
- Command adapters precede README and quickstart examples.
- Evidence capture and redaction precede report generation.
- Validation evidence is recorded before completion claims.

---

## Parallel Opportunities

- Setup tasks T003, T004, T005, and T006 can run in parallel after T001/T002 are
  understood.
- Foundational schema, error, fixture, and mapping tasks T008, T009, T020, T021,
  and T022 can run in parallel.
- US7 test tasks T026 through T029 can run in parallel before auth
  implementation starts.
- US1 test tasks T037 through T039 can run in parallel before configure
  implementation starts.
- US8 test tasks T047 through T049 can run in parallel before readiness
  implementation starts.
- US2 command test tasks T058 through T062 can run in parallel because each
  command has a separate test file.
- US3 unit and integration tests T072 through T074 can run in parallel.
- US6 bootstrap tests T083 through T085 can run in parallel.
- US5 help snapshot tests T094 and T095 can run in parallel.
- US4 evidence, report, and command tests T108 through T110 can run in parallel.
- Polish fixture and documentation tasks T119 and T120 can run in parallel.

---

## Parallel Example: User Story 2

```bash
Task: "T059 [US2] Add list command tests in tests/integration/list.test.ts"
Task: "T060 [US2] Add get command tests in tests/integration/get.test.ts"
Task: "T061 [US2] Add filter command tests in tests/integration/filter.test.ts"
Task: "T062 [US2] Add search command tests in tests/integration/search.test.ts"
```

## Parallel Example: User Story 6

```bash
Task: "T083 [US6] Add bootstrap installer tests in tests/unit/bootstrap-installer.test.ts"
Task: "T084 [US6] Add bootstrap skill contract tests in tests/unit/bootstrap-skill.test.ts"
Task: "T085 [US6] Add doctor bootstrap status tests in tests/integration/doctor-bootstrap.test.ts"
```

## Parallel Example: User Story 4

```bash
Task: "T108 [US4] Add evidence model tests in tests/unit/evidence.test.ts"
Task: "T109 [US4] Add research report rendering tests in tests/unit/research-report.test.ts"
Task: "T110 [US4] Add research command tests in tests/integration/research.test.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US7, US1, and US8 so the tool can log in, configure a source, and
   validate readiness without guessing.
3. Stop and validate login/configure/valid independently.
4. Add US2 next to make the configured table inspectable.

### Incremental Delivery

1. Setup + Foundational gives a buildable CLI shell and shared contracts.
2. US7 + US1 + US8 gives a usable setup gate for humans and AI agents.
3. US2 adds read-only table inspection.
4. US3 adds guided actionable bug selection.
5. US6 and US5 make the workflow discoverable and installable for AI agents.
6. US4 adds the evidence-backed research report.

### Parallel Team Strategy

1. One developer owns setup/foundation and shared output/schema decisions.
2. After foundation, separate developers can own US7 auth, US1 configure, and
   US2 command tests with minimal file overlap.
3. Triage, bootstrap/help, and research should integrate after command contracts
   stabilize to avoid stale examples or report formats.

---

## Notes

- [P] tasks touch separate files or can be completed without waiting for another
  incomplete task in the same phase.
- Story labels map to the original user story numbers in [spec.md](./spec.md);
  story order is dependency-aware because several P1 stories depend on login and
  configuration.
- The first version remains read-focused and must not write back to Lark
  records.
- Raw Lark tokens must never appear in command output, test snapshots, README
  examples, bootstrap guidance, validation notes, or research reports.
