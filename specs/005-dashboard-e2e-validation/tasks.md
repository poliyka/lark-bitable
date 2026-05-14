# Tasks: Dashboard Comprehensive E2E and UI Validation

**Input**: Design documents from `/specs/005-dashboard-e2e-validation/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md),
[research.md](./research.md), [data-model.md](./data-model.md),
[quickstart.md](./quickstart.md), [contracts/](./contracts/)

**Tests**: Included because this feature is itself a comprehensive validation
feature. Tasks produce browser-visible evidence, scenario pass/fail/blocked
results, and QA reports rather than production code.

**Organization**: Tasks are grouped by user story and split into subagent
capability lanes. After the shared foundation is complete, lanes A1 through A7
can run concurrently on independent dashboard instances, browser contexts, and
artifact shards. A0 owns orchestration and final merge only.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it writes different files or independent
  artifact groups and does not depend on incomplete tasks.
- **[Story]**: User story label for traceability. Setup, foundational, and
  polish tasks intentionally omit story labels.
- Every task includes exact file paths.
- Agent ownership is written in the task description as `Agent A*` to preserve
  the required Spec Kit checklist format.

## Subagent Capability Lanes

**A0 Orchestrator**

- Owns repository preflight, shared run metadata, dashboard launch template,
  master scenario tracker, master evidence index, final report, and task
  completion state.
- Writes only shared files in `specs/005-dashboard-e2e-validation/qa/`
  and `specs/005-dashboard-e2e-validation/qa/artifacts/`.

**A1 Shell & Overview**

- Owns launch, no-dashboard-login, global shell, navigation, shortcuts, command
  palette, refresh, copy, and Overview evidence.
- Writes only
  `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A1-shell/`.

**A2 Configuration & Field Mapping**

- Owns live configuration repair, field discovery/sync, mapping dropdowns,
  save synchronization, and scroll-position regressions.
- Writes only
  `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A2-config/`.

**A3 Lark Auth**

- Owns Lark login/logout lifecycle, auth status, scopes, live credential
  blockers, and token redaction.
- Writes only
  `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A3-auth/`.

**A4 Audit & Playground**

- Owns audit log browsing/filter/detail/export and playground command builder,
  preview-first write guard, responses, history, and audit traceability.
- Writes only
  `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A4-ops/`.

**A5 Research & Source Table**

- Owns research report browsing and source table records/schema flows.
- Writes only
  `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A5-data/`.

**A6 UI & Responsive**

- Owns visual design fidelity, desktop/mobile captures, hover/focus/selected
  states, empty/error/loading visual states, and keyboard focus reachability.
- Writes only
  `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A6-ui/`.

**A7 I18n & Privacy**

- Owns language switching, browser-only language cache, source-data boundary,
  security scans, no dashboard DB/session persistence, and browser storage
  privacy.
- Writes only
  `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A7-i18n-security/`.

**A8 Error States**

- Owns final error-state scenario execution so A0 can merge reports while A8
  captures late cross-page error evidence.
- Writes only
  `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A8-errors/`.

## Parallel Execution Rules

- Each subagent MUST launch its own dashboard process with `pnpm dev dashboard
--no-open --json --port <lane-port> --config-cwd <lane-state/config>
--auth-path <lane-state/auth.json> --audit-path <lane-state/audit.json>
--research-dir <lane-state/research>`.
- Use requested ports with gaps to reduce collision: A0 `48731`, A1 `48741`,
  A2 `48751`, A3 `48761`, A4 `48771`, A5 `48781`, A6 `48791`, A7 `48801`, A8
  `48811`. If the command reports an incremented actual port, the subagent MUST
  use the reported `data.binding.origin`.
- Each subagent MUST use a separate browser context/profile and MUST NOT reuse
  another lane's localStorage, cookies, clipboard stubs, or DevTools page.
- Browser-visible validation MUST use the isolated MCP namespace
  `mcp__chrome_devtools_isolated__`. Subagents MUST NOT use the shared
  `mcp__chrome_devtools__` namespace or custom Playwright/CDP fallback browsers
  during RUN-001 unless A0 explicitly changes this policy.
- Subagents MUST NOT edit `RUN-001.md`, `REPORT-001.md`,
  `RUN-001_scenario-tracker.md`, or `RUN-001_evidence-index.md` directly. They
  write lane shards only; A0 merges them.
- If a lane cannot run because browser control, live Lark credentials, or test
  data is unavailable, it MUST write blocked records in its lane shard instead
  of silently skipping scenarios.

## Phase 1: Setup (Shared QA Workspace)

**Purpose**: Create the QA evidence workspace, lane directories, and baseline
metadata required by every dashboard validation subagent.

- [x] T001 Create the QA task root plus lane artifact directories `A0-orchestrator`, `A1-shell`, `A2-config`, `A3-auth`, `A4-ops`, `A5-data`, `A6-ui`, `A7-i18n-security`, and `A8-errors` in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/`
- [x] T002 Create QA case metadata from `contracts/qa-report-contract.md` in `specs/005-dashboard-e2e-validation/qa/CASE.md`
- [x] T003 Create the A0 orchestrator run log skeleton for RUN-001 in `specs/005-dashboard-e2e-validation/qa/RUN-001.md`
- [x] T004 Create the A0 final report skeleton for REPORT-001 in `specs/005-dashboard-e2e-validation/qa/REPORT-001.md`
- [x] T005 [P] Create per-lane scenario shard templates from `contracts/dashboard-e2e-coverage-contract.md` in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/`
- [x] T006 [P] Create per-lane evidence index shard templates from `contracts/browser-evidence-contract.md` in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/`
- [x] T007 Record branch, feature directory, spec, plan, contracts, and subagent lane map in `specs/005-dashboard-e2e-validation/qa/RUN-001.md`
- [x] T008 Record whether live Lark test account, test Lark app, and test Bitable are available or blocked in `specs/005-dashboard-e2e-validation/qa/RUN-001.md`

