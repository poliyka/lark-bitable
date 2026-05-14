# Tasks: Dashboard Command for Local UI

**Input**: Design documents from `/specs/004-add-dashboard-command/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md),
[research.md](./research.md), [data-model.md](./data-model.md),
[quickstart.md](./quickstart.md), [contracts/](./contracts/)

**Tests**: Included because the plan and constitution require deterministic
Vitest coverage for port selection, local HTTP contracts, redaction, audit
query behavior, research persistence/linking, dashboard command output,
playground safety, and language preference behavior.

**Organization**: Tasks are grouped by user story so each story can be
implemented and tested independently after the shared foundation is complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and does not
  depend on incomplete tasks.
- **[Story]**: User story label for traceability. Setup, foundational, and
  polish tasks intentionally omit story labels.
- Every task includes exact file paths.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add skeleton files and fixtures needed by later story phases.

- [x] T001 [P] Create dashboard schema module skeleton in `src/dashboard/schemas.ts`
- [x] T002 [P] Create dashboard fixture helpers for HTTP and config tests in `tests/fixtures/dashboard.ts`
- [x] T003 [P] Extend research fixture helpers for canonical report tests in `tests/fixtures/research.ts`
- [x] T004 [P] Create dashboard HTTP integration test skeleton in `tests/integration/dashboard-http.test.ts`
- [x] T005 [P] Create dashboard command integration test skeleton in `tests/integration/dashboard-command.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared schemas, HTTP infrastructure, redaction, assets, and command
execution boundaries that every dashboard page depends on.

**Critical**: No user story work should begin until this phase is complete.

- [x] T006 Add dashboard binding, API envelope, audit query, playground run, language preference, and research report schemas in `src/dashboard/schemas.ts`
- [x] T007 Extend persisted research report schemas and exported types in `src/config/schema.ts`
- [x] T008 [P] Implement dashboard API response and error envelope helpers in `src/dashboard/api.ts`
- [x] T009 Implement dashboard secret redaction helpers for API and UI payloads in `src/dashboard/api.ts`
- [x] T010 [P] Implement dashboard asset response helpers for HTML, CSS, and JavaScript in `src/dashboard/assets.ts`
- [x] T011 Implement local HTTP route dispatcher with JSON parsing and method checks in `src/dashboard/routes.ts`
- [x] T012 Implement local HTTP server lifecycle with start, stop, and request handling in `src/dashboard/server.ts`
- [x] T013 Implement safe command invocation boundary for dashboard workflows in `src/dashboard/command-runner.ts`
- [x] T014 [P] Add unit coverage for dashboard API envelopes and redaction in `tests/unit/dashboard-redaction.test.ts`
- [x] T015 [P] Add unit coverage for dashboard schema validation in `tests/unit/dashboard-schemas.test.ts`
- [x] T016 Update exported command/help command list to reserve `dashboard` in `src/cli/commands/help.ts`

**Checkpoint**: Foundation ready. User story phases can now proceed.

---

## Phase 3: User Story 1 - Start a Local Dashboard Without Web Login (Priority: P1) MVP

**Goal**: A user can run `lark-bitable dashboard`, get a local URL, and open the
dashboard without any dashboard/web login.

**Independent Test**: Start the dashboard command, verify default port `48731`
or the next available port, open `GET /`, and confirm no dashboard login is
required.

### Tests for User Story 1

- [x] T017 [P] [US1] Add port selection unit tests for default port, occupied port increment, and bind failure in `tests/unit/dashboard-port.test.ts`
- [x] T018 [P] [US1] Add dashboard server route integration tests for `GET /`, `/assets/app.js`, `/assets/styles.css`, and `/api/status` in `tests/integration/dashboard-http.test.ts`
- [x] T019 [P] [US1] Add dashboard command JSON startup tests for `--no-open`, selected port, local-only flag, and no-login flag in `tests/integration/dashboard-command.test.ts`

### Implementation for User Story 1

- [x] T020 [US1] Implement port probing and incrementing from `48731` in `src/dashboard/port.ts`
- [x] T021 [US1] Implement dashboard service binding creation and runtime evidence in `src/dashboard/server.ts`
- [x] T022 [US1] Implement `GET /api/status` with service binding and basic overview payload in `src/dashboard/routes.ts`
- [x] T023 [US1] Implement first-pass dashboard HTML, CSS, and JavaScript shell with no login screen in `src/dashboard/assets.ts`
- [x] T024 [US1] Implement `dashboard` oCLIF command with `--port`, `--host`, `--no-open`, and `--json` flags in `src/cli/commands/dashboard.ts`
- [x] T025 [US1] Integrate browser opening and partial status when open fails in `src/cli/commands/dashboard.ts`
- [x] T026 [US1] Add dashboard command help entry, examples, and global workflow guidance in `src/cli/commands/help.ts`

