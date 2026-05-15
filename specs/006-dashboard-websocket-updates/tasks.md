# Tasks: Dashboard Real-Time Command Updates

**Input**: Design documents from `/specs/006-dashboard-websocket-updates/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included because the implementation plan and quickstart require deterministic Vitest coverage for WebSocket delivery, runtime discovery, redaction, ordering, reconnect, and dashboard-absent CLI behavior.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and reviewed independently after the shared foundation is complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files or depends only on completed earlier phases.
- **[Story]**: Maps task to a user story phase, for example `[US1]`.
- Every task includes at least one concrete repository file path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare dependency and fixture scaffolding required by all live-update work.

- [x] T001 Add focused WebSocket runtime and type dependencies in `package.json` and `pnpm-lock.yaml`
- [x] T002 [P] Create shared WebSocket test helpers in `tests/fixtures/dashboard-live.ts`
- [x] T003 [P] Extend dashboard fixture path creation with runtime-session path support in `tests/fixtures/dashboard.ts`
- [x] T004 [P] Add placeholder-free validation evidence file for this feature in `specs/006-dashboard-websocket-updates/validation.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define shared live event contracts, runtime discovery, WebSocket hub, and best-effort command delivery before any user story depends on them.

**Critical**: No user story implementation should begin until this phase is complete.

- [x] T005 [P] Add failing unit tests for live event envelope parsing, surface mapping, sequence ordering, and redaction in `tests/unit/dashboard-live-events.test.ts`
- [x] T006 [P] Add failing unit tests for runtime session write, heartbeat, stale detection, replacement, and cleanup in `tests/unit/dashboard-live-runtime.test.ts`
- [x] T007 [P] Add failing unit tests for best-effort live client skip, timeout, rejection, and redacted delivery behavior in `tests/unit/dashboard-live-client.test.ts`
- [x] T008 Define live event enums, message schemas, surface mappings, and payload redaction helpers in `src/dashboard/live-events.ts`
- [x] T009 Export live update schema types from `src/dashboard/schemas.ts`
- [x] T010 Implement ephemeral dashboard runtime session management in `src/dashboard/live-runtime.ts`
- [x] T011 Implement best-effort command event delivery client in `src/dashboard/live-client.ts`
- [x] T012 Implement in-memory WebSocket hub, sequence assignment, broadcast, and client registry in `src/dashboard/live-server.ts`
- [x] T013 Wire live hub startup, WebSocket upgrade handling, runtime session heartbeat, and shutdown cleanup in `src/dashboard/server.ts`
- [x] T014 Add authenticated local command event ingress handling for `POST /api/live/events` in `src/dashboard/routes.ts`
- [x] T015 Verify foundational tests for `tests/unit/dashboard-live-events.test.ts`, `tests/unit/dashboard-live-runtime.test.ts`, and `tests/unit/dashboard-live-client.test.ts`

**Checkpoint**: Foundation ready. Story phases can now proceed.

---

## Phase 3: User Story 1 - See Command Activity Immediately in an Open Dashboard (Priority: P1) MVP

**Goal**: Connected dashboard views show command start and outcome activity for terminal-triggered commands and dashboard-triggered workflows without browser refresh.

**Independent Test**: Start an isolated dashboard, connect a WebSocket client, trigger a terminal command and a Playground run, and verify `command.activity` plus affected UI/API state within the required timing window.

### Tests for User Story 1

- [x] T016 [P] [US1] Add failing integration test for `live.connected`, terminal command start, terminal command outcome, and audit invalidation in `tests/integration/dashboard-live.test.ts`
- [x] T017 [P] [US1] Add failing integration test for dashboard Playground workflow start, outcome, and live activity parity in `tests/integration/dashboard-live.test.ts`
- [x] T018 [P] [US1] Add failing browser asset test for rendering connected state and command activity without manual refresh in `tests/unit/dashboard-assets.test.ts`

### Implementation for User Story 1

- [x] T019 [US1] Generate command run ids and emit start/outcome events from CLI command lifecycle in `src/cli/base-command.ts`
- [x] T020 [US1] Preserve existing command output and audit order while calling the live client from `src/cli/base-command.ts`
- [x] T021 [US1] Emit dashboard-triggered workflow start/outcome events around Playground execution in `src/dashboard/playground-service.ts`
- [x] T022 [US1] Broadcast accepted ingress events as `command.activity` and paired `state.invalidate` messages in `src/dashboard/live-server.ts`
- [x] T023 [US1] Add browser WebSocket connection bootstrap and live activity state in `src/dashboard/assets.ts`
- [x] T024 [US1] Add affected-surface API reload handling for Overview and Audit summaries in `src/dashboard/assets.ts`
- [x] T025 [US1] Verify User Story 1 tests in `tests/integration/dashboard-live.test.ts` and `tests/unit/dashboard-assets.test.ts`

