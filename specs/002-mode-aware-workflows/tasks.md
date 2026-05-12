# Tasks: Mode-Aware QA and Developer Workflows

**Input**: Design documents from `/specs/002-mode-aware-workflows/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md),
[research.md](./research.md), [data-model.md](./data-model.md),
[contracts/cli-contract.md](./contracts/cli-contract.md),
[quickstart.md](./quickstart.md)

**Tests**: Included because this feature changes AI-facing command output,
mode-aware readiness, query behavior, QA verification, and evidence boundaries.

**Organization**: Tasks are grouped by user story so each story can be
implemented, tested, and reviewed independently after the shared foundation is
complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and does not
  depend on an incomplete task in the same phase.
- **[Story]**: Maps a task to a user story from [spec.md](./spec.md).
- Every task description includes an exact file path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the file structure needed by mode-aware workflows without
changing runtime behavior yet.

- [x] T001 Create mode helper exports for workflow mode resolution in src/mode/mode-config.ts
- [x] T002 [P] Create owner filtering and query limit helper exports in src/mode/owner-filter.ts
- [x] T003 [P] Add status value discovery helper exports for exact table values in src/lark/field-discovery.ts
- [x] T004 [P] Create QA check discovery module exports in src/qa/check-discovery.ts
- [x] T005 [P] Create QA command runner module exports in src/qa/check-runner.ts
- [x] T006 [P] Create QA verification report module exports in src/qa/verification-report.ts
- [x] T007 [P] Create media command topic directory with download command exports in src/cli/commands/media/download.ts
- [x] T008 [P] Add mode and owner fixture placeholders in tests/fixtures/mode.ts
- [x] T009 [P] Add QA verification fixture placeholders in tests/fixtures/qa.ts
- [x] T010 [P] Add media attachment fixture placeholders in tests/fixtures/media.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define shared schemas, stores, output metadata, field discovery,
media access, and fixtures that all user stories depend on.

**CRITICAL**: No user story work should begin until this phase is complete.

- [x] T011 [P] Add workflow mode, mode config, owner criterion, query limit, QA check, QA verification, and lark-media evidence schemas in src/config/schema.ts
- [x] T012 [P] Add schema validation and secret redaction tests for mode, owner, query limit, QA result, and lark-media evidence in tests/unit/foundation.test.ts
- [x] T013 Add mode config read/write helpers and backward-compatible Developer default behavior in src/config/store.ts
- [x] T014 [P] Add config store tests for mode persistence, mode switching, inactive owner default, and source preservation in tests/unit/config-store.test.ts
- [x] T015 Add shared mode resolver, active-mode metadata, and invalid-mode remediation helpers in src/mode/mode-config.ts
- [x] T016 [P] Add mode resolver tests for explicit QA, explicit Developer, defaulted Developer, and invalid mode in tests/unit/mode-config.test.ts
- [x] T017 Add shared owner criteria, queryLimit, executedChecks, skippedChecks, mediaDownloads, and mode fields to command output types in src/cli/output.ts
- [x] T018 [P] Add output formatting tests for mode, ownerCriteria, queryLimit, executedChecks, skippedChecks, and mediaDownloads in tests/unit/output.test.ts
- [x] T019 Add localized status values and owner value shapes to reusable fixtures in tests/fixtures/mode.ts
- [x] T020 Add QA task, workspace evidence, safe command, unsafe command, skipped-check, and failed-check fixtures in tests/fixtures/qa.ts
- [x] T021 Add Bitable attachment, image field, media token, and unauthorized anonymous response fixtures in tests/fixtures/media.ts
- [x] T022 [P] Add field discovery tests for field list, exact status option discovery, simplified/traditional mismatch, and remediation text in tests/unit/field-discovery.test.ts
- [x] T023 Extend field discovery to return exact field names and observed status values without guessing language variants in src/lark/field-discovery.ts
- [x] T024 [P] Add Lark client media download tests for authenticated Drive media requests, range headers, extra query parameter, and binary response metadata in tests/unit/lark-client.test.ts
- [x] T025 Implement authenticated Drive media download support in src/lark/client.ts
- [x] T026 Add reusable media reference extraction for Bitable attachment/image values in src/lark/record-mapper.ts

**Checkpoint**: Foundation ready. User story implementation can now begin in
priority order or in parallel where dependencies allow.

---

## Phase 3: User Story 1 - Select Workflow Mode (Priority: P1) MVP

**Goal**: Users and AI agents can set, view, and change `QA` or `Developer`
mode without losing configured Lark source, auth app settings, common field
mappings, or last selection.

**Independent Test**: Starting from a clean configuration, select QA mode and
confirm configure/valid/help output describes QA-oriented capabilities; switch
to Developer mode and confirm bug-investigation guidance appears while source
identity and field mappings remain intact.

### Tests for User Story 1

Write these tests first and confirm they fail before implementation.

- [x] T027 [P] [US1] Add configure command tests for `--mode QA`, `--mode Developer`, invalid mode, source preservation, and JSON mode output in tests/integration/configure.test.ts
- [x] T028 [P] [US1] Add interactive configure tests for numbered mode selection, keeping stored defaults, and leaving optional mode fields blank in tests/integration/configure.test.ts
- [x] T029 [P] [US1] Add valid command tests for explicit mode, defaulted Developer mode, invalid mode, and nextSafeCommand in tests/integration/valid.test.ts
- [x] T030 [P] [US1] Add help tests for active mode display and QA/Developer examples in tests/integration/help-global.test.ts

### Implementation for User Story 1

- [x] T031 [US1] Add `--mode QA|Developer` parsing and mode persistence to configure in src/cli/commands/configure.ts
- [x] T032 [US1] Add guided numbered mode selection and default-preserving prompts to configure in src/cli/commands/configure.ts
- [x] T033 [US1] Preserve source, auth app settings, common field mappings, and last selection when active mode changes in src/config/store.ts
- [x] T034 [US1] Add mode-aware readiness checks and next safe command selection for global, inspect, triage, research, and verify workflows in src/config/readiness.ts
- [x] T035 [US1] Add active mode metadata to valid command output in src/cli/commands/valid.ts
- [x] T036 [US1] Add active mode summaries to global help and configure help entries in src/cli/commands/help.ts
- [x] T037 [US1] Update bootstrap skill guidance to inspect active mode before choosing research or verify in src/bootstrap/skill/SKILL.md

**Checkpoint**: User Story 1 is complete when mode selection and mode reporting
work independently and mode switching preserves existing source configuration.

---

## Phase 4: User Story 2 - QA Mode Task Verification (Priority: P1)

**Goal**: QA mode can verify a selected or specified task by loading the full
task record, inspecting task attachments when present, discovering safe
workspace checks, running only evidence-backed safe checks, and reporting
executed and skipped checks with evidence.

**Independent Test**: Configure QA mode, select or provide a task, run verify,
and confirm the result contains full task detail, workspace evidence, media
inspection status, safe check candidates, executed checks or skipped-check
reasons, manual next steps, risks, and evidence-backed report content.

### Tests for User Story 2

Write these tests first and confirm they fail before implementation.

- [x] T038 [P] [US2] Add QA check discovery tests for package scripts, test directories, unsupported workspaces, and evidence references in tests/unit/qa-check-discovery.test.ts
- [x] T039 [P] [US2] Add QA safety screening tests for allowed test commands and blocked destructive commands in tests/unit/qa-check-runner.test.ts
- [x] T040 [P] [US2] Add QA verification report tests for executed checks, skipped checks, assumptions, risks, evidence ids, media inspection status, and secret redaction in tests/unit/qa-verification-report.test.ts
- [x] T041 [P] [US2] Add verify command tests for QA mode required, selected task fallback, record id input, full record loading, no safe checks, failed checks, and JSON output in tests/integration/verify.test.ts
- [x] T042 [P] [US2] Add repository evidence fixture tests for package manager and script discovery in tests/unit/repository-context.test.ts
- [x] T043 [P] [US2] Add verify command tests for selected records with image or attachment fields requiring authenticated media handling in tests/integration/verify.test.ts

### Implementation for User Story 2

- [x] T044 [US2] Implement workspace evidence discovery for package scripts, test directories, and config files in src/reporting/repository-context.ts
- [x] T045 [US2] Implement QA check candidate discovery and confidence classification in src/qa/check-discovery.ts
- [x] T046 [US2] Implement QA command safety screening, execution, timeout handling, exit status capture, and output redaction in src/qa/check-runner.ts
- [x] T047 [US2] Implement QA verification report rendering with task summary, executedChecks, skippedChecks, assumptions, risks, manualNextSteps, media inspection status, and evidence in src/qa/verification-report.ts
- [x] T048 [US2] Add `verify` command with record id fallback, selected task lookup, full record fetch, QA mode validation, `--checks`, `--out`, and `--json` support in src/cli/commands/verify.ts
- [x] T049 [US2] Register the verify command in src/cli/index.ts
- [x] T050 [US2] Add verify workflow readiness to valid command scope options in src/cli/commands/valid.ts
- [x] T051 [US2] Add QA verification output formatting for human and JSON modes in src/cli/output.ts

**Checkpoint**: User Story 2 is complete when QA verification can be run in QA
mode and reports never treat skipped checks, unread media, or assumptions as
verified facts.

---

## Phase 5: User Story 3 - Owner-Aware Record Discovery and Query Limits (Priority: P2)

**Goal**: `list`, `search`, `filter`, `triage`, and table-record discovery
inside `verify` support optional owner focus and a positive-integer `--limit`,
while continuing without owner filtering when no owner field is configured.

**Independent Test**: Configure an owner field, run list/search/filter/triage
with stored owner default, command-level `--owner`, `--no-default-owner`, and
`--limit`, and confirm records are filtered and capped correctly. Remove owner
field and confirm the same commands continue with
`ownerCriteria.applied=false`.

### Tests for User Story 3

Write these tests first and confirm they fail before implementation.

- [x] T052 [P] [US3] Add owner value extraction and exact visible-label matching tests for strings, people objects, select values, multi-select values, empty values, and internal-id fallback in tests/unit/owner-filter.test.ts
- [x] T053 [P] [US3] Add query limit validation and post-criteria limiting tests for valid, zero, negative, non-integer, default limit, and hasMore cases in tests/unit/query-limit.test.ts
- [x] T054 [P] [US3] Add list command tests for `--owner`, default owner, `--no-default-owner`, missing owner field not-applied metadata, and `--limit` in tests/integration/list.test.ts
- [x] T055 [P] [US3] Add search command tests for owner criteria, missing owner field not-applied metadata, and post-search `--limit` in tests/integration/search.test.ts
- [x] T056 [P] [US3] Add filter command tests for owner criteria, missing owner field not-applied metadata, and post-filter `--limit` in tests/integration/filter.test.ts
- [x] T057 [P] [US3] Add triage command tests for owner criteria, inactive default owner, missing owner field not-applied metadata, and post-sort `--limit` in tests/integration/triage.test.ts
- [x] T058 [P] [US3] Add verify command tests for owner criteria and `--limit` during table-record discovery in tests/integration/verify.test.ts

### Implementation for User Story 3

- [x] T059 [US3] Implement owner criteria resolution, visible-label extraction, exact matching, not-applied metadata, and default-owner precedence in src/mode/owner-filter.ts
- [x] T060 [US3] Implement query limit parsing, validation, post-criteria slicing, returned count, and hasMore metadata in src/mode/owner-filter.ts
- [x] T061 [US3] Add optional owner field and per-mode default owner configure flags and prompts to src/cli/commands/configure.ts
- [x] T062 [US3] Add owner/default-owner persistence and inactive default owner handling to src/config/store.ts
- [x] T063 [US3] Add owner criteria and query limit support to shared record loading helpers in src/cli/shared-records.ts
- [x] T064 [US3] Add `--owner`, `--no-default-owner`, and shared limit metadata output to list in src/cli/commands/list.ts
- [x] T065 [US3] Add `--owner`, `--no-default-owner`, `--limit`, and post-search limiting to search in src/cli/commands/search.ts
- [x] T066 [US3] Add `--owner`, `--no-default-owner`, `--limit`, and post-filter limiting to filter in src/cli/commands/filter.ts
- [x] T067 [US3] Add `--owner`, `--no-default-owner`, `--limit`, owner criteria selection evidence, and post-sort limiting to triage in src/cli/commands/triage.ts
- [x] T068 [US3] Add owner criteria and query limit support to verify record discovery paths in src/cli/commands/verify.ts
- [x] T069 [US3] Add owner criteria and query limit rendering to human and JSON output in src/cli/output.ts
- [x] T070 [US3] Update help entries for list, search, filter, triage, configure, and verify with owner and limit examples in src/cli/commands/help.ts

**Checkpoint**: User Story 3 is complete when all query commands support
`--limit`, owner filtering applies only when possible, and missing owner field
never blocks record discovery.

---

## Phase 6: User Story 4 - Developer Mode Bug Investigation (Priority: P2)

**Goal**: Developer mode preserves existing bug discovery, triage, full-detail
inspection, and research behavior while adding owner criteria traceability,
exact status-value handling, and authenticated media download for selected bug
evidence.

**Independent Test**: Configure Developer mode with title, status, priority,
and optional owner fields; run list/filter/search/triage/get/research; confirm
existing bug-focused output remains available, status values come from actual
table values, owner criteria are preserved when used, `get` exposes full record
detail, and media evidence can be downloaded with auth before research claims
are made.

### Tests for User Story 4

Write these tests first and confirm they fail before implementation.

- [x] T071 [P] [US4] Add Developer mode triage regression tests for actionable status, priority sorting, selected mode metadata, owner criteria selection evidence, and exact status value mismatch remediation in tests/integration/triage.test.ts
- [x] T072 [P] [US4] Add configure tests for discovered status value choices, simplified/traditional mismatch handling, and no free-text status prompt when discovery succeeds in tests/integration/configure.test.ts
- [x] T073 [P] [US4] Add get command tests proving selected bug detail includes all visible fields and extracted media references in tests/integration/get.test.ts
- [x] T074 [P] [US4] Add media download command tests for auth-required binary download, output path creation, JSON metadata, `--extra`, and `--range` in tests/integration/media-download.test.ts
- [x] T075 [P] [US4] Add Developer mode research tests for mode metadata, full record hydration, owner criteria preservation, media evidence boundaries, and QA-mode warning behavior in tests/integration/research.test.ts
- [x] T076 [P] [US4] Add research report tests for owner criteria and unread media not being treated as root-cause evidence in tests/unit/research-report.test.ts

### Implementation for User Story 4

- [x] T077 [US4] Add exact discovered status value selection and stored-default status prompts to configure in src/cli/commands/configure.ts
- [x] T078 [US4] Add no-actionable-record remediation that lists observed configured-field status values without guessing translations in src/triage/candidate-sort.ts
- [x] T079 [US4] Add mode metadata and owner criteria preservation to triage selection snapshots in src/triage/selection-state.ts
- [x] T080 [US4] Add Developer mode selection evidence and owner criteria serialization to triage output in src/cli/commands/triage.ts
- [x] T081 [US4] Extend get command output with complete record detail and extracted media references in src/cli/commands/get.ts
- [x] T082 [US4] Implement media download command with authenticated token use, output file writing, response metadata, `--extra`, `--range`, and JSON output in src/cli/commands/media/download.ts
- [x] T083 [US4] Register media download help and command routing in src/cli/index.ts
- [x] T084 [US4] Add Developer mode metadata, QA-mode warning, full selected record hydration, and owner criteria context to research command output in src/cli/commands/research.ts
- [x] T085 [US4] Update research report rendering to include full-record evidence and media inspection status without treating unread media as facts in src/reporting/research-report.ts
- [x] T086 [US4] Update readiness checks so research remains Developer-oriented and warns in QA mode in src/config/readiness.ts

**Checkpoint**: User Story 4 is complete when Developer workflows still work,
language-specific status values are exact, selected bug detail is fully
inspectable through `get`, and Lark media evidence is downloaded only through
authenticated requests.

---

## Phase 7: User Story 5 - Mode-Specific Guidance and Validation (Priority: P3)

**Goal**: Users and AI agents receive mode-specific help, validation,
bootstrap guidance, and README instructions that accurately reflect QA and
Developer capabilities.

**Independent Test**: Run help and validation in QA and Developer modes and
confirm each mode reports required setup, optional owner behavior, query limit
usage, common failures, next safe commands, detail-first bug inspection, media
download requirements, and command examples relevant to that mode.

### Tests for User Story 5

Write these tests first and confirm they fail before implementation.

- [x] T087 [P] [US5] Add command-specific help tests for configure, valid, list, search, filter, triage, get, media download, research, and verify mode-aware examples in tests/integration/help-commands.test.ts
- [x] T088 [P] [US5] Add global help tests for QA workflow, Developer workflow, owner not-applied behavior, query limit guidance, get-as-detail guidance, and media auth guidance in tests/integration/help-global.test.ts
- [x] T089 [P] [US5] Add valid command tests for mode-specific missing setup, inactive owner default, owner not-applied note, verify workflow, research workflow, and query limit validation guidance in tests/integration/valid.test.ts
- [x] T090 [P] [US5] Add bootstrap skill tests for QA verify workflow, Developer research workflow, owner optionality, limit rules, get-before-research, authenticated media download, and evidence boundaries in tests/unit/bootstrap-skill.test.ts

### Implementation for User Story 5

- [x] T091 [US5] Expand help registry with mode-specific sections, owner not-applied rules, query limit examples, get detail workflow, media download help, and verify command help in src/cli/commands/help.ts
- [x] T092 [US5] Expand valid output with mode-specific prerequisites, inactive owner default notes, owner not-applied guidance, verify workflow readiness, research workflow readiness, and nextSafeCommand rules in src/config/readiness.ts
- [x] T093 [US5] Update valid command flags and workflow options for `verify`, owner checks, and query-related remediation in src/cli/commands/valid.ts
- [x] T094 [US5] Update bootstrap skill instructions for QA verify, Developer research, owner optionality, not-applied owner filtering, query limits, mandatory get-before-research, authenticated media download, and evidence boundaries in src/bootstrap/skill/SKILL.md
- [x] T095 [US5] Sync installed bootstrap skill copy with generated skill instructions in .agents/skills/lark-bitable/SKILL.md
- [x] T096 [US5] Update README usage sections for mode setup, QA verify, Developer research, owner optionality, query limits, exact status value selection, get detail workflow, media download, and Lark permission wording in README.md

**Checkpoint**: User Story 5 is complete when humans and AI agents can discover
the correct mode-specific workflow without relying on unstated assumptions.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation consistency, and evidence review
across all stories.

- [x] T097 [P] Update quickstart validation examples for mode, owner, limit, status value discovery, get detail, media download, verify, and research workflows in specs/002-mode-aware-workflows/quickstart.md
- [x] T098 [P] Update CLI contract if implementation command flags or output fields changed in specs/002-mode-aware-workflows/contracts/cli-contract.md
- [x] T099 [P] Update bootstrap installer tests if skill install output changes in tests/unit/bootstrap-installer.test.ts
- [x] T100 Audit QA and Developer reports for unsupported claims, missing evidence ids, unread media claims, and secret leakage in src/reporting/evidence.ts
- [x] T101 Run `pnpm test` and record pass/fail output in specs/002-mode-aware-workflows/validation-notes.md
- [x] T102 Run `pnpm build` and record pass/fail output in specs/002-mode-aware-workflows/validation-notes.md
- [x] T103 Run `pnpm format:check` and record pass/fail output in specs/002-mode-aware-workflows/validation-notes.md
- [x] T104 Run `pnpm quickstart:validate` and record pass/fail output in specs/002-mode-aware-workflows/validation-notes.md
- [x] T105 Run live e2e `lark-bitable doctor --json` and `lark-bitable valid --workflow inspect --json` with configured local auth and record results in specs/002-mode-aware-workflows/validation-notes.md
- [x] T106 Run live e2e query commands for list, search, filter, and triage with `--limit` and record results in specs/002-mode-aware-workflows/validation-notes.md
- [x] T107 Run live e2e selected-record flow with `lark-bitable get <record-id> --json` and record full-detail/media-reference results in specs/002-mode-aware-workflows/validation-notes.md
- [x] T108 Run live e2e media download with `lark-bitable media download <file-token> --out <path> --json`, verify binary file type, and record results in specs/002-mode-aware-workflows/validation-notes.md
- [x] T109 Run live e2e anonymous media URL negative check and record the unauthorized JSON response in specs/002-mode-aware-workflows/validation-notes.md

Note: T105-T109 were rerun with current `~/.lark-bitable/auth.json` after the
storage-path migration and are recorded in validation notes.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1 and blocks all user stories.
- **Phase 3 US1**: Depends on Phase 2 and is the MVP.
- **Phase 4 US2**: Depends on Phase 2 and works best after US1 because verify
  requires QA mode.
- **Phase 5 US3**: Depends on Phase 2 and can run after US1 if owner defaults
  need mode config.
- **Phase 6 US4**: Depends on US1 and benefits from US3 owner criteria.
- **Phase 7 US5**: Depends on US1 through US4 to document and validate final
  behavior.
- **Phase 8 Polish**: Depends on selected user stories being implemented.

### User Story Dependencies

- **US1 Select Workflow Mode**: No story dependency after foundation.
- **US2 QA Mode Task Verification**: Depends on mode resolution from US1.
- **US3 Owner-Aware Record Discovery and Query Limits**: Depends on mode config
  from US1 for per-mode owner defaults.
- **US4 Developer Mode Bug Investigation**: Depends on US1, uses US3 owner
  criteria when available, and uses foundational media download support.
- **US5 Mode-Specific Guidance and Validation**: Depends on behavior from US1,
  US2, US3, and US4.

### Parallel Opportunities

- Setup placeholders T002 through T010 can run in parallel.
- Foundational tests T012, T014, T016, T018, T022, and T024 can run in
  parallel after their target contracts are drafted.
- Within each user story, test tasks marked [P] can run in parallel before
  implementation.
- US2 and US3 can proceed in parallel after US1 when separate implementers own
  `src/qa/` and `src/mode/owner-filter.ts`.
- US4 media/download work can proceed while US5 help docs are drafted after the
  command contracts are stable.

---

## Parallel Example: User Story 3

```text
Task: "T052 Add owner value extraction and exact visible-label matching tests in tests/unit/owner-filter.test.ts"
Task: "T053 Add query limit validation and post-criteria limiting tests in tests/unit/query-limit.test.ts"
Task: "T054 Add list command owner and limit tests in tests/integration/list.test.ts"
Task: "T055 Add search command owner and limit tests in tests/integration/search.test.ts"
Task: "T056 Add filter command owner and limit tests in tests/integration/filter.test.ts"
```

## Parallel Example: User Story 4

```text
Task: "T071 Add Developer mode triage regression tests in tests/integration/triage.test.ts"
Task: "T072 Add configure status value tests in tests/integration/configure.test.ts"
Task: "T073 Add get command full-detail tests in tests/integration/get.test.ts"
Task: "T074 Add media download command tests in tests/integration/media-download.test.ts"
Task: "T075 Add Developer mode research tests in tests/integration/research.test.ts"
```

## Parallel Example: User Story 2

```text
Task: "T038 Add QA check discovery tests in tests/unit/qa-check-discovery.test.ts"
Task: "T039 Add QA safety screening tests in tests/unit/qa-check-runner.test.ts"
Task: "T040 Add QA verification report tests in tests/unit/qa-verification-report.test.ts"
Task: "T041 Add verify command tests in tests/integration/verify.test.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 setup.
2. Complete Phase 2 foundation.
3. Complete Phase 3 User Story 1.
4. Stop and validate mode setup, mode switching, valid output, and help output.