**Checkpoint**: User Story 1 is independently usable as the MVP.

---

## Phase 4: User Story 2 - Live Fix Configuration (Priority: P1)

**Goal**: A user can view, edit, save, and validate Lark Bitable configuration
from the dashboard without restarting the service.

**Independent Test**: Open configuration, save a corrected draft, run readiness,
and verify later dashboard actions use the latest saved config.

### Tests for User Story 2

- [x] T027 [P] [US2] Add configuration service tests for redacted draft loading, save validation, and app secret state in `tests/unit/dashboard-config-service.test.ts`
- [x] T028 [P] [US2] Add HTTP tests for `GET /api/config` and `POST /api/config` success and validation failures in `tests/integration/dashboard-http.test.ts`

### Implementation for User Story 2

- [x] T029 [US2] Implement redacted configuration draft loading from `ConfigStore` in `src/dashboard/config-service.ts`
- [x] T030 [US2] Implement configuration draft save, source URL parsing, workflow mode updates, and secret preservation in `src/dashboard/config-service.ts`
- [x] T031 [US2] Implement `GET /api/config` and `POST /api/config` routes in `src/dashboard/routes.ts`
- [x] T032 [US2] Wire readiness validation after configuration changes through `checkReadiness` in `src/dashboard/config-service.ts`
- [x] T033 [US2] Add configuration page controls and validation rendering in `src/dashboard/assets.ts`
- [x] T034 [US2] Ensure configuration save and validation responses redact app secrets in `src/dashboard/api.ts`

**Checkpoint**: User Story 2 can be tested independently from the dashboard
configuration page.

---

## Phase 5: User Story 3 - Live Lark Login (Priority: P1)

**Goal**: A user can start Lark login, observe waiting/completed/canceled/failed
states, and logout from the dashboard.

**Independent Test**: Start from missing or expired auth, initiate login, complete
or cancel the flow, and verify dashboard auth state updates without exposing
tokens.

### Tests for User Story 3

- [x] T035 [P] [US3] Add auth service tests for safe auth status, login flow states, cancel/failure handling, and logout in `tests/unit/dashboard-auth-service.test.ts`
- [x] T036 [P] [US3] Add HTTP tests for `/api/auth/login/start`, `/api/auth/login/:flowId`, and `/api/auth/logout` in `tests/integration/dashboard-http.test.ts`

### Implementation for User Story 3

- [x] T037 [US3] Implement safe auth status projection from `AuthStore` and Lark auth helpers in `src/dashboard/auth-service.ts`
- [x] T038 [US3] Implement dashboard-managed Lark login flow state and local callback integration in `src/dashboard/auth-service.ts`
- [x] T039 [US3] Implement logout flow and auth state refresh in `src/dashboard/auth-service.ts`
- [x] T040 [US3] Implement auth login, login status, and logout routes in `src/dashboard/routes.ts`
- [x] T041 [US3] Add auth page controls, status polling, and remediation rendering in `src/dashboard/assets.ts`
- [x] T042 [US3] Ensure auth responses never expose access tokens, refresh tokens, authorization codes, or app secrets in `src/dashboard/api.ts`

**Checkpoint**: User Story 3 can be tested independently from the dashboard auth
page.

---

## Phase 6: User Story 4 - Query and Inspect Audit Logs (Priority: P1)

**Goal**: A user can search audit command history, filter results, and inspect
sanitized details without leaking secrets.

**Independent Test**: Generate audit entries, filter by command/status/text, open
details, and verify malformed or rotated files are reported safely.

### Tests for User Story 4

- [x] T043 [P] [US4] Add audit query tests for active logs, rotated logs, filters, pagination, malformed lines, and skipped files in `tests/unit/audit-query.test.ts`
- [x] T044 [P] [US4] Add audit dashboard service tests for summaries and detail redaction in `tests/unit/dashboard-audit-service.test.ts`
- [x] T045 [P] [US4] Add HTTP tests for `GET /api/audit` and `GET /api/audit/:id` in `tests/integration/dashboard-http.test.ts`

### Implementation for User Story 4