**Checkpoint**: User Story 1 is independently functional and is the suggested MVP.

---

## Phase 4: User Story 2 - Keep Every Dashboard Function Fresh (Priority: P1)

**Goal**: All seven dashboard pages refresh their relevant visible state when command activity changes config, auth, audit, playground, research, source table, readiness, or overview facts.

**Independent Test**: Open each primary dashboard page, trigger a command or dashboard action that changes its backing state, and verify the page updates without route changes or manual refresh.

### Tests for User Story 2

- [ ] T026 [P] [US2] Add failing integration tests for config, auth, audit, playground, research, table, and overview invalidation events in `tests/integration/dashboard-live.test.ts`
- [ ] T027 [P] [US2] Add failing browser asset tests for preserving filters, selected detail, response tab, selected report, active data tab, and scroll position in `tests/unit/dashboard-assets.test.ts`
- [x] T028 [P] [US2] Add failing browser asset tests for preserving unsaved configuration drafts during live refresh in `tests/unit/dashboard-assets.test.ts`

### Implementation for User Story 2

- [x] T029 [US2] Complete surface-to-resource mappings for `shell`, `overview`, `config`, `auth`, `audit`, `playground`, `research`, and `table` in `src/dashboard/live-events.ts`
- [ ] T030 [US2] Publish invalidation events after config save, auth start, auth logout, Playground run, table schema, table records, audit, and research route mutations in `src/dashboard/routes.ts`
- [x] T031 [US2] Add page-specific live refresh dispatch for all seven dashboard pages in `src/dashboard/assets.ts`
- [ ] T032 [US2] Preserve Configuration route, scroll position, focus, and unsaved draft fields during live refresh in `src/dashboard/assets.ts`
- [x] T033 [US2] Preserve Audit filters and selected detail during live refresh in `src/dashboard/assets.ts`
- [x] T034 [US2] Preserve Playground command selection, parameter drafts, response tab, and run history during live refresh in `src/dashboard/assets.ts`
- [x] T035 [US2] Preserve Research selected report and unavailable report state during live refresh in `src/dashboard/assets.ts`
- [x] T036 [US2] Preserve Source Table active tab, filters, and rendered blocked or empty state during live refresh in `src/dashboard/assets.ts`
- [ ] T037 [US2] Verify User Story 2 tests in `tests/integration/dashboard-live.test.ts` and `tests/unit/dashboard-assets.test.ts`

**Checkpoint**: User Story 2 is independently functional after the foundation and US1 live activity layer.

---

## Phase 5: User Story 3 - Preserve Normal CLI Behavior When Dashboard Is Not Running (Priority: P1)

**Goal**: CLI commands behave exactly like normal commands when the dashboard service is absent, stale, unreachable, or stopped during a run.

**Independent Test**: Stop the dashboard, run representative CLI commands, and verify no dashboard update warning, prompt, or primary command failure is produced.

### Tests for User Story 3

- [x] T038 [P] [US3] Add failing integration tests for dashboard-absent `valid`, `research`, and failed-command runs in `tests/integration/dashboard-live.test.ts`
- [x] T039 [P] [US3] Add failing integration test for dashboard service stopping during a command run in `tests/integration/dashboard-live.test.ts`
- [x] T040 [P] [US3] Add failing unit tests for stale runtime file, unreachable origin, invalid token, and silent skip behavior in `tests/unit/dashboard-live-client.test.ts`

### Implementation for User Story 3

- [x] T041 [US3] Implement missing, stale, unreachable, rejected, and timeout delivery results as silent no-ops in `src/dashboard/live-client.ts`
- [x] T042 [US3] Ensure stale runtime discovery never scans arbitrary ports or prompts users in `src/dashboard/live-runtime.ts`
- [x] T043 [US3] Ensure live delivery errors never write user-visible stdout or stderr warnings in `src/cli/base-command.ts`
- [x] T044 [US3] Ensure live delivery failures never change command status, issues, evidence, or audit entry payloads in `src/cli/base-command.ts`
- [x] T045 [US3] Load current persisted state on dashboard startup without claiming missed live delivery in `src/dashboard/assets.ts`
- [x] T046 [US3] Verify User Story 3 tests in `tests/integration/dashboard-live.test.ts` and `tests/unit/dashboard-live-client.test.ts`

