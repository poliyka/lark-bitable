# Tasks: Write Command for Bitable Content

**Input**: Design documents from `/specs/003-add-write-command/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cli-contract.md, quickstart.md

**Tests**: Included because the plan and quickstart require deterministic Vitest unit/integration coverage for parsing, validation, Lark transport calls, preview-only behavior, result classification, redaction, and existing workflow regressions.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. User Story 1 is the MVP because it proves the new `write` command can safely add table content.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other marked tasks in the same phase because it touches different files or depends only on completed prior phases.
- **[Story]**: Maps tasks to user stories from [spec.md](./spec.md): [US1] Add Table Content, [US2] Edit Existing Table Content, [US3] Review Writes Before Committing, [US4] Handle Write Failures Safely.
- Every task includes exact repository-relative file paths.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the write-command implementation and test locations without changing behavior yet.

- [x] T001 Create the write module files `src/write/field-input.ts`, `src/write/operation.ts`, `src/write/readiness.ts`, and `src/write/result.ts` with exported placeholders matching the plan structure.
- [x] T002 [P] Create write fixtures in `tests/fixtures/write.ts` and export them from `tests/fixtures/index.ts`.
- [x] T003 [P] Create the oCLIF command shell in `src/cli/commands/write.ts` with planned flags `--op`, `--record-id`, `--field`, `--fields-json`, `--confirm`, `--client-token`, `--auth-path`, and `--config-cwd`.
- [x] T004 [P] Add `write` to the command discovery/help command list in `src/cli/commands/help.ts`.
- [x] T005 [P] Add empty write test files `tests/unit/write-field-input.test.ts`, `tests/unit/write-operation.test.ts`, `tests/unit/write-readiness.test.ts`, `tests/unit/write-result.test.ts`, and `tests/integration/write.test.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared parsing, validation, schemas, result classification, and Lark transport support required by every user story.

**Critical**: No user story work can begin until this phase is complete.

- [x] T006 [P] Add failing field input parser tests for repeated `--field`, JSON scalar parsing, `--fields-json`, malformed JSON, empty field names, and duplicate fields in `tests/unit/write-field-input.test.ts`.
- [x] T007 [P] Add failing operation validation tests for create/update mode, required record id, invalid create record id, invalid client token usage, empty requested fields, and unsupported operation combinations in `tests/unit/write-operation.test.ts`.
- [x] T008 [P] Add failing write result classifier tests for `not-written`, `confirmed`, `failed`, `partial`, and `unknown` outcomes in `tests/unit/write-result.test.ts`.
- [x] T009 [P] Add failing Lark client transport tests for `createRecord` and `updateRecord` SDK payloads, auth headers, source metadata, client token, and normalized `BitableRecord` output in `tests/unit/lark-client.test.ts`.
- [x] T010 Add write schemas and exported TypeScript types for Write Operation, Field Change, Write Preview, Write Result, Write Readiness, and Write Evidence in `src/config/schema.ts`.
- [x] T011 Implement field assignment parsing and duplicate detection in `src/write/field-input.ts`.
- [x] T012 Implement write operation construction and validation in `src/write/operation.ts`.
- [x] T013 Implement write result classification, evidence shaping, next actions, and secret-safe issue conversion in `src/write/result.ts`.
- [x] T014 Extend `LarkClientTransport`, `createLarkSdkTransport`, and `LarkClient` with single-record `createRecord` and `updateRecord` methods in `src/lark/client.ts`.
- [x] T015 Implement shared write prerequisite loading for auth, source, mode, fields, target record, and table metadata in `src/write/readiness.ts`.
- [x] T016 Wire foundational write parsing and preview validation into the command shell in `src/cli/commands/write.ts`.
- [x] T017 Run foundational tests with `pnpm test -- tests/unit/write-field-input.test.ts tests/unit/write-operation.test.ts tests/unit/write-result.test.ts tests/unit/lark-client.test.ts` and fix failures in `src/write/field-input.ts`, `src/write/operation.ts`, `src/write/result.ts`, `src/lark/client.ts`, and `src/config/schema.ts`.

**Checkpoint**: Foundation ready. The write command can parse and validate requests, classify results, and call mocked Lark create/update paths, but user-story behavior is not complete yet.

---

## Phase 3: User Story 1 - Add Table Content (Priority: P1) - MVP

**Goal**: A user can preview and commit creation of one new Bitable record from supplied field values, then receive the created record id and written fields.

**Independent Test**: With mocked auth/source/table fields and a create transport, run create preview and committed create flows from `tests/integration/write.test.ts`; preview performs no write, committed create returns one created record id and written fields.

### Tests for User Story 1