---

## Phase 2: Foundational (Blocking Preflight)

**Purpose**: Establish deterministic repository, dashboard, browser, and
evidence collection state before validating user stories.

**Critical**: No subagent lane should begin browser validation until this phase
is complete.

- [x] T009 [P] Agent A0 run `pnpm format:check` and record command output in `specs/005-dashboard-e2e-validation/qa/artifacts/RUN-001_preflight-format-check.txt`
- [x] T010 [P] Agent A0 run `pnpm build` and record command output in `specs/005-dashboard-e2e-validation/qa/artifacts/RUN-001_preflight-build.txt`
- [x] T011 [P] Agent A0 run `pnpm test` and record command output in `specs/005-dashboard-e2e-validation/qa/artifacts/RUN-001_preflight-test.txt`
- [x] T012 Agent A0 create isolated state directories for every lane and record config/auth/audit/research paths in `specs/005-dashboard-e2e-validation/qa/artifacts/RUN-001_lane-state-manifest.json`
- [x] T013 Agent A0 write the lane launch commands, requested ports, and browser-context requirements in `specs/005-dashboard-e2e-validation/qa/artifacts/RUN-001_subagent-dispatch.md`
- [x] T014 Agent A0 start a smoke dashboard with `pnpm dev dashboard --no-open --json --port 48731 --shutdown-after-ms 30000` and record startup output in `specs/005-dashboard-e2e-validation/qa/artifacts/RUN-001_dashboard-smoke-startup.txt`
- [x] T015 Agent A0 verify the smoke dashboard `/api/status` reports local-only and no-dashboard-login behavior and save response summary in `specs/005-dashboard-e2e-validation/qa/artifacts/RUN-001_api-status.json`
- [x] T016 Agent A0 open the smoke dashboard in a controllable real browser and record browser identity, version, profile state, and initial URL in `specs/005-dashboard-e2e-validation/qa/RUN-001.md`
- [x] T017 Agent A0 capture initial console summary in `specs/005-dashboard-e2e-validation/qa/artifacts/RUN-001_console-initial.json`
- [x] T018 Agent A0 capture initial network summary in `specs/005-dashboard-e2e-validation/qa/artifacts/RUN-001_network-initial.json`
- [x] T019 Agent A0 capture initial desktop screenshot and accessibility snapshot in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A0-orchestrator/RUN-001_A0_smoke-initial/`
- [x] T020 Agent A0 if browser control is unavailable, mark all browser-dependent checks blocked with reason in `specs/005-dashboard-e2e-validation/qa/RUN-001.md`

**Checkpoint**: Repository baseline, smoke dashboard startup, browser control,
lane state isolation, and dispatch instructions are ready.

---

## Phase 3: User Story 1 - Validate Launch and Global Shell (Priority: P1) MVP

**Goal**: Prove that the dashboard launches locally without dashboard login and
that global shell navigation and controls work with browser-visible evidence.

**Independent Test**: Agent A1 executes `D-SHELL-01` through `D-SHELL-10` and
the global parts of `D-OVERVIEW-01` through `D-OVERVIEW-10` in an isolated
dashboard instance, then writes lane scenario and evidence shards.

### Validation for User Story 1

- [x] T021 [P] [US1] Agent A1 start its dashboard on requested port `48741`, validate `D-SHELL-01` no dashboard login prompt, and record origin in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A1-shell/RUN-001_A1-shell_startup.json`
- [x] T022 [P] [US1] Agent A1 validate `D-SHELL-02` sidebar brand, navigation, binding card, local-only, and no-dashboard-login labels and save screenshot to `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A1-shell/RUN-001_D-SHELL-02_desktop.png`
- [x] T023 [P] [US1] Agent A1 validate `D-SHELL-03` topbar breadcrumb, refresh, command palette, and language controls and save snapshot to `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A1-shell/RUN-001_D-SHELL-03_snapshot.txt`
- [x] T024 [US1] Agent A1 validate `D-SHELL-04` click navigation across Overview, Configuration, Lark Login, Audit Logs, Playground, Research Reports, and Source Table and record DOM observations in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A1-shell/RUN-001_D-SHELL-04_dom.json`
- [x] T025 [US1] Agent A1 validate `D-SHELL-05` keyboard shortcuts Cmd/Ctrl+1 through Cmd/Ctrl+7 and record DOM observations in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A1-shell/RUN-001_D-SHELL-05_shortcuts.json`
- [x] T026 [US1] Agent A1 validate `D-SHELL-06` command palette opens Playground and record network/DOM evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A1-shell/RUN-001_D-SHELL-06_command-palette.json`
- [x] T027 [US1] Agent A1 validate `D-SHELL-07` refresh preserves active page and selected page state and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A1-shell/RUN-001_D-SHELL-07_refresh.json`
- [x] T028 [US1] Agent A1 validate `D-SHELL-08` shell copy actions with clipboard stub and record copied values in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A1-shell/RUN-001_D-SHELL-08_clipboard.json`
- [x] T029 [US1] Agent A1 validate `D-SHELL-09` page-internal clicks do not trigger unintended navigation and record hash/page state evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A1-shell/RUN-001_D-SHELL-09_internal-clicks.json`
- [x] T030 [US1] Agent A1 validate `D-SHELL-10` navigation has no uncontrolled request loop and record network summary in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A1-shell/RUN-001_D-SHELL-10_network.json`
- [x] T031 [P] [US1] Agent A1 validate `D-OVERVIEW-01` through `D-OVERVIEW-05` readiness, source, auth, workflow, and next action state and save screenshot to `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A1-shell/RUN-001_D-OVERVIEW-01_05_desktop.png`
- [x] T032 [P] [US1] Agent A1 validate `D-OVERVIEW-06` through `D-OVERVIEW-10` field mapping card, fix action, recent activity, valid action, and copy next behavior and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A1-shell/RUN-001_D-OVERVIEW-06_10.json`
- [x] T033 [US1] Agent A1 update all US1 scenario statuses, defects, blockers, and evidence references in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A1-shell/RUN-001_A1-shell.md`

**Checkpoint**: User Story 1 is independently validated as the MVP shell
coverage.

---

## Phase 4: User Story 2 - Validate Configuration Repair and Field Mapping Behavior (Priority: P1)

**Goal**: Prove configuration repair, field mapping selection, field sync, save
synchronization, and scroll-position stability.

**Independent Test**: Agent A2 executes `D-CONFIG-01` through `D-CONFIG-15`
inside its own dashboard state, including the user's high-risk mapping dropdown,
field sync, and scroll-to-top regression checks.

### Validation for User Story 2

- [x] T034 [P] [US2] Agent A2 start its dashboard on requested port `48751`, validate `D-CONFIG-01` Configuration page sections render, and save startup plus screenshot evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A2-config/RUN-001_D-CONFIG-01_desktop.png`
- [x] T035 [P] [US2] Agent A2 validate `D-CONFIG-02` reset reloads server draft without changing active page and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A2-config/RUN-001_D-CONFIG-02_reset.json`
- [x] T036 [US2] Agent A2 validate `D-CONFIG-03` save submits all visible configuration values and record sanitized network evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A2-config/RUN-001_D-CONFIG-03_save-payload.json`
- [x] T037 [US2] Agent A2 validate `D-CONFIG-04` save output redacts app secret values and record visible text scan in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A2-config/RUN-001_D-CONFIG-04_redaction.json`
- [x] T038 [US2] Agent A2 validate `D-CONFIG-05` invalid source URL shows recoverable error and preserves inputs in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A2-config/RUN-001_D-CONFIG-05_invalid-source.json`
- [x] T039 [P] [US2] Agent A2 validate `D-CONFIG-06` workflow mode and Lark domain selectable controls and record DOM evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A2-config/RUN-001_D-CONFIG-06_selects.json`
- [x] T040 [US2] Agent A2 validate `D-CONFIG-07` statusField focus/change does not scroll to top and save before/after scroll evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A2-config/RUN-001_D-CONFIG-07_statusField-scroll.json`
- [x] T041 [US2] Agent A2 validate `D-CONFIG-07` priorityField focus/change does not scroll to top and save before/after scroll evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A2-config/RUN-001_D-CONFIG-07_priorityField-scroll.json`
- [x] T042 [US2] Agent A2 validate `D-CONFIG-07` titleField focus/change does not scroll to top and save before/after scroll evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A2-config/RUN-001_D-CONFIG-07_titleField-scroll.json`
- [x] T043 [US2] Agent A2 validate `D-CONFIG-07` ownerField focus/change does not scroll to top and save before/after scroll evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A2-config/RUN-001_D-CONFIG-07_ownerField-scroll.json`
- [x] T044 [US2] Agent A2 validate `D-CONFIG-08` focusing page inputs preserves hash, active page, and breadcrumb and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A2-config/RUN-001_D-CONFIG-08_focus-routing.json`
- [x] T045 [US2] Agent A2 validate `D-CONFIG-09` all four mapping controls are dropdowns or equivalent selectable controls populated from discovered fields and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A2-config/RUN-001_D-CONFIG-09_mapping-controls.json`
- [x] T046 [US2] Agent A2 validate `D-CONFIG-10` field discovery or sync updates every mapping control and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A2-config/RUN-001_D-CONFIG-10_field-sync.json`
- [x] T047 [US2] Agent A2 validate `D-CONFIG-11` changed mappings save and synchronize to Overview and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A2-config/RUN-001_D-CONFIG-11_mapping-save-overview.json`
- [x] T048 [US2] Agent A2 validate `D-CONFIG-12` blocked field discovery reports blocked state honestly and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A2-config/RUN-001_D-CONFIG-12_blocked-sync.json`
- [x] T049 [P] [US2] Agent A2 validate `D-CONFIG-13` scopes normalization and record payload evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A2-config/RUN-001_D-CONFIG-13_scopes.json`
- [x] T050 [P] [US2] Agent A2 validate `D-CONFIG-14` callback port invalid value handling and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A2-config/RUN-001_D-CONFIG-14_callback-port.json`
- [x] T051 [P] [US2] Agent A2 validate `D-CONFIG-15` default owner and actionable status save behavior and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A2-config/RUN-001_D-CONFIG-15_owner-status.json`
- [x] T052 [US2] Agent A2 create defect findings for any failed mapping dropdown, field sync, or scroll-position scenario in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A2-config/RUN-001_A2-config.md`
- [x] T053 [US2] Agent A2 update all US2 scenario statuses and evidence references in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A2-config/RUN-001_A2-config.md`

**Checkpoint**: User Story 2 independently proves configuration and field
mapping behavior or records concrete defects/blockers.

---

## Phase 5: User Story 3 - Validate Lark Authorization Lifecycle (Priority: P1)

**Goal**: Prove dashboard Lark auth lifecycle behavior without exposing tokens.

**Independent Test**: Agent A3 executes `D-AUTH-01` through `D-AUTH-10` with
missing auth and live auth states when a test Lark account is available.

### Validation for User Story 3

- [x] T054 [P] [US3] Agent A3 start its dashboard on requested port `48761`, validate `D-AUTH-01` Current Auth card fields, and save screenshot to `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A3-auth/RUN-001_D-AUTH-01_current-auth.png`
- [x] T055 [P] [US3] Agent A3 validate `D-AUTH-02` missing auth state and remediation and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A3-auth/RUN-001_D-AUTH-02_missing.json`
- [x] T056 [US3] Agent A3 validate `D-AUTH-03` requested scopes are reflected in login start behavior and record sanitized network evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A3-auth/RUN-001_D-AUTH-03_scopes.json`
- [x] T057 [US3] Agent A3 validate `D-AUTH-04` start login waiting state and flow progress and save screenshot to `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A3-auth/RUN-001_D-AUTH-04_login-waiting.png`
- [x] T058 [US3] Agent A3 validate `D-AUTH-05` authorization URL action opens or exposes a usable URL and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A3-auth/RUN-001_D-AUTH-05_authorization-url.json`
- [x] T059 [US3] Agent A3 validate `D-AUTH-06` Open In Browser does not open placeholder text and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A3-auth/RUN-001_D-AUTH-06_placeholder-guard.json`
- [x] T060 [US3] Agent A3 if live Lark credentials are available, validate `D-AUTH-07` ready login status refreshes Current Auth and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A3-auth/RUN-001_D-AUTH-07_ready-auth.json`
- [x] T061 [US3] Agent A3 validate `D-AUTH-08` failed, canceled, or expired login remediation behavior and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A3-auth/RUN-001_D-AUTH-08_failed-flow.json`
- [x] T062 [US3] Agent A3 validate `D-AUTH-09` logout returns auth and Overview to missing or blocked state and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A3-auth/RUN-001_D-AUTH-09_logout.json`
- [x] T063 [US3] Agent A3 validate `D-AUTH-10` auth UI secret scan and record result in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A3-auth/RUN-001_D-AUTH-10_secret-scan.json`
- [x] T064 [US3] Agent A3 mark any live Lark scenarios without credentials as blocked with dependency names in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A3-auth/RUN-001_A3-auth.md`
- [x] T065 [US3] Agent A3 update all US3 scenario statuses and evidence references in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A3-auth/RUN-001_A3-auth.md`

**Checkpoint**: User Story 3 independently proves or blocks auth lifecycle
coverage.

---

## Phase 6: User Story 4 - Validate Operational Pages and Workflows (Priority: P1)

**Goal**: Prove Audit Logs, Playground, Research Reports, and Source Table
workflows with action-level evidence.

**Independent Test**: Agents A4 and A5 run concurrently after foundation. A4
executes `D-AUDIT-*` and `D-PLAY-*`; A5 executes `D-RESEARCH-*` and
`D-TABLE-*`.

### Validation for User Story 4

- [x] T066 [P] [US4] Agent A4 start its dashboard on requested port `48771`, seed local audit entries for audit validation, and record setup evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A4-ops/RUN-001_D-AUDIT_seed.txt`
- [x] T067 [P] [US4] Agent A5 start its dashboard on requested port `48781`, seed local research reports for research validation, and record setup evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A5-data/RUN-001_D-RESEARCH_seed.txt`
- [x] T068 [P] [US4] Agent A4 validate `D-AUDIT-01` through `D-AUDIT-02` audit page render, newest-first entries, and count and save screenshot to `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A4-ops/RUN-001_D-AUDIT-01_02.png`
- [x] T069 [US4] Agent A4 validate `D-AUDIT-03` through `D-AUDIT-04` every audit filter and record sanitized network evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A4-ops/RUN-001_D-AUDIT-03_04_filters.json`
- [x] T070 [US4] Agent A4 validate `D-AUDIT-05` through `D-AUDIT-07` row detail, selected state, detail content, and export copy in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A4-ops/RUN-001_D-AUDIT-05_07_detail-export.json`
- [x] T071 [US4] Agent A4 validate `D-AUDIT-08` through `D-AUDIT-10` empty, malformed/skipped, and redacted audit states in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A4-ops/RUN-001_D-AUDIT-08_10_empty-skipped-redaction.json`
- [x] T072 [P] [US4] Agent A4 validate `D-PLAY-01` through `D-PLAY-02` command list and command selection state and save screenshot to `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A4-ops/RUN-001_D-PLAY-01_02.png`
- [x] T073 [US4] Agent A4 validate `D-PLAY-03` through `D-PLAY-08` command-specific parameters, previews, and payloads and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A4-ops/RUN-001_D-PLAY-03_08_previews.json`
- [x] T074 [US4] Agent A4 validate `D-PLAY-09` through `D-PLAY-10` write preview-first and explicit confirmation guard and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A4-ops/RUN-001_D-PLAY-09_10_write-guard.json`
- [x] T075 [US4] Agent A4 validate `D-PLAY-11` through `D-PLAY-15` response tabs, run history, copy CLI, failure/timeout handling, and audit traceability in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A4-ops/RUN-001_D-PLAY-11_15_results.json`
- [x] T076 [P] [US4] Agent A5 validate `D-RESEARCH-01` through `D-RESEARCH-03` research page render, empty state, and valid report list and save screenshot to `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A5-data/RUN-001_D-RESEARCH-01_03.png`
- [x] T077 [US4] Agent A5 validate `D-RESEARCH-04` through `D-RESEARCH-07` report selection, detail loading, section preservation, search, and reload in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A5-data/RUN-001_D-RESEARCH-04_07_detail-search.json`
- [x] T078 [US4] Agent A5 validate `D-RESEARCH-08` through `D-RESEARCH-12` copy path/content/dir, malformed report handling, and no translation of report content in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A5-data/RUN-001_D-RESEARCH-08_12_copy-malformed-i18n.json`
- [x] T079 [P] [US4] Agent A5 validate `D-TABLE-01` through `D-TABLE-03` source table render, missing/blocked state, and ready source banner when available and save screenshot to `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A5-data/RUN-001_D-TABLE-01_03.png`
- [x] T080 [US4] Agent A5 validate `D-TABLE-04` through `D-TABLE-06` records columns, search/apply, and complex cell rendering in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A5-data/RUN-001_D-TABLE-04_06_records.json`
- [x] T081 [US4] Agent A5 validate `D-TABLE-07` through `D-TABLE-10` schema tab, schema rows, refresh, and export copy in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A5-data/RUN-001_D-TABLE-07_10_schema-export.json`
- [x] T082 [US4] Agent A5 validate `D-TABLE-11` through `D-TABLE-12` wide/long table inspectability and no translation of source values in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A5-data/RUN-001_D-TABLE-11_12_layout-i18n.json`
- [x] T083 [US4] Agent A5 mark source-table live scenarios without Lark test data as blocked with dependency names in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A5-data/RUN-001_A5-data.md`
- [x] T084 [US4] Agents A4 and A5 update all US4 scenario statuses and evidence references in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A4-ops/RUN-001_A4-ops.md` and `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A5-data/RUN-001_A5-data.md`