- [x] T046 [US4] Implement reusable audit log reading, validation, rotated-file discovery, and partial failure reporting in `src/audit/query.ts`
- [x] T047 [US4] Implement audit filtering, sorting, pagination, and detail lookup in `src/audit/query.ts`
- [x] T048 [US4] Implement dashboard audit summaries and sanitized detail views in `src/dashboard/audit-service.ts`
- [x] T049 [US4] Implement audit query and detail routes in `src/dashboard/routes.ts`
- [x] T050 [US4] Add audit list, filters, detail drawer, skipped file messages, and retention display in `src/dashboard/assets.ts`

**Checkpoint**: User Story 4 can be tested independently from the dashboard audit
page.

---

## Phase 7: User Story 5 - Use a Dashboard Playground (Priority: P2)

**Goal**: A user can run supported non-mutating and explicitly confirmed
workflows from the dashboard and see structured output, issues, evidence, and
next safe actions.

**Independent Test**: Use the playground to run validation, schema/list/search,
research, verify, and write preview; confirm failures and timeouts preserve
audit trace and remediation.

### Tests for User Story 5

- [x] T051 [P] [US5] Add command runner tests for allowed commands, denied commands, argument shaping, redaction, timeout, and structured output in `tests/unit/dashboard-command-runner.test.ts`
- [x] T052 [P] [US5] Add playground service tests for write preview default, explicit confirm guard, and next safe actions in `tests/unit/dashboard-playground-service.test.ts`
- [x] T053 [P] [US5] Add HTTP tests for `POST /api/playground/run` success, partial, error, and write guard cases in `tests/integration/dashboard-http.test.ts`

### Implementation for User Story 5

- [x] T054 [US5] Implement supported dashboard command mapping and argument construction in `src/dashboard/command-runner.ts`
- [x] T055 [US5] Implement playground run state, output normalization, issue/evidence extraction, and next safe actions in `src/dashboard/playground-service.ts`
- [x] T056 [US5] Implement `POST /api/playground/run` route with write confirmation guard in `src/dashboard/routes.ts`
- [x] T057 [US5] Add playground form controls, run results, structured output view, and failure remediation in `src/dashboard/assets.ts`

**Checkpoint**: User Story 5 can be tested independently from the dashboard
playground page.

---

## Phase 8: User Story 6 - Browse Research Reports (Priority: P2)

**Goal**: Every research invocation writes a canonical JSON report and the
dashboard can browse, search, and open report details.

**Independent Test**: Run research with and without `-o`, verify canonical JSON
and symlink behavior, then browse reports from the dashboard.

### Tests for User Story 6

- [x] T058 [P] [US6] Add research store tests for safe names, sortable timestamps, collision avoidance, canonical writes, and symlink failures in `tests/unit/research-store.test.ts`
- [x] T059 [P] [US6] Extend research report tests for structured JSON sections, markdown compatibility, evidence citations, and redaction in `tests/unit/research-report.test.ts`
- [x] T060 [P] [US6] Add dashboard research service tests for report listing, skipped files, detail lookup, and unsafe paths in `tests/unit/dashboard-research-service.test.ts`
- [x] T061 [P] [US6] Add integration tests for `research -o`, canonical JSON output, and dashboard report endpoints in `tests/integration/research-dashboard.test.ts`

### Implementation for User Story 6

- [x] T062 [US6] Implement canonical research report file naming, writing, indexing, and symlink creation in `src/reporting/research-store.ts`
- [x] T063 [US6] Extend research report rendering to expose structured report sections for JSON persistence in `src/reporting/research-report.ts`
- [x] T064 [US6] Update research command to write canonical JSON, support `-o`, and report link status in `src/cli/commands/research.ts`
- [x] T065 [US6] Implement dashboard research listing, searching, sorting, skipped-file handling, and detail loading in `src/dashboard/research-service.ts`
- [x] T066 [US6] Implement research list and detail routes in `src/dashboard/routes.ts`
- [x] T067 [US6] Add research report library UI with section-preserving detail view in `src/dashboard/assets.ts`

**Checkpoint**: User Story 6 can be tested independently from the research CLI
and dashboard research page.

---

## Phase 9: User Story 7 - Inspect Operational Readiness and Table Context (Priority: P3)

**Goal**: A user can inspect dashboard readiness, active mode, source, auth,
recent outcomes, schema, mappings, sampled values, records, and next actions.

**Independent Test**: Open overview and table context with incomplete and ready
setup, then verify data source labels and next actions are accurate.

### Tests for User Story 7

- [x] T068 [P] [US7] Add readiness tests for `dashboard` workflow scope and partial Lark-backed pages in `tests/unit/readiness.test.ts`
- [x] T069 [P] [US7] Add table service tests for schema context, mapping summaries, recent records, and source/auth blocked states in `tests/unit/dashboard-table-service.test.ts`
- [x] T070 [P] [US7] Add HTTP tests for `/api/status`, `/api/table/schema`, and `/api/table/records` in `tests/integration/dashboard-http.test.ts`

