# Feature Specification: Mode-Aware QA and Developer Workflows

**Feature Branch**: `002-mode-aware-workflows`  
**Created**: 2026-05-11  
**Status**: Draft  
**Input**: User description: "新增 mode 設定有兩個選項分別為 QA / Developer. 作用是根據選擇的 mode 提供不同能力. QA mode: 分析選中的任務並且自動檢查及如果可能進行測試(e2e 也可以是代碼測試依當前 workspace 的資訊來判斷); 提供不同的 configure 的欄位(如必要) 比如讓她填入負責人來查詢; 其他應用模式由系統補充. Developer mode: 和之前的沒有太大差異以尋找 bug 單和分析 bug 為主要功能; 新增功能, 如有負責人需要能依照負責人來展示清單或查詢結果如果未填則可以讓所有指令加上參數的方式去指定負責人名稱查詢"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Select Workflow Mode (Priority: P1)

A user configures the CLI for either QA work or developer debugging so future
commands expose the workflow defaults, prompts, and guidance that match the
selected role.

**Why this priority**: Mode is the routing decision for every later behavior.
Without a stable mode setting, QA and developer flows cannot produce different
commands, prompts, or validation guidance.

**Independent Test**: Starting from a clean configuration, select QA mode and
confirm validation/help/configure flows describe QA-oriented capabilities; then
switch to Developer mode and confirm the same flows describe bug investigation
capabilities without losing the configured table source.

**Acceptance Scenarios**:

1. **Given** no mode is configured, **When** the user runs the guided setup,
   **Then** the user can choose exactly one mode from QA and Developer and the
   selected mode is shown in subsequent readiness output.
2. **Given** an existing configured source, **When** the user changes the mode,
   **Then** source identity, auth state, and existing common field mappings are
   preserved while mode-specific fields are requested only when needed.
3. **Given** an AI agent reads structured setup status, **When** a mode is
   configured, **Then** the output clearly states the active mode and the next
   safe command for that mode.

---

### User Story 2 - QA Mode Task Verification (Priority: P1)

A QA user selects or receives a task from the configured table and asks the CLI
to analyze it, identify relevant checks from the current workspace, and run safe
tests when the workspace provides enough evidence to do so.

**Why this priority**: The main new value of QA mode is not just reading bug
records; it helps QA verify whether a selected task can be tested and reports
what was actually checked.

**Independent Test**: Configure QA mode, select a task, run the QA verification
flow, and confirm the result contains a task summary, detected test
opportunities, any executed checks, skipped checks with reasons, and an
evidence-backed report.

**Acceptance Scenarios**:

1. **Given** QA mode is active and a task is selected, **When** the user asks for
   verification, **Then** the system analyzes the selected task and current
   workspace evidence before recommending or running any checks.
2. **Given** relevant automated checks can be identified safely, **When** QA
   verification runs, **Then** those checks are executed and the report records
   command names, outcomes, and evidence.
3. **Given** no safe automated check can be identified, **When** QA verification
   runs, **Then** the system does not guess or fabricate a test and instead
   reports why automated testing was skipped and which manual checks are
   recommended.
4. **Given** a check fails, **When** the report is generated, **Then** the
   failure is separated from inferred causes and includes enough evidence for a
   developer to reproduce the observation.

---

### User Story 3 - Owner-Aware Record Discovery (Priority: P2)

A user filters list, search, triage, and mode-specific workflows by responsible
person so they can focus on tasks assigned to one person or team.

**Why this priority**: Owner filtering is explicitly requested and affects both
QA and Developer workflows. It must be consistent across record discovery
commands rather than being a one-off filter.

**Independent Test**: Configure an owner field, run list/search/filter/triage
with a stored owner default, command-level owner override, and record limit, and
verify only matching records are shown while unmatched records are excluded with
a clear criteria summary and no more than the requested limit. Then remove or
skip the owner field configuration and verify the same commands still run, with
output clearly stating that owner filtering was not applied.

**Acceptance Scenarios**:

1. **Given** an owner field is configured, **When** a user lists records with an
   owner value, **Then** only records matching that owner are displayed and the
   output states the owner criteria used.
2. **Given** a default owner is stored for the active mode, **When** a user runs
   a supported command without an owner parameter, **Then** the command applies
   the stored owner default when an owner field is configured, unless the
   command explicitly opts out.
3. **Given** a user passes an owner parameter, **When** the command runs,
   **Then** the parameter overrides the stored owner default for that run only.
4. **Given** no owner field is configured, **When** a user requests owner
   filtering, **Then** the command still runs without owner filtering and the
   output clearly states that the owner filter was not applied, why it was not
   applied, and how to configure an owner field if filtering is desired.
5. **Given** a user supplies a record limit to a supported query command,
   **When** the command returns matching records or candidates, **Then** the
   output contains no more than the requested number of items and states the
   limit that was applied.

---

### User Story 4 - Developer Mode Bug Investigation (Priority: P2)

A developer uses Developer mode to keep the existing bug triage and research
workflow, while gaining owner-aware discovery when owner information exists.

**Why this priority**: Developer mode must preserve the existing behavior that
already works while adding owner filtering without disrupting bug investigation.

**Independent Test**: Configure Developer mode with title, status, priority, and
optional owner fields; run list, filter, search, triage, and research; verify
existing bug-focused outputs remain available and owner filtering works when
requested.

**Acceptance Scenarios**:

1. **Given** Developer mode is active, **When** the user runs triage, **Then**
   records are still filtered by actionable status and sorted by configured
   priority as before.
2. **Given** Developer mode is active and an owner filter is provided, **When**
   the user runs list/search/filter/triage, **Then** the result set includes only
   matching owner records.
3. **Given** a bug is selected in Developer mode, **When** research is generated,
   **Then** the report remains focused on likely causes, recommended fixes,
   risks, and evidence boundaries.

---

### User Story 5 - Mode-Specific Guidance and Validation (Priority: P3)

A user or AI agent asks for help or readiness validation and receives guidance
specific to the active mode rather than a generic checklist.

**Why this priority**: Mode-specific capabilities are only useful if users and
agents can discover them safely.

**Independent Test**: Run help and validation in both modes and confirm each
mode reports the required fields, missing setup, next safe commands, and command
examples relevant to that mode.

**Acceptance Scenarios**:

1. **Given** QA mode is active, **When** help is requested, **Then** help
   describes task verification, test discovery, skipped checks, owner-based task
   focus, and evidence-backed QA reporting.
2. **Given** Developer mode is active, **When** help is requested, **Then** help
   describes bug list/search/filter/triage/research and owner filtering.
3. **Given** mode-specific required fields are missing, **When** validation
   runs, **Then** the output lists the missing fields and provides the guided
   configure action needed to complete them.

### Edge Cases

- The active mode is missing, malformed, or from a future unsupported version.
- A user switches modes after selecting a task in the previous mode.
- The configured owner field exists but records use different value shapes such
  as plain text, people fields, multi-select values, or empty cells.
- No owner field is configured, but a stored owner default or command-level
  owner value exists.
- Stored owner default does not match any current record.
- A command receives both a stored owner default and a command-level owner
  override.
- A query command receives a limit of zero, a negative number, or a non-integer.
- A query command applies owner, search/filter criteria, actionable status, and
  priority sorting before limiting the displayed result set.
- QA mode detects multiple possible test commands with different confidence.
- QA mode detects a potentially destructive or unsafe command.
- QA mode runs in a workspace with no recognizable test evidence.
- A selected task is deleted or no longer accessible after selection.
- A report contains both verified test output and unverified analysis.

## Requirements _(mandatory)_

### Evidence & Fact Boundaries _(mandatory)_

- **Source Evidence**: User request in this conversation; existing feature spec
  at `specs/001-lark-bitable/spec.md`; current README and CLI behavior for
  configure, list, filter, search, triage, research, help, and valid; current
  storage model in `~/.lark-bitable/config.json` and auth file in
  `~/.lark-bitable/auth.json`.