**Checkpoint**: User Story 4 independently proves operational page coverage or
records concrete defects/blockers.

---

## Phase 7: User Story 5 - Validate Complete UI Quality and Visual States (Priority: P1)

**Goal**: Prove visual design fidelity, responsive behavior, and interactive
states across the dashboard.

**Independent Test**: Agent A6 executes `D-UI-01` through `D-UI-07` using
desktop and mobile screenshots, focus/hover/selected observations, and styled
empty/error states.

### Validation for User Story 5

- [x] T085 [P] [US5] Agent A6 start its dashboard on requested port `48791` and capture `D-UI-01` desktop screenshots for all seven primary pages in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A6-ui/RUN-001_D-UI-01_desktop-pages/`
- [x] T086 [P] [US5] Agent A6 capture `D-UI-02` mobile screenshots for Overview, Configuration, Playground, Research, and Source Table in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A6-ui/RUN-001_D-UI-02_mobile-pages/`
- [x] T087 [US5] Agent A6 validate `D-UI-03` active, hover, focus, and selected visual states and record screenshots/DOM observations in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A6-ui/RUN-001_D-UI-03_states.json`
- [x] T088 [US5] Agent A6 validate `D-UI-04` empty, blocked, partial, and error states are readable and styled and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A6-ui/RUN-001_D-UI-04_empty-blocked-error.json`
- [x] T089 [US5] Agent A6 validate `D-UI-05` design language against `specs/004-add-dashboard-command/design.md` and record assessment in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A6-ui/RUN-001_D-UI-05_design-assessment.md`
- [x] T090 [US5] Agent A6 validate `D-UI-06` loading and empty states do not use broken raw layout and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A6-ui/RUN-001_D-UI-06_loading-empty.json`
- [x] T091 [US5] Agent A6 validate `D-UI-07` keyboard focus visibility and primary control reachability and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A6-ui/RUN-001_D-UI-07_keyboard-focus.json`
- [x] T092 [US5] Agent A6 update all US5 scenario statuses and evidence references in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A6-ui/RUN-001_A6-ui.md`