- [x] T018 [P] [US1] Add failing integration test for create preview with `--op create --field` and no `--confirm` in `tests/integration/write.test.ts`.
- [x] T019 [US1] Add failing integration test for committed create with `--op create --fields-json --client-token --confirm --json` in `tests/integration/write.test.ts`.
- [x] T020 [P] [US1] Add create-specific result assertions for created record id, written fields, client token, and source metadata in `tests/unit/write-result.test.ts`.

### Implementation for User Story 1

- [x] T021 [US1] Implement create preview orchestration in `src/cli/commands/write.ts` using parsed fields and field metadata from `src/write/operation.ts`.
- [x] T022 [US1] Implement committed create orchestration, generated or supplied client token, and single-record Lark create call in `src/cli/commands/write.ts`.
- [x] T023 [US1] Implement create result evidence and created-record field status mapping in `src/write/result.ts`.
- [x] T024 [US1] Add create usage, preview, confirm, client-token, and output examples to the `write` help entry in `src/cli/commands/help.ts`.
- [x] T025 [US1] Add create workflow documentation and permission cautions in `README.md`.
- [x] T026 [US1] Run User Story 1 tests with `pnpm test -- tests/integration/write.test.ts tests/unit/write-result.test.ts` and fix failures in `src/cli/commands/write.ts`, `src/write/operation.ts`, and `src/write/result.ts`.

**Checkpoint**: User Story 1 is independently functional as the MVP.

---

## Phase 4: User Story 2 - Edit Existing Table Content (Priority: P1)

**Goal**: A user can preview and commit updates to selected fields on one existing Bitable record while preserving unrelated fields.

**Independent Test**: With mocked target record data and update transport, run update preview and committed update flows from `tests/integration/write.test.ts`; only requested fields change, unrelated fields remain untouched, and output shows target record id plus changed/unchanged field status.

### Tests for User Story 2

- [x] T027 [P] [US2] Add failing integration test for update preview with before values and no `--confirm` in `tests/integration/write.test.ts`.
- [x] T028 [US2] Add failing integration test for committed update that changes one field and preserves unrelated fields in `tests/integration/write.test.ts`.
- [x] T029 [US2] Add failing integration test for inaccessible or missing target record during update in `tests/integration/write.test.ts`.
- [x] T030 [P] [US2] Add unit tests for changed versus unchanged field comparison in `tests/unit/write-result.test.ts`.

### Implementation for User Story 2

- [x] T031 [US2] Implement update target record loading and before-value field change planning in `src/write/operation.ts`.
- [x] T032 [US2] Implement committed update orchestration and single-record Lark update call in `src/cli/commands/write.ts`.
- [x] T033 [US2] Implement before/after result comparison, unchanged field status, and target record evidence in `src/write/result.ts`.
- [x] T034 [US2] Add update usage, preview, confirm, record-not-found, and unchanged-field examples to `src/cli/commands/help.ts` and `README.md`.
- [x] T035 [US2] Run User Story 2 tests with `pnpm test -- tests/integration/write.test.ts tests/unit/write-result.test.ts` and fix failures in `src/write/operation.ts`, `src/cli/commands/write.ts`, and `src/write/result.ts`.

**Checkpoint**: User Stories 1 and 2 both work independently for create and update operations.

---

## Phase 5: User Story 3 - Review Writes Before Committing (Priority: P2)

**Goal**: A user or AI agent can inspect planned create/update operations safely, and non-interactive requests never mutate table content without explicit commitment.

**Independent Test**: Run create and update preview-only flows without `--confirm` and assert no create/update transport method is called, output reports `confirmationStatus=not-written`, and the next safe action explains how to commit intentionally.

### Tests for User Story 3

- [x] T036 [P] [US3] Add failing preview-only tests proving create/update transports are not called without `--confirm` in `tests/unit/write-operation.test.ts`.
- [x] T037 [US3] Add failing integration test for non-interactive no-commit output and next safe action in `tests/integration/write.test.ts`.
- [x] T038 [P] [US3] Add failing tests for duplicate field inputs and invalid `--client-token` on update in `tests/unit/write-field-input.test.ts` and `tests/unit/write-operation.test.ts`.

### Implementation for User Story 3

- [x] T039 [US3] Enforce preview-default behavior, `--confirm` gating, and no-mutation execution order in `src/cli/commands/write.ts`.
- [x] T040 [US3] Add preview-specific structured result fields, warnings, and next safe actions in `src/write/result.ts`.
- [x] T041 [US3] Add AI-agent preview-before-confirm guidance for write operations in `src/bootstrap/skill/SKILL.md`.
- [x] T042 [US3] Run User Story 3 tests with `pnpm test -- tests/unit/write-operation.test.ts tests/unit/write-field-input.test.ts tests/integration/write.test.ts` and fix failures in `src/cli/commands/write.ts`, `src/write/result.ts`, `src/write/operation.ts`, and `src/write/field-input.ts`.