**Checkpoint**: User Story 3 is independently functional and protects non-dashboard CLI users.

---

## Phase 6: User Story 4 - Trust Live Updates Across Connections and Failures (Priority: P2)

**Goal**: Multiple browser tabs converge on the same final facts, stale or reconnecting state is visible, and overlapping commands cannot replace newer facts with older updates.

**Independent Test**: Connect multiple WebSocket clients, trigger overlapping commands, disconnect and reconnect one client, and verify ordering, stale indicator, catch-up, and final convergence.

### Tests for User Story 4

- [x] T047 [P] [US4] Add failing integration tests for two connected clients receiving the same final command activity in `tests/integration/dashboard-live.test.ts`
- [ ] T048 [P] [US4] Add failing integration tests for overlapping command ordering and stale sequence protection in `tests/integration/dashboard-live.test.ts`
- [ ] T049 [P] [US4] Add failing browser asset tests for stale, reconnecting, catch-up, and fallback UI states in `tests/unit/dashboard-assets.test.ts`

### Implementation for User Story 4

- [ ] T050 [US4] Add stale sequence and out-of-order event protections in `src/dashboard/live-server.ts`
- [x] T051 [US4] Add server heartbeat, inactive client cleanup, and reconnect catch-up messages in `src/dashboard/live-server.ts`
- [x] T052 [US4] Implement safe `client.view-state` parsing and diagnostics in `src/dashboard/live-server.ts`
- [x] T053 [US4] Implement browser stale, reconnecting, fallback, and catch-up UI state in `src/dashboard/assets.ts`
- [x] T054 [US4] Ensure reconnect catch-up reloads current API state before clearing stale indicators in `src/dashboard/assets.ts`
- [ ] T055 [US4] Verify User Story 4 tests in `tests/integration/dashboard-live.test.ts` and `tests/unit/dashboard-assets.test.ts`

**Checkpoint**: All user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, redaction hardening, final validation, and evidence recording across all stories.