**Checkpoint**: User Story 5 independently proves UI and visual quality
coverage.

---

## Phase 8: User Story 6 - Validate Language, Source Data Boundaries, and Privacy (Priority: P2)

**Goal**: Prove language switching, browser-only preference, source-data
preservation, and secret redaction across the dashboard.

**Independent Test**: Agent A7 executes `D-I18N-01` through `D-I18N-07` and
`D-SEC-01` through `D-SEC-06` in an isolated browser context.

### Validation for User Story 6

- [x] T093 [P] [US6] Agent A7 start its dashboard on requested port `48801`, validate `D-I18N-01` default language resolution, and record localStorage/browser evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A7-i18n-security/RUN-001_D-I18N-01_default.json`
- [x] T094 [US6] Agent A7 validate `D-I18N-02` English language switch on all primary pages and save evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A7-i18n-security/RUN-001_D-I18N-02_english.json`
- [x] T095 [US6] Agent A7 validate `D-I18N-03` Traditional Chinese language switch on all primary pages and save evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A7-i18n-security/RUN-001_D-I18N-03_zh-tw.json`
- [x] T096 [US6] Agent A7 validate `D-I18N-04` browser refresh restores stored language preference and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A7-i18n-security/RUN-001_D-I18N-04_refresh.json`
- [x] T097 [US6] Agent A7 validate `D-I18N-05` clearing browser storage resets fallback and does not write server-side language state in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A7-i18n-security/RUN-001_D-I18N-05_storage-clear.json`
- [x] T098 [US6] Agent A7 validate `D-I18N-06` source-controlled values are not translated and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A7-i18n-security/RUN-001_D-I18N-06_source-boundary.json`
- [x] T099 [US6] Agent A7 validate `D-I18N-07` language switching preserves active page, selected tabs, form values, and run history in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A7-i18n-security/RUN-001_D-I18N-07_state-preservation.json`
- [x] T100 [P] [US6] Agent A7 validate `D-SEC-01` visible text secret scan across all primary pages and record result in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A7-i18n-security/RUN-001_D-SEC-01_visible-secret-scan.json`
- [x] T101 [US6] Agent A7 validate `D-SEC-02` rendered network response details are redacted and record result in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A7-i18n-security/RUN-001_D-SEC-02_response-redaction.json`
- [x] T102 [US6] Agent A7 validate `D-SEC-03` App Secret display state after save and record result in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A7-i18n-security/RUN-001_D-SEC-03_app-secret.json`
- [x] T103 [US6] Agent A7 validate `D-SEC-04` dashboard binding remains local-only by default and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A7-i18n-security/RUN-001_D-SEC-04_local-only.json`
- [x] T104 [US6] Agent A7 validate `D-SEC-05` no dashboard DB/session/schema persistence is created and record filesystem evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A7-i18n-security/RUN-001_D-SEC-05_no-db.txt`
- [x] T105 [US6] Agent A7 validate `D-SEC-06` browser storage contains no tokens, secrets, or auth codes and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A7-i18n-security/RUN-001_D-SEC-06_browser-storage.json`
- [x] T106 [US6] Agent A7 update all US6 scenario statuses and evidence references in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A7-i18n-security/RUN-001_A7-i18n-security.md`