### Implementation for User Story 7

- [x] T071 [US7] Add `dashboard` workflow readiness support to validation schemas and types in `src/config/schema.ts`
- [x] T072 [US7] Implement dashboard workflow checks and next safe commands in `src/config/readiness.ts`
- [x] T073 [US7] Implement table schema, mapping, sampled value, recent record, and blocked-state projections in `src/dashboard/table-service.ts`
- [x] T074 [US7] Implement table context and enhanced overview routes in `src/dashboard/routes.ts`
- [x] T075 [US7] Add overview, readiness, mode, source, auth, schema, mapping, sampled value, record, and next-action UI sections in `src/dashboard/assets.ts`
- [x] T076 [US7] Update valid command workflow options to include `dashboard` in `src/cli/commands/valid.ts`

**Checkpoint**: User Story 7 can be tested independently from the dashboard
overview and table pages.

---

## Phase 10: User Story 8 - Switch Dashboard Language (Priority: P3)

**Goal**: A user can switch dashboard-owned UI text between Traditional Chinese
and English, with the preference stored only in browser web cache.

**Independent Test**: Switch languages, refresh in the same browser, clear cache
or use another browser, and confirm source data remains untranslated.

### Tests for User Story 8

- [x] T077 [P] [US8] Add language preference tests for supported values, unsupported fallback, browser preference default, and web-cache-only behavior in `tests/unit/dashboard-i18n.test.ts`
- [x] T078 [US8] Add asset tests confirming language switcher text exists and sample source-data values are not translated in `tests/unit/dashboard-i18n.test.ts`

### Implementation for User Story 8

- [x] T079 [US8] Implement language catalog, fallback rules, and source-data boundary helpers in `src/dashboard/i18n.ts`
- [x] T080 [US8] Add Traditional Chinese and English dashboard-owned UI strings to `src/dashboard/i18n.ts`
- [x] T081 [US8] Wire language switcher, browser preference default, and web cache persistence in `src/dashboard/assets.ts`
- [x] T082 [US8] Ensure dashboard API responses never persist language preference server-side in `src/dashboard/routes.ts`

**Checkpoint**: User Story 8 can be tested independently from the language
switcher.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, bootstrap guidance, package verification, and final
evidence review across all user stories.

- [x] T083 [P] Update README dashboard, research JSON, audit page, playground, and language switching documentation in `README.md`
- [x] T084 [P] Update bootstrap skill dashboard guidance and safe workflow notes in `src/bootstrap/skill/SKILL.md`
- [x] T085 [P] Update package command coverage tests for dashboard command discovery in `tests/unit/package-bin.test.ts`
- [x] T086 [P] Update help integration tests for dashboard help, valid dashboard workflow, and research `-o` guidance in `tests/integration/help-commands.test.ts`
- [x] T087 Run repository formatting through `pnpm format:fix` using scripts in `package.json`
- [x] T088 Run TypeScript build through `pnpm build` using `tsconfig.json`
- [x] T089 Run full test suite through `pnpm test` using `package.json`
- [x] T090 Record manual quickstart validation notes for dashboard startup, no-login access, live configure, live Lark login, audit query, playground, research library, and language switching in `specs/004-add-dashboard-command/quickstart.md`
- [x] T091 Audit dashboard and research outputs for unsupported claims, source-data translation, and secret leakage across `src/dashboard/assets.ts`, `src/dashboard/api.ts`, `src/reporting/research-store.ts`, and `src/audit/query.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 Setup has no dependencies.
- Phase 2 Foundational depends on Phase 1 and blocks every user story.
- Phase 3 User Story 1 depends on Phase 2 and is the MVP.
- Phase 4 User Story 2 depends on Phase 2. It can run after or beside US1 once
  the dashboard shell and routes are available.
- Phase 5 User Story 3 depends on Phase 2. It can run after or beside US1 once
  the dashboard shell and routes are available.
- Phase 6 User Story 4 depends on Phase 2 and can run independently of US2 and
  US3.
- Phase 7 User Story 5 depends on Phase 2 and benefits from US1 routes, but its
  command-runner service can be developed independently.
- Phase 8 User Story 6 depends on Phase 2 and can be implemented independently
  from dashboard pages once the research store contract is in place.
- Phase 9 User Story 7 depends on Phase 2 and benefits from US2/US3 readiness
  projections.
- Phase 10 User Story 8 depends on Phase 2 assets and can be implemented
  independently from backend route work.
- Final Phase depends on the desired user stories being complete.

### User Story Dependencies

- US1 is the recommended MVP and has no dependency on other user stories.
- US2, US3, and US4 are P1 and should follow immediately after US1 for a useful
  operational dashboard.
- US5 and US6 are P2 and can be delivered after the P1 dashboard surfaces.
- US7 and US8 are P3 and can be added after the core operational flows, or run
  in parallel by separate workers after Phase 2.

### Within Each User Story

- Test tasks should be written before implementation tasks.
- Service modules should be implemented before routes that expose them.
- Routes should be implemented before dashboard asset interactions depend on
  them.
- Redaction and source/fact boundaries must be verified before completion
  claims.

## Parallel Execution Examples

### User Story 1

```text
Parallel after Phase 2:
- T017 in tests/unit/dashboard-port.test.ts
- T018 in tests/integration/dashboard-http.test.ts
- T019 in tests/integration/dashboard-command.test.ts