- [x] T056 [P] Add live payload redaction regression tests for token-like values, auth headers, app secrets, and authorization codes in `tests/unit/dashboard-redaction.test.ts`
- [x] T057 [P] Update dashboard help text for live updates and dashboard-absent behavior in `src/cli/commands/help.ts`
- [x] T058 [P] Update bootstrap skill dashboard guidance for live updates in `src/bootstrap/skill/SKILL.md`
- [x] T059 [P] Update dashboard usage documentation in `README.md`
- [x] T060 Run repository formatting via the script in `package.json`
- [x] T061 Run `pnpm test` and record command output summary in `specs/006-dashboard-websocket-updates/validation.md`
- [x] T062 Run `pnpm build` and record command output summary in `specs/006-dashboard-websocket-updates/validation.md`
- [x] T063 Run `pnpm format:check` and record command output summary in `specs/006-dashboard-websocket-updates/validation.md`
- [x] T064 Audit implementation against `specs/006-dashboard-websocket-updates/contracts/dashboard-live-contract.md`
- [x] T065 Audit implementation against `specs/006-dashboard-websocket-updates/contracts/command-event-ingress-contract.md`
- [x] T066 Audit implementation against `specs/006-dashboard-websocket-updates/contracts/browser-live-ui-contract.md`
- [ ] T067 Execute quickstart browser evidence steps and record pass, fail, or blocked results in `specs/006-dashboard-websocket-updates/validation.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **User Stories (Phases 3-6)**: Depend on Foundational completion.
- **Polish (Phase 7)**: Depends on all user stories selected for implementation.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational. This is the MVP because it proves the live channel, command activity, terminal trigger, dashboard trigger, and first visible page updates.
- **User Story 2 (P1)**: Starts after Foundational and can proceed after or alongside US1 once the shared live event layer exists. It uses the same event bus but expands page-specific coverage.
- **User Story 3 (P1)**: Starts after Foundational and can proceed in parallel with US1/US2 because it focuses on dashboard-absent CLI behavior and live client no-op semantics.
- **User Story 4 (P2)**: Starts after US1 establishes core live activity behavior because it hardens multi-client ordering, stale state, and reconnect catch-up.

### Within Each User Story

- Write story tests first and confirm they fail before implementation.
- Implement shared models and services before route or browser integration.
- Preserve redaction and evidence boundaries before exposing any event in UI.
- Verify the story-specific test set before moving to the next story.
- Record validation evidence before making completion claims.

---

## Parallel Opportunities

- Setup tasks T002, T003, and T004 can run in parallel after T001 is understood.
- Foundational test tasks T005, T006, and T007 can run in parallel.
- US1 tests T016, T017, and T018 can run in parallel.
- US2 tests T026, T027, and T028 can run in parallel.
- US3 tests T038, T039, and T040 can run in parallel.
- US4 tests T047, T048, and T049 can run in parallel.
- Polish docs tasks T057, T058, and T059 can run in parallel.
- Different user stories can be staffed in parallel after Phase 2, with US4 waiting for the core US1 event behavior.

## Parallel Example: User Story 1

```bash
Task: "T016 [P] [US1] Add failing integration test for live.connected, terminal command start, terminal command outcome, and audit invalidation in tests/integration/dashboard-live.test.ts"
Task: "T017 [P] [US1] Add failing integration test for dashboard Playground workflow start, outcome, and live activity parity in tests/integration/dashboard-live.test.ts"
Task: "T018 [P] [US1] Add failing browser asset test for rendering connected state and command activity without manual refresh in tests/unit/dashboard-assets.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "T026 [P] [US2] Add failing integration tests for config, auth, audit, playground, research, table, and overview invalidation events in tests/integration/dashboard-live.test.ts"
Task: "T027 [P] [US2] Add failing browser asset tests for preserving filters, selected detail, response tab, selected report, active data tab, and scroll position in tests/unit/dashboard-assets.test.ts"
Task: "T028 [P] [US2] Add failing browser asset tests for preserving unsaved configuration drafts during live refresh in tests/unit/dashboard-assets.test.ts"
```

## Parallel Example: User Story 3

```bash
Task: "T038 [P] [US3] Add failing integration tests for dashboard-absent valid, research, and failed-command runs in tests/integration/dashboard-live.test.ts"
Task: "T039 [P] [US3] Add failing integration test for dashboard service stopping during a command run in tests/integration/dashboard-live.test.ts"
Task: "T040 [P] [US3] Add failing unit tests for stale runtime file, unreachable origin, invalid token, and silent skip behavior in tests/unit/dashboard-live-client.test.ts"
```

## Parallel Example: User Story 4

```bash
Task: "T047 [P] [US4] Add failing integration tests for two connected clients receiving the same final command activity in tests/integration/dashboard-live.test.ts"
Task: "T048 [P] [US4] Add failing integration tests for overlapping command ordering and stale sequence protection in tests/integration/dashboard-live.test.ts"
Task: "T049 [P] [US4] Add failing browser asset tests for stale, reconnecting, catch-up, and fallback UI states in tests/unit/dashboard-assets.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundation.
3. Complete Phase 3 User Story 1.
4. Run the US1 tests listed in T025.
5. Demonstrate a connected dashboard receiving command activity from both terminal and Playground without browser refresh.

### Incremental Delivery

1. Complete Setup and Foundational phases.
2. Deliver US1 for core live activity.
3. Deliver US3 to guarantee dashboard-absent CLI behavior remains clean.
4. Deliver US2 to expand live refresh across all dashboard pages.
5. Deliver US4 to harden multi-tab, ordering, stale, and reconnect behavior.
6. Complete Polish and record validation evidence.

### Parallel Team Strategy

1. One developer owns Phase 2 live event schemas, runtime session, and server hub.
2. One developer owns US1/US2 browser asset refresh behavior in `src/dashboard/assets.ts`.
3. One developer owns US3 CLI lifecycle and best-effort delivery in `src/cli/base-command.ts` and `src/dashboard/live-client.ts`.
4. One developer owns US4 WebSocket ordering/reconnect behavior in `src/dashboard/live-server.ts`.
5. Each developer runs the relevant focused tests before integration.

## Notes

- `[P]` means the task can be worked on in parallel after its phase dependencies are satisfied.
- `[US1]`, `[US2]`, `[US3]`, and `[US4]` map directly to user stories in [spec.md](./spec.md).
- Live events are notifications and invalidation hints; existing HTTP APIs remain the source of truth.
- Dashboard-absent delivery must remain silent and must never alter command status, output, issues, evidence, or audit payloads.
- Completion claims require fresh evidence from the validation tasks in Phase 7.