### Incremental Delivery

1. Deliver US1 so mode state is explicit and safe.
2. Deliver US2 so QA mode has its own verification workflow.
3. Deliver US3 so owner and limit behavior are consistent across query commands.
4. Deliver US4 so Developer mode remains backward compatible and evidence
   inspection is complete before research claims.
5. Deliver US5 so humans and AI agents can discover the right workflows.

### Validation Gate

Before marking the feature complete, run and record:

```bash
pnpm test
pnpm build
pnpm format:check
pnpm quickstart:validate
```

Then run the configured live e2e checks from T105 through T109 and record
passed, failed, partial, and not-run validation in
`specs/002-mode-aware-workflows/validation-notes.md`.

## Notes

- [P] tasks touch different files or can be executed without depending on
  incomplete tasks in the same phase.
- Tests are listed before implementation tasks because the feature produces
  AI-facing output and must preserve evidence boundaries.
- Owner field and default owner are optional; missing owner field must not block
  record discovery.
- Query limit applies to list, search, filter, triage, and table-record
  discovery inside verify.
- Status values must come from field discovery or explicit configuration, not
  from simplified/traditional language guesses.
- `get` is the detail command for a selected bug record; agents must inspect
  full record content before research.
- Lark images and attachments must be downloaded through authenticated CLI
  media download, not anonymous URL fetches.