- **Assumptions vs Facts**: It is a fact that the current CLI already has
  configure, Lark login, validation, record inspection, triage, and research
  workflows. It is an assumption that QA mode should prefer safe, evidence-backed
  automated checks and otherwise provide manual verification guidance rather
  than forcing test execution.
- **Unsupported Claims**: None. This specification describes desired behavior
  and assumptions; it does not claim the new mode behavior already exists.
- **Conflict Handling**: If workspace evidence conflicts with a selected task or
  with generated report analysis, reports must present the conflict explicitly
  and keep conclusions unconfirmed until evidence resolves the conflict.

### Functional Requirements

- **FR-001**: The system MUST support an explicit workflow mode setting with
  exactly two user-facing values: QA and Developer.
- **FR-002**: The system MUST allow users to set, view, and change the active
  mode through guided setup and non-interactive command parameters.
- **FR-003**: The system MUST preserve existing common source, auth, and field
  mapping configuration when the user changes between QA and Developer modes.
- **FR-004**: The system MUST validate mode configuration before running
  mode-specific workflows and report a clear remediation when mode is missing or
  unsupported.
- **FR-005**: QA mode MUST provide a task verification workflow that analyzes
  the selected task and current workspace evidence before recommending or
  executing checks.
- **FR-006**: QA mode MUST identify safe automated checks when enough workspace
  evidence exists and MUST record which checks were selected, why they were
  selected, and their outcomes.
- **FR-007**: QA mode MUST avoid executing checks that appear unsafe,
  destructive, unrelated to the selected task, or unsupported by workspace
  evidence.
- **FR-008**: QA mode MUST report skipped automated checks with reasons and
  recommended manual verification steps.
- **FR-009**: QA mode MUST generate evidence-backed QA results that separate
  verified observations, test output, assumptions, skipped checks, risks, and
  next actions.
- **FR-010**: QA mode MUST support optional mode-specific configuration fields
  when useful, including an optional owner field and optional default owner value
  for focusing task lists.
- **FR-011**: Developer mode MUST keep the existing bug discovery, triage, and
  research workflow focused on actionable bug records and evidence-backed
  analysis.
- **FR-012**: The system MUST support owner field mapping as an optional
  first-class configuration value that can be used by both QA and Developer
  modes.
- **FR-013**: The system MUST allow supported record discovery commands to filter
  by owner when an owner field is configured.
- **FR-014**: The system MUST allow a stored owner default to be applied in the
  active mode when an owner field is configured and allow a command-level owner
  parameter to override that default for a single run.
- **FR-015**: The system MUST include owner filtering criteria in command output
  whenever owner filtering is applied, requested, skipped, or unavailable.
- **FR-016**: The system MUST NOT block record discovery when no owner field is
  configured. If an owner value is requested without an owner field, the command
  MUST continue without owner filtering and MUST explicitly report that owner
  filtering was not applied.
- **FR-021**: Supported record discovery and query commands MUST provide a
  `limit` option to cap returned records or candidates. This applies to list,
  search, filter, triage, and any mode-specific workflow that discovers records
  from the configured table.
- **FR-022**: Limit handling MUST validate that the requested limit is a positive
  integer, apply the limit after other query criteria and sorting, and include
  limit metadata in command output.
- **FR-017**: Help output MUST describe the active mode, available mode-specific
  workflows, supported owner filtering, required setup, common failures, and
  next safe commands.
- **FR-018**: Validation output MUST check the prerequisites for the requested
  mode and workflow scope and distinguish common setup gaps from mode-specific
  gaps.
- **FR-019**: AI-facing structured output MUST expose active mode, owner criteria
  when applied, skipped QA checks, executed QA checks, evidence references, and
  next safe commands without leaking secrets.
- **FR-020**: Reports and command summaries MUST keep facts, assumptions,
  analysis, and recommendations separate in both QA and Developer modes.