Then sequential:
- T020 -> T021 -> T022 -> T023 -> T024 -> T025 -> T026
```

### User Story 2

```text
Parallel:
- T027 in tests/unit/dashboard-config-service.test.ts
- T028 in tests/integration/dashboard-http.test.ts

Then sequential:
- T029 -> T030 -> T031 -> T032 -> T033 -> T034
```

### User Story 3

```text
Parallel:
- T035 in tests/unit/dashboard-auth-service.test.ts
- T036 in tests/integration/dashboard-http.test.ts

Then sequential:
- T037 -> T038 -> T039 -> T040 -> T041 -> T042
```

### User Story 4

```text
Parallel:
- T043 in tests/unit/audit-query.test.ts
- T044 in tests/unit/dashboard-audit-service.test.ts
- T045 in tests/integration/dashboard-http.test.ts

Then sequential:
- T046 -> T047 -> T048 -> T049 -> T050
```

### User Story 5

```text
Parallel:
- T051 in tests/unit/dashboard-command-runner.test.ts
- T052 in tests/unit/dashboard-playground-service.test.ts
- T053 in tests/integration/dashboard-http.test.ts

Then sequential:
- T054 -> T055 -> T056 -> T057
```

### User Story 6

```text
Parallel:
- T058 in tests/unit/research-store.test.ts
- T059 in tests/unit/research-report.test.ts
- T060 in tests/unit/dashboard-research-service.test.ts
- T061 in tests/integration/research-dashboard.test.ts

Then sequential:
- T062 -> T063 -> T064 -> T065 -> T066 -> T067
```

### User Story 7

```text
Parallel:
- T068 in tests/unit/readiness.test.ts
- T069 in tests/unit/dashboard-table-service.test.ts
- T070 in tests/integration/dashboard-http.test.ts

Then sequential:
- T071 -> T072 -> T073 -> T074 -> T075 -> T076
```

### User Story 8

```text
Parallel:
- T077 in tests/unit/dashboard-i18n.test.ts

Then sequential:
- T078 -> T079 -> T080 -> T081 -> T082
```

## Implementation Strategy

### MVP First

1. Complete Phase 1.
2. Complete Phase 2.
3. Complete Phase 3 for US1.
4. Validate with `tests/unit/dashboard-port.test.ts`,
   `tests/integration/dashboard-http.test.ts`, and
   `tests/integration/dashboard-command.test.ts`.
5. Stop and demo local dashboard startup before adding configuration, auth,
   audit, playground, research, table, or language layers.

### Incremental Delivery

1. Deliver US1 as the shell and local server.
2. Add US2, US3, and US4 to make the dashboard operational for setup and audit.
3. Add US5 and US6 for playground and research library value.
4. Add US7 and US8 for overview depth and multilingual usability.
5. Run the Final Phase quality checks before claiming feature completion.

### Parallel Team Strategy

1. One worker completes Phase 1 and Phase 2.
2. Separate workers can take US2, US3, US4, US6, and US8 after Phase 2 because
   they mainly touch separate service/test files.
3. A final integration worker should own `src/dashboard/assets.ts` merge work
   because several stories add UI sections to that file.

## Validation Summary

- Every user story has at least one test task and an independent test criterion.
- Every implementation task includes at least one exact file path.
- P1 stories deliver local dashboard startup, live configuration, live Lark
  auth, and audit search before P2/P3 enhancements.
- Write-capable playground behavior remains preview-first unless explicitly
  confirmed.
- Language preference is scoped to browser web cache and never becomes a server
  preference.