**Checkpoint**: User Story 6 independently proves language and privacy coverage.

---

## Final Phase: Error States, Reporting, and Cross-Cutting Review

**Purpose**: Complete error-state validation, consolidate lane evidence, and
produce the final QA conclusion.

- [x] T107 [P] Agent A8 start its dashboard on requested port `48811`, validate `D-ERR-01` through `D-ERR-07` error-state scenarios, and record evidence in `specs/005-dashboard-e2e-validation/qa/artifacts/agents/A8-errors/RUN-001_D-ERR-01_07_errors.json`
- [x] T108 [P] Agent A0 capture final browser console summaries from each completed lane and save them to `specs/005-dashboard-e2e-validation/qa/artifacts/RUN-001_console-final.json`
- [x] T109 [P] Agent A0 capture final browser network summaries from each completed lane and save them to `specs/005-dashboard-e2e-validation/qa/artifacts/RUN-001_network-final.json`
- [x] T110 Agent A0 merge all per-lane scenario shards so no final `not-run` statuses remain in `specs/005-dashboard-e2e-validation/qa/artifacts/RUN-001_scenario-tracker.md`
- [x] T111 Agent A0 merge and audit every per-lane evidence artifact for redaction status in `specs/005-dashboard-e2e-validation/qa/artifacts/RUN-001_evidence-index.md`
- [x] T112 Agent A0 write all defect findings from lane shards with reproduction steps, expected behavior, actual behavior, evidence, severity, and developer follow-up in `specs/005-dashboard-e2e-validation/qa/RUN-001.md`
- [x] T113 Agent A0 write all blocked checks from lane shards with missing dependency, unblock requirement, and impact in `specs/005-dashboard-e2e-validation/qa/RUN-001.md`
- [x] T114 Agent A0 generate final coverage summary counts for passed, failed, blocked, and not-run scenarios in `specs/005-dashboard-e2e-validation/qa/REPORT-001.md`
- [x] T115 Agent A0 write final report conclusion as pass, fail, or blocked in `specs/005-dashboard-e2e-validation/qa/REPORT-001.md`
- [x] T116 Agent A0 ensure REPORT-001 explicitly states whether field mapping dropdown behavior, field mapping sync, and Configuration scroll-position checks passed, failed, or were blocked in `specs/005-dashboard-e2e-validation/qa/REPORT-001.md`
- [x] T117 Agent A0 run `pnpm format:check` and record the final command output in `specs/005-dashboard-e2e-validation/qa/artifacts/RUN-001_final-format-check.txt`
- [x] T118 Agent A0 run `git diff --check` and record the final command output in `specs/005-dashboard-e2e-validation/qa/artifacts/RUN-001_final-diff-check.txt`
- [x] T119 Agent A0 review RUN-001 and REPORT-001 for unsupported claims, missing evidence, hidden assumptions, unclassified blockers, and lane merge conflicts in `specs/005-dashboard-e2e-validation/qa/REPORT-001.md`
- [x] T120 Agent A0 update this task list completion state in `specs/005-dashboard-e2e-validation/tasks.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. Creates the QA workspace, lane
  directories, and evidence shard templates.
- **Foundational (Phase 2)**: Depends on Setup completion. Blocks all subagent
  validation because it establishes baseline commands, smoke dashboard startup,
  browser control, lane state isolation, and dispatch instructions.
- **US1 Launch and Global Shell (Phase 3)**: Depends on Foundational. MVP
  validation slice owned by Agent A1.
- **US2 Configuration and Field Mapping (Phase 4)**: Depends on Foundational.
  Owned by Agent A2 and isolated from other lanes because it mutates config.
- **US3 Lark Authorization (Phase 5)**: Depends on Foundational. Owned by Agent
  A3; live-ready checks depend on test Lark credentials.
- **US4 Operational Pages (Phase 6)**: Depends on Foundational. Split between
  Agent A4 for Audit/Playground and Agent A5 for Research/Table.
- **US5 UI Quality (Phase 7)**: Depends on Foundational. Owned by Agent A6 and
  can run while functional lanes execute.
- **US6 Language and Privacy (Phase 8)**: Depends on Foundational. Owned by
  Agent A7 and can run while functional lanes execute.
- **Final Phase**: A8 error-state validation can run after Foundational; A0
  merge tasks T110-T120 depend on all desired lane shards being complete or
  explicitly blocked.

### Subagent Dispatch Batches

**Batch 0: A0 Foundation**

```text
A0 executes T001-T020.
Do not dispatch browser validation lanes until T020 is complete.
```

**Batch 1: High-value parallel lanes**

```text
A1 executes T021-T033 for shell and overview.
A2 executes T034-T053 for configuration and field mapping.
A3 executes T054-T065 for Lark auth lifecycle.
A4 executes T066, T068-T075, and its part of T084 for audit and playground.
A5 executes T067, T076-T083, and its part of T084 for research and source table.
A6 executes T085-T092 for UI and responsive evidence.
A7 executes T093-T106 for i18n and privacy.
```

**Batch 2: Final error lane and merge**

```text
A8 executes T107 after foundation and can overlap late-running Batch 1 lanes.
A0 executes T108-T120 only after each lane has either completed its shard or
recorded a blocked lane-level reason.
```

### User Story Dependencies

- **User Story 1 (P1)**: First MVP after Foundational; no dependency on other
  stories.
- **User Story 2 (P1)**: Can start after Foundational; isolated dashboard state
  prevents config mutations from affecting other lanes.
- **User Story 3 (P1)**: Can start after Foundational; live-ready subset depends
  on Lark test credentials.
- **User Story 4 (P1)**: Can start after Foundational; A4 and A5 are independent
  because audit/playground and research/table use separate state paths.
- **User Story 5 (P1)**: Can start after Foundational; can capture UI evidence
  while other stories execute.
- **User Story 6 (P2)**: Can start after Foundational; source-boundary checks
  are strongest after A5 seeds source/research-like data, but must still record
  blocked or partial status if live data is unavailable.

### Within Each Subagent Lane

- Start the lane dashboard before browser actions and record the actual origin.
- Use a separate browser context/profile per lane.
- Capture initial page evidence before performing mutations.
- Record network/DOM observations for each action.
- Mark each scenario pass, fail, or blocked immediately after execution.
- Create defect findings before summarizing lane status.
- Update only the lane shard before handing results to A0.

## Parallel Opportunities

- T005 and T006 can run in parallel after T001-T004.
- T009 through T011 can run in parallel because they write separate preflight
  output files.
- T021, T034, T054, T066, T067, T085, and T093 can be dispatched together after
  T020 because each starts a different dashboard instance and writes a different
  lane directory.
- A4 Audit/Playground and A5 Research/Table are intentionally separate lanes
  because their seeded data and UI flows do not share files.
- A6 UI can run in parallel with A1-A5 because it reads visual states and writes
  screenshots only to the A6 lane directory.
- A7 I18n/Security can run in parallel with A1-A6 because it uses its own
  browser storage and dashboard state.
- A8 Error States can run after foundation and does not need to wait for all
  functional lanes unless it depends on a specific seeded state; if so, it must
  record that dependency in its shard.

## Parallel Example: Full Dashboard Validation

```bash
# After A0 completes T001-T020:
Task A1: "Execute T021-T033; write only artifacts/agents/A1-shell/"
Task A2: "Execute T034-T053; write only artifacts/agents/A2-config/"
Task A3: "Execute T054-T065; write only artifacts/agents/A3-auth/"
Task A4: "Execute T066,T068-T075,T084; write only artifacts/agents/A4-ops/"
Task A5: "Execute T067,T076-T083,T084; write only artifacts/agents/A5-data/"
Task A6: "Execute T085-T092; write only artifacts/agents/A6-ui/"
Task A7: "Execute T093-T106; write only artifacts/agents/A7-i18n-security/"
Task A8: "Execute T107; write only artifacts/agents/A8-errors/"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 Setup.
2. Complete Phase 2 Foundational preflight.
3. Dispatch only Agent A1 for Phase 3 User Story 1.
4. Stop and review whether shell launch, navigation, no-dashboard-login behavior,
   and global controls are reliable enough to continue.

### Parallel Full Pass

1. A0 completes Setup and Foundational work.
2. A0 dispatches A1-A7 simultaneously with the lane ownership rules above.
3. A8 runs error-state validation as soon as foundation is ready or when the
   needed seeded state exists.
4. A0 merges lane shards, audits evidence redaction, reconciles scenario
   statuses, and writes REPORT-001.

### Validation Completion Rule

A task phase is complete only when the related scenario IDs have statuses,
evidence references, and any defect or blocked records in that lane shard.
Completion must not be claimed from API success alone when the scenario requires
browser UI evidence. A0 must not publish REPORT-001 until every lane has either
completed its assigned scenarios or recorded a blocked reason with impact.