- **FR-023**: Developer research workflows MUST inspect the selected record with
  the detail/get command before repository research, because list, search,
  filter, and triage outputs are only candidate summaries.
- **FR-024**: Lark Bitable image and attachment evidence MUST be downloaded
  through an authenticated CLI media download request before image or
  attachment contents are treated as facts.
- **FR-025**: The system MUST provide a schema inspection command that lets
  users and AI agents retrieve configured table field names, field metadata,
  configured mappings, and observed sample values before running query
  commands on an unfamiliar table.

### Key Entities _(include if feature involves data)_

- **Workflow Mode**: The active user intent for the CLI. Values are QA and
  Developer. It controls prompts, validation, help, record discovery defaults,
  and available report workflows.
- **Mode Configuration**: Mode-specific settings layered on top of the common
  Lark source configuration, including owner field mapping and optional default
  owner.
- **Owner Criterion**: A user-provided or stored value that may restrict record
  discovery to tasks owned by a person or team when an owner field is
  configured; otherwise it records that owner filtering was requested but not
  applied.
- **QA Verification Result**: The outcome of analyzing a selected task for QA,
  including relevant workspace evidence, executed checks, skipped checks,
  manual verification guidance, risks, and next actions.
- **Selected Task**: The current Bitable record selected for QA verification or
  Developer research.

## Success Criteria _(mandatory)_

### Report Accuracy Criteria _(mandatory for AI-facing output)_

- **RA-001**: 100% of generated QA and Developer reports cite at least one
  selected task record and clearly identify any command output or workspace
  observation used as evidence.
- **RA-002**: 100% of report conclusions label unverified causes,
  recommendations, or test gaps as assumptions or unresolved items rather than
  facts.
- **RA-003**: 100% of executed QA checks in reports include enough information
  for a human to identify what was checked, whether it passed or failed, and
  what evidence supports the result.

### Measurable Outcomes

- **SC-001**: A first-time user can configure a mode and confirm the active mode
  in readiness output in under 2 minutes after Lark source and auth setup are
  already available.
- **SC-002**: In QA mode, at least 90% of selected-task verification runs produce
  either an executed-check result or a skipped-check explanation with manual next
  steps.
- **SC-003**: In Developer mode, existing bug list, search, filter, triage, and
  research workflows remain available with no loss of the current required
  outputs.
- **SC-004**: When an owner field is configured, 100% of owner-filtered record
  discovery outputs state the owner criteria and exclude records that do not
  match the requested owner.
- **SC-005**: When owner filtering is requested without an owner field, 100% of
  affected commands still return usable results while clearly marking owner
  filtering as not applied, so users and AI agents do not mistake unfiltered
  results for owner-filtered results.
- **SC-006**: Help and validation output for both modes identify the next safe
  command and missing setup items in 100% of tested incomplete configurations.
- **SC-007**: 100% of supported query command outputs respect the requested
  positive integer limit and report invalid limit values with a clear error
  instead of ignoring the option.
- **SC-008**: 100% of tested selected-record flows expose media references from
  `get` or `verify`, and authenticated media download succeeds or reports a
  clearly bounded failure without using anonymous media URLs as evidence.
- **SC-009**: When an AI agent lacks current table-shape context, the documented
  bootstrap workflow directs it to run schema inspection before guessing field
  names or status values.

## Assumptions

- QA mode is intended for verification and test guidance, not for modifying
  Lark records or source code.
- Developer mode remains the default behavior for existing users unless they
  explicitly choose QA mode or no previous mode exists.
- Automated QA checks should run only when the current workspace provides enough
  evidence to identify relevant and safe checks.
- Owner matching is case-sensitive unless future clarification or local data
  evidence justifies normalization.
- A configured owner field may represent people, text, select, or multi-select
  data; matching should use visible labels rather than internal IDs when labels
  are available.
- Owner field and default owner prompts are optional. Users may leave them blank
  during configure, and owner filtering remains inactive until an owner field is
  configured.
- Mode-specific settings are stored locally with the existing CLI configuration
  and do not require changing Lark table schema.