**Checkpoint**: Review-before-commit behavior is enforced across create and update flows.

---

## Phase 6: User Story 4 - Handle Write Failures Safely (Priority: P2)

**Goal**: A user receives actionable, evidence-backed failure output for missing setup, missing permission, invalid fields, invalid values, inaccessible records, partial outcomes, and unknown final state.

**Independent Test**: Run failure flows against mocked missing auth/source, read-only permission, unknown fields, rejected values, missing target record, and confirmation-read failure; output must not claim unverified success and must include remediation.

### Tests for User Story 4

- [x] T043 [P] [US4] Add failing write readiness tests for missing auth, missing source, field discovery failure, and unverified write permission in `tests/unit/write-readiness.test.ts`.
- [x] T044 [US4] Add failing integration tests for missing auth, missing source, unknown field, Lark permission rejection, Lark value rejection, and confirmation-read failure in `tests/integration/write.test.ts`.
- [x] T045 [P] [US4] Add failing valid-command tests for `--workflow write` in `tests/integration/valid.test.ts`.

### Implementation for User Story 4

- [x] T046 [US4] Implement write readiness classification and remediation generation in `src/write/readiness.ts`.
- [x] T047 [US4] Extend `Workflow`, `checkReadiness`, ready command selection, and `valid --workflow write` support in `src/config/readiness.ts` and `src/cli/commands/valid.ts`.
- [x] T048 [US4] Map Lark permission errors, invalid field/value errors, target-record errors, and unknown confirmation failures to redacted write issues in `src/cli/commands/write.ts` and `src/write/result.ts`.
- [x] T049 [US4] Add write failure help, permission remediation, and unsupported-operation guidance in `src/cli/commands/help.ts`, `README.md`, and `src/bootstrap/skill/SKILL.md`.
- [x] T050 [US4] Run User Story 4 tests with `pnpm test -- tests/unit/write-readiness.test.ts tests/integration/write.test.ts tests/integration/valid.test.ts` and fix failures in `src/write/readiness.ts`, `src/config/readiness.ts`, `src/cli/commands/valid.ts`, `src/cli/commands/write.ts`, and `src/write/result.ts`.

**Checkpoint**: Failure and unknown-outcome paths are safe, auditable, and do not claim unsupported success.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final documentation, regression checks, quickstart validation, and evidence-boundary review across all stories.

- [x] T051 [P] Update quickstart validation expectations for the write command in `scripts/quickstart-validate.ts` and `specs/003-add-write-command/quickstart.md`.
- [x] T052 [P] Add or update export/import coverage for write fixtures in `tests/fixtures/write.ts` and `tests/fixtures/index.ts`.
- [x] T053 Run focused write tests with `pnpm test -- tests/unit/write-field-input.test.ts tests/unit/write-operation.test.ts tests/unit/write-readiness.test.ts tests/unit/write-result.test.ts tests/unit/lark-client.test.ts tests/integration/write.test.ts tests/integration/valid.test.ts` and fix failures in the listed test and source paths.
- [x] T054 Run full regression tests with `pnpm test` and fix regressions in `src/cli/commands/list.ts`, `src/cli/commands/get.ts`, `src/cli/commands/filter.ts`, `src/cli/commands/search.ts`, `src/cli/commands/triage.ts`, `src/cli/commands/research.ts`, `src/cli/commands/verify.ts`, `src/lark/client.ts`, and `src/write/`.
- [x] T055 Run TypeScript build with `pnpm build` and fix compile errors in `src/write/`, `src/cli/commands/write.ts`, `src/lark/client.ts`, `src/config/schema.ts`, `src/config/readiness.ts`, and `src/cli/commands/valid.ts`.
- [x] T056 Run formatting check with `pnpm format:check` and format changed files under `src/write/`, `src/cli/commands/`, `src/config/`, `src/lark/`, `tests/`, `README.md`, and `src/bootstrap/skill/SKILL.md`.
- [x] T057 Run quickstart validation with `pnpm quickstart:validate` and fix mismatches in `scripts/quickstart-validate.ts`, `README.md`, `src/bootstrap/skill/SKILL.md`, and `specs/003-add-write-command/quickstart.md`.
- [x] T058 Audit AI-facing write outputs for unsupported claims, fact/assumption separation, redaction, and unknown-state wording in `tests/integration/write.test.ts`, `src/cli/output.ts`, `src/write/result.ts`, and `src/bootstrap/skill/SKILL.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational; MVP create flow.
- **User Story 2 (Phase 4)**: Depends on Foundational; can start after shared write operation support exists, but full integration is easier after US1 command plumbing is in place.
- **User Story 3 (Phase 5)**: Depends on Foundational and benefits from US1/US2 paths for full create/update preview validation.
- **User Story 4 (Phase 6)**: Depends on Foundational and can be developed alongside US1/US2 once write command error surfaces exist.
- **Polish (Phase 7)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: MVP. No dependency on other stories after Foundational.
- **User Story 2 (P1)**: No business dependency on US1, but reuses command and result plumbing established by Foundational and may reuse US1 command adapter patterns.
- **User Story 3 (P2)**: Cross-operation preview policy; validates both create and update flows, so complete after US1 and US2 for full coverage.
- **User Story 4 (P2)**: Cross-cutting failure safety; can start after Foundational, then integrate with completed create/update paths.

### Within Each User Story

- Tests must be written before implementation tasks in the story phase.
- Parser/schema/client foundations before command orchestration.
- Command orchestration before help/docs examples.
- Result evidence and redaction before completion claims.
- Story-specific verification command before moving to the next story.

## Parallel Opportunities

- Setup tasks T002, T003, T004, and T005 can run in parallel after T001 planning context is understood.
- Foundational tests T006, T007, T008, and T009 can run in parallel because they target different test scopes.
- Foundational implementation T011, T012, T013, T014, and T015 can be split by module after T010 defines shared schemas.
- US1 tests T018 and T020 can run in parallel; T019 shares `tests/integration/write.test.ts` with T018 and should be coordinated.
- US2 tests T027 and T030 can run in parallel; T028/T029 share `tests/integration/write.test.ts` and should be coordinated.
- US3 tests T036 and T038 can run in parallel because they target different parser/operation concerns.
- US4 tests T043 and T045 can run in parallel; T044 shares the integration write test file and should be coordinated.
- Polish docs/validation tasks T051 and T052 can run in parallel before the final command runs.

## Parallel Example: User Story 1

```bash
Task: "T018 [US1] Add failing integration test for create preview in tests/integration/write.test.ts"
Task: "T020 [US1] Add create-specific result assertions in tests/unit/write-result.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "T027 [US2] Add failing integration test for update preview in tests/integration/write.test.ts"
Task: "T030 [US2] Add unit tests for changed versus unchanged fields in tests/unit/write-result.test.ts"
```

## Parallel Example: User Story 3

```bash
Task: "T036 [US3] Add preview-only no-transport tests in tests/unit/write-operation.test.ts"
Task: "T038 [US3] Add duplicate field and invalid client-token tests in tests/unit/write-field-input.test.ts and tests/unit/write-operation.test.ts"
```

## Parallel Example: User Story 4

```bash
Task: "T043 [US4] Add write readiness tests in tests/unit/write-readiness.test.ts"
Task: "T045 [US4] Add valid --workflow write tests in tests/integration/valid.test.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Stop and validate create preview and committed create independently with `pnpm test -- tests/integration/write.test.ts tests/unit/write-result.test.ts`.
5. Demo `lark-bitable write --op create` preview and `--confirm` behavior against mocked tests before any live Bitable write.

### Incremental Delivery

1. Setup + Foundational: parser, schemas, Lark transport, command shell, result classifier.
2. US1: create preview and commit.
3. US2: update preview and commit.
4. US3: enforce preview/confirm policy across all writes.
5. US4: harden readiness, permission errors, invalid input, and unknown outcomes.
6. Polish: full regression, build, format, quickstart validation, evidence-boundary audit.

### Parallel Team Strategy

1. One person owns `src/lark/client.ts` and `tests/unit/lark-client.test.ts`.
2. One person owns `src/write/field-input.ts` and `tests/unit/write-field-input.test.ts`.
3. One person owns `src/write/operation.ts`, `src/write/result.ts`, and corresponding unit tests.
4. One person owns `src/cli/commands/write.ts` and `tests/integration/write.test.ts`.
5. Coordinate edits to `src/cli/commands/help.ts`, `README.md`, and `src/bootstrap/skill/SKILL.md` to avoid overlapping documentation changes.

## Notes

- `[P]` tasks use different files or independent test scopes and can be parallelized after their dependencies are complete.
- `[US1]` and `[US2]` are both P1; US1 is the suggested MVP because it creates the first usable write path.
- The first implementation must not add delete, batch write, upsert, schema mutation, view mutation, or permission management behavior.
- Live write validation must use a disposable test Base and must not be represented as passed unless the command output is captured and reviewed.
