# Feature Specification: Lark Bitable CLI for AI Bug Triage

**Feature Branch**: `001-lark-bitable-cli`  
**Created**: 2026-05-07  
**Status**: Draft  
**Input**: User description: "$speckit-specify 參考 Lark 多維表格官方文件，
建立一個 CLI 工具，讓 AI 能取得使用者配置的 Lark 多維表格頁面資訊，支援
configure/help/get/filter/search，引導 AI 從 bug 表單挑選項目、研究錯誤並產出
原因與修正建議報告。更新：工具要有 bootstrap skill install 方法，讓 AI 知道
怎麼安裝、啟用並使用這個工具。更新：加入互動式 `lark-bitable lark --login` CLI 指令，登入
後把 Lark token 存到使用者家目錄下的 auth 檔，否則 API 不可使用。更新：加入
`valid` 功能，用來驗證是否有未完成配置導致功能無法使用，並提供解決方法或引導
配置。"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Configure a Lark Bitable Source (Priority: P1)

A developer configures the CLI by pasting a Lark Base/Bitable URL so future
commands can work against that user's selected bug table instead of a single
hard-coded table.

**Why this priority**: The tool cannot serve multiple tables or users unless the
target table is configurable before query and triage commands run.

**Independent Test**: Start from no saved configuration, run the configure flow
with a valid Lark Base URL, then ask the CLI to show the active configuration
without requiring the user to paste the URL again.

**Acceptance Scenarios**:

1. **Given** no active table configuration, **When** the user runs the configure
   command and pastes a Lark Base URL containing a base token, table id, and view
   id, **Then** the CLI stores the active source and displays the parsed table
   identity for confirmation.
2. **Given** an existing active table configuration, **When** the user runs the
   configure command with a new Lark Base URL, **Then** the CLI replaces the
   active source only after showing the old and new identities.
3. **Given** a URL that lacks required table identity parts, **When** the user
   runs configure, **Then** the CLI rejects it with a clear correction message
   and leaves the previous configuration unchanged.

---

### User Story 2 - Inspect, Filter, and Search Table Records (Priority: P1)

An AI agent or developer lists records, gets a specific record, filters by field
values, and searches across visible bug data so it can inspect current project
issues without opening the Lark UI manually.

**Why this priority**: AI-assisted bug fixing depends on reliable access to the
bug table's current records and fields.

**Independent Test**: With a configured table that has accessible records, run
list/get/filter/search commands and verify the returned rows include record
identity, visible fields, and evidence metadata for the source table.

**Acceptance Scenarios**:

1. **Given** an active configuration and accessible table records, **When** the
   user runs the list command, **Then** the CLI returns a readable table of
   records with stable record identifiers and selected fields.
2. **Given** a known record identifier, **When** the user runs the get command,
   **Then** the CLI returns that record's full visible fields and source
   evidence.
3. **Given** a filter expression such as status, priority, owner, or text value,
   **When** the user runs the filter command, **Then** the CLI returns only
   matching records and states the filter criteria applied.
4. **Given** a search term, **When** the user runs the search command, **Then**
   the CLI returns matching records and identifies which fields matched.

---

### User Story 3 - Guided Bug Selection for AI Workflows (Priority: P1)

A developer starts a guided bug-fixing workflow. The CLI reads the bug table,
sorts bug candidates by priority, excludes items that are not in the actionable
"待處理" state, and presents a selectable list so the user can choose the bug for
the AI to solve in the current repository.

**Why this priority**: The tool's main purpose is to guide an AI agent toward the
right bug in the current project, not only to expose raw table data.

**Independent Test**: With a configured bug table containing records across
multiple statuses and priorities, run the guided selection flow and verify the
displayed candidate list is sorted by priority and contains only actionable
items.

**Acceptance Scenarios**:

1. **Given** a configured bug table with status and priority fields, **When** the
   user starts the triage command, **Then** the CLI queries the bug records,
   excludes records outside the actionable state, sorts remaining records by
   priority, and displays numbered choices.
2. **Given** displayed bug choices, **When** the user selects one item, **Then**
   the CLI records the selected bug context and shows the fields the AI should
   use for investigation.
3. **Given** the bug table has no actionable records, **When** the user starts
   triage, **Then** the CLI reports that no candidate is available and suggests
   running a broader list or filter command.

---

### User Story 4 - Research and Report on a Selected Bug (Priority: P2)

After selecting a bug, the user asks the AI to research the current repository
and produce a first report that explains the likely cause, supporting evidence,
and recommended fix plan.

**Why this priority**: The selected bug needs to become an evidence-backed
investigation artifact before implementation starts.

**Independent Test**: Select a bug record, run the research/report flow, and
verify the first report separates facts, assumptions, analysis, risks, and
recommended next actions.

**Acceptance Scenarios**:

1. **Given** a selected bug record, **When** the user requests research, **Then**
   the CLI provides the AI with the selected bug context and current repository
   context needed to investigate.
2. **Given** repository evidence has been collected, **When** the report is
   generated, **Then** the report cites the bug record, searched files, commands
   run, and any assumptions that remain unresolved.
3. **Given** the AI cannot find enough evidence for a cause, **When** it produces
   the report, **Then** the report marks the cause as unconfirmed and lists the
   missing evidence needed before implementation.

---

### User Story 5 - Discover Commands Through Help (Priority: P2)

A developer or AI agent can run help commands to understand the CLI workflow,
available commands, required inputs, output formats, and examples without
reading external documentation first.

**Why this priority**: AI agents need explicit command guidance to avoid guessing
the workflow or invoking unsupported commands.

**Independent Test**: Run the global help command and command-specific help for
every command module, including help itself, then verify each describes purpose,
human usage, AI usage, inputs, outputs, examples, next steps, and common errors.

**Acceptance Scenarios**:

1. **Given** a new user, **When** they run the global help command, **Then** the
   CLI explains the recommended workflow from configuration to triage report.
2. **Given** a command name, **When** the user requests command-specific help,
   **Then** the CLI explains that command's required inputs, optional filters,
   output fields, and examples.

---

### User Story 6 - Bootstrap AI Usage Through Installable Skill (Priority: P1)

A developer installs a bootstrap skill or equivalent AI-facing setup guide so an
AI agent can discover the CLI, verify installation, configure Lark access, and
use the supported workflow without relying on hidden project knowledge.

**Why this priority**: The tool is meant to be used by AI agents. If the AI does
not know how to install, activate, and call the CLI, the core triage workflow is
not reliably usable.

**Independent Test**: Starting from a repository where the CLI is not yet known
to the AI agent, follow the documented bootstrap install flow, then ask the AI
agent to run its self-check and summarize the available workflow.

**Acceptance Scenarios**:

1. **Given** a repository that contains the CLI package or installable artifact,
   **When** the user runs the bootstrap install instructions, **Then** the AI
   agent can find the CLI command, run a version or health check, and report the
   exact command it will use.
2. **Given** the bootstrap skill is installed, **When** an AI agent starts work
   in the current repository, **Then** it can discover the configure, list, get,
   filter, search, triage, and research/report workflow from the skill without
   guessing command syntax.
3. **Given** installation or configuration is incomplete, **When** the AI agent
   runs the bootstrap self-check, **Then** it reports the missing step and does
   not attempt table access until the user resolves it.

---

### User Story 7 - Login to Lark for API Access (Priority: P1)

A developer runs an interactive `lark-bitable lark --login` command before any table access.
The command guides the user through Lark authorization, stores the resulting
token state in a user-home auth file, and lets subsequent API commands call Lark
without asking for tokens on every run.

**Why this priority**: Lark API access is not usable for this tool until a valid
user login token exists. Query, triage, and research commands must fail closed
when login is missing or invalid.

**Independent Test**: Start with no auth file, run `lark-bitable lark --login`, complete the
interactive authorization flow, then run an auth status check and a table command
that requires Lark API access.

**Acceptance Scenarios**:

1. **Given** no auth file exists, **When** the user runs `lark-bitable lark --login` and
   completes authorization, **Then** the CLI writes token state to
   `~/.lark-bitable-cli/auth.json` and reports that API access can be attempted.
2. **Given** no valid login exists, **When** the user runs list, get, filter,
   search, triage, or research against Lark data, **Then** the CLI refuses the
   API call and instructs the user to run `lark-bitable lark --login`.
3. **Given** the auth file exists but the token is expired or invalid, **When**
   the user runs an API command, **Then** the CLI refreshes the token when
   possible or reports that re-login is required.
4. **Given** the user wants to remove local access, **When** they run logout,
   **Then** the CLI clears the stored token state and future API commands require
   login again.

---

### User Story 8 - Validate Readiness and Guide Missing Configuration (Priority: P1)

A developer or AI agent runs `valid` to verify whether any missing or incomplete
configuration prevents the CLI from working. The command reports each blocking
item and provides a concrete fix or guided configuration path.

**Why this priority**: The CLI has multiple prerequisites: installation,
bootstrap skill, Lark login, active Bitable URL, field mappings, authorization,
and selected bug context. Users and AI agents need one validation command that
turns incomplete setup into actionable next steps.

**Independent Test**: Start from a fresh environment with no auth file and no
configured table, run `valid`, follow the suggested remediation steps, and rerun
`valid` until it reports readiness for the requested workflow.

**Acceptance Scenarios**:

1. **Given** login is missing, **When** the user runs `valid`, **Then** the CLI
   reports that Lark auth is missing and instructs the user to run `lark-bitable lark --login`.
2. **Given** auth exists but no Bitable source is configured, **When** the user
   runs `valid`, **Then** the CLI reports the missing source and starts or links
   to the configure flow.
3. **Given** a Bitable source is configured but required bug field mappings are
   missing, **When** the user runs `valid --workflow triage`, **Then** the CLI
   lists missing fields and guides the user to map status, priority, and title.
4. **Given** all prerequisites for a workflow are ready, **When** the user runs
   `valid`, **Then** the CLI reports readiness and names the next safe command.

### Edge Cases

- `valid` is run before bootstrap skill installation.
- `valid` is run for a specific workflow such as inspect, triage, or research
  and only that workflow's prerequisites should block readiness.
- `valid` finds multiple missing prerequisites and must present them in an order
  the user can resolve.
- `valid` cannot verify live Lark access due to network failure and must mark the
  result as partial rather than ready.
- User cancels the interactive login flow before authorization completes.
- Login callback, browser handoff, or pasted authorization code fails.
- `~/.lark-bitable-cli/auth.json` is missing, malformed, unreadable, or contains
  expired token state.
- Auth file permissions allow other local users to read token data.
- Multiple Lark accounts or apps are available and the active account is
  ambiguous.
- Stored token lacks the scopes or permissions required for the configured
  Bitable source.
- Logout runs when no auth file exists.
- Bootstrap skill is installed but the CLI binary or package is missing.
- CLI is installed but not available on the active command path.
- Multiple versions of the CLI are present and the AI must report which one it
  will use.
- Bootstrap skill instructions are stale relative to the installed CLI help
  output.
- Configured table URL is valid in shape but the user or app lacks permission to
  read it.
- The configured table exists but the selected view is deleted or inaccessible.
- Expected bug fields such as status or priority have different names,
  languages, or option values.
- Records exceed one page of results and require pagination before sorting or
  filtering.
- A record has missing priority, status, owner, reproduction steps, or error
  description values.
- Multiple records match the same search term or have the same priority.
- Network access, Lark authorization, or token refresh fails during a command.
- The current repository has uncommitted changes or insufficient files to support
  the selected bug investigation.
- The research report has only partial evidence and must avoid claiming a
  confirmed root cause.

## Requirements _(mandatory)_

### Evidence & Fact Boundaries _(mandatory)_

- **Source Evidence**:
  - User request in this conversation on 2026-05-07 defines the CLI purpose,
    required configure/help/get/filter/search functions, guided bug selection,
    and first research report.
  - Follow-up user request on 2026-05-07 adds that the tool needs a bootstrap
    skill install method so AI agents know how to install and use the tool.
  - Follow-up user request on 2026-05-07 adds an interactive `lark-bitable lark --login` CLI
    command and requires stored token state under a user-home auth file because
    Lark APIs cannot be used before login.
  - Follow-up user request on 2026-05-07 adds a `valid` feature that checks
    incomplete configuration causing unusable functionality and provides
    remediation or guided configuration.
  - The larksuite/lark-openapi-mcp CLI reference observed on GitHub on
    2026-05-07 describes a Lark login command for obtaining user access tokens,
    logout for clearing stored tokens, and user token mode for API calls.
  - Lark official Bitable overview page observed through Chrome DevTools on
    2026-05-07: `https://open.larksuite.com/document/server-docs/docs/bitable-v1/bitable-overview?lang=zh-CN`.
  - The official page visibly states that Base/Bitable exposes resources such as
    app, table, view, record, and field; shows read endpoints for listing tables,
    listing views, listing records, getting records, and listing fields; states
    `app_token`, `table_id`, and `view_id` resource concepts; and notes access
    requires appropriate Bitable collaboration or ownership.
  - Example Lark Base page observed through Chrome DevTools on 2026-05-07:
    `https://u5ijellsw5.sg.larksuite.com/base/TypDbjKBfaJcaSsoEI1lZjHsgIY?table=tblp8ig36Itp0yOU&view=vewb6FrjBe`.
  - The example page's visible title is "Narra Messager 项目管理"; visible table
    labels include "bug记录", "项目需求管理", and "表格"; DevTools did not expose
    concrete record rows or field values in the accessibility snapshot.
- **Assumptions vs Facts**:
  - Verified facts are limited to the user request, the official documentation
    observations, and the visible example page labels listed above.
  - The spec assumes the initial product is read-focused for bug triage and
    reporting; write-back to Lark records is out of scope for the first version.
  - The spec assumes status and priority fields can be mapped by configuration
    when table field names differ from the example or from Chinese labels.
  - The spec assumes the bootstrap mechanism is delivered as AI-facing
    installation guidance plus an installable skill or equivalent local agent
    instruction package; the exact packaging format is deferred to planning.
  - The spec chooses `~/.lark-bitable-cli/auth.json` as the concrete default auth
    path for the user's `~/.xxx/auth.json` requirement.
- **Unsupported Claims**: None. Example table row contents, exact field schema,
  and actual bug status values were not visible in DevTools and are not asserted
  as facts.
- **Conflict Handling**: If Lark API data, Lark UI observations, and saved CLI
  configuration disagree, the CLI must report the conflict and require the user
  to choose or reconfigure before guided triage continues.

### Functional Requirements

- **FR-001**: The CLI MUST provide a configure command that accepts a Lark
  Base/Bitable URL and stores the active source for later commands.
- **FR-002**: The configure flow MUST parse and show the base token, table id,
  and view id when those values are present in the URL.
- **FR-003**: The CLI MUST allow users to view, replace, and clear the active
  table configuration.
- **FR-004**: The CLI MUST provide detailed global help and command-specific
  help for help, lark login/logout, valid, configure, list, get, filter, search,
  triage, research/report, and bootstrap self-check workflows.
- **FR-005**: The CLI MUST provide a list command that returns records from the
  configured table or view with record identifiers and visible field values.
- **FR-006**: The CLI MUST provide a get command that returns one selected record
  by stable record identifier or selectable row reference.
- **FR-007**: The CLI MUST provide a filter command that filters records by
  field name, comparison, and value, and reports the criteria applied.
- **FR-008**: The CLI MUST provide a search command that searches across visible
  text-like field values and reports matching fields for each result.
- **FR-009**: List, get, filter, and search outputs MUST include enough source
  metadata for an AI agent to cite which configured table, view, record, and
  retrieval time produced the result.
- **FR-010**: The CLI MUST support a guided triage command that queries the bug
  table, excludes non-actionable records, sorts candidates by priority, and
  presents a numbered selection list.
- **FR-011**: The default actionable status MUST be "待處理"; users MUST be able
  to override the status field name and actionable status value in configuration.
- **FR-012**: The triage flow MUST preserve the selected bug context for the next
  research/report command in the same workflow.
- **FR-013**: The research/report command MUST create a first investigation
  report for the selected bug that separates observed facts, assumptions,
  analysis, likely causes, recommended fixes, risks, and next actions.
- **FR-014**: The research/report output MUST cite the bug record evidence and
  repository evidence used for every factual claim.
- **FR-015**: The research/report output MUST mark unverified causes,
  incomplete repository checks, and missing bug-table fields as unresolved
  instead of presenting them as confirmed facts.
- **FR-016**: The CLI MUST show clear errors for missing configuration,
  invalid URLs, authorization failures, inaccessible tables/views, empty result
  sets, and ambiguous field mappings.
- **FR-017**: The CLI MUST support output that is readable by humans and stable
  enough for AI agents to parse, including a structured mode for automation.
- **FR-018**: The CLI MUST avoid destructive changes to Lark records in the first
  version unless a later specification explicitly adds write-back behavior.
- **FR-019**: The project MUST provide a bootstrap install method that lets a
  developer install AI-facing instructions for using the CLI in a repository.
- **FR-020**: The bootstrap instructions MUST tell an AI agent how to verify the
  CLI is installed, identify the command it will invoke, and report the active
  CLI version or equivalent health status.
- **FR-021**: The bootstrap instructions MUST describe the expected AI workflow:
  check installation, configure a Lark Base URL, inspect records, run guided
  triage, and produce an evidence-backed research report.
- **FR-022**: The bootstrap self-check MUST fail closed when required install,
  configuration, or authorization prerequisites are missing; it must report the
  missing prerequisite instead of attempting table access.
- **FR-023**: Bootstrap guidance MUST stay consistent with the CLI's own help
  output; if they conflict, the AI agent must report the conflict as an
  unresolved setup issue.
- **FR-024**: The CLI MUST expose an interactive `lark-bitable lark --login` command that
  guides the user through Lark authorization before any Lark API command can run.
- **FR-025**: `lark-bitable lark --login` MUST support both
  `--auth-mode sso` and `--auth-mode code`. SSO mode MUST use configured Lark app
  credentials, start a local callback server, open or present the Lark
  authorization URL, wait for the browser callback, and exchange the callback
  authorization code; code mode MUST preserve the direct authorization-code
  exchange for environments where the code was obtained elsewhere. Neither mode
  may require the user to paste raw access tokens into normal command arguments.
- **FR-025a**: SSO login MUST use the OAuth Redirect URL registered in Lark
  Developer Console > Security Settings. The CLI MUST preserve the configured
  host, port, and path exactly in the `redirect_uri` parameter, and MUST NOT
  instruct users to use the app event callback URL as the OAuth redirect URI.
- **FR-025b**: Interactive `configure` MUST attempt to read the Bitable field
  list with Lark app credentials after the user provides a Base URL and app
  id/secret. When fields are returned, it MUST present status, priority, and
  title mapping prompts as numbered choices, and MUST present actionable status
  values as numbered choices from discovered status options or existing record
  values. If field discovery fails, it MUST stop interactive configuration and
  report remediation without exposing app secrets or tokens instead of asking
  humans to type field names.
- **FR-026**: After successful login, the CLI MUST write token state to
  `~/.lark-bitable-cli/auth.json` and include enough metadata to determine
  expiration, active Lark domain, account/app identity, and scopes.
- **FR-027**: The auth file MUST live outside the current repository and MUST
  NOT be included in generated reports, command logs, or AI-facing evidence
  except as a redacted path/status reference.
- **FR-028**: Commands that call Lark APIs MUST check for a valid auth state
  before sending requests; missing, expired, malformed, or insufficient auth
  state MUST fail closed with remediation text.
- **FR-029**: The CLI MUST provide logout or equivalent auth clearing behavior
  that removes locally stored token state and makes future API commands require
  login again.
- **FR-030**: Doctor/bootstrap self-check output MUST include Lark login status
  as `ready`, `missing`, `expired`, or `invalid`, without printing raw tokens.
- **FR-031**: The CLI MUST provide a `valid` command that checks whether the
  requested workflow can run with current install, bootstrap, login,
  configuration, authorization, field mapping, and selection state.
- **FR-032**: `valid` MUST report every blocking missing or invalid prerequisite
  with a specific remediation command or guided configuration step.
- **FR-033**: `valid` MUST support workflow-scoped validation for at least
  inspect, triage, and research workflows.
- **FR-034**: `valid` MUST distinguish `ready`, `partial`, and `blocked`
  readiness states, and MUST not mark a workflow ready when live verification is
  skipped, failed, or inconclusive.
- **FR-035**: When `valid` detects incomplete configuration that can be fixed
  interactively, it MUST offer or point to the appropriate guided command such as
  `lark-bitable lark --login` or configure.

### Key Entities _(include if feature involves data)_

- **Bitable Source Configuration**: The user's active Lark Base/Bitable URL,
  parsed base token, table id, view id, optional display name, field mappings,
  and actionable status settings.
- **Bitable Record**: A row retrieved from the configured source, including a
  stable record identifier, field values, source metadata, and retrieval time.
- **Bug Candidate**: A Bitable record interpreted through configured bug fields
  such as title, status, priority, owner, reproduction steps, expected behavior,
  actual behavior, and links.
- **Triage Selection**: The user's chosen bug candidate and the evidence used to
  choose it, preserved for the research/report workflow.
- **Research Report**: The first AI-facing investigation output containing bug
  facts, repository evidence, assumptions, analysis, likely causes,
  recommendations, risks, and next actions.
- **Bootstrap Skill**: AI-facing installation and usage guidance that explains
  how to discover the CLI, verify it is installed, configure a source, execute
  table inspection commands, run guided triage, and produce reports.
- **Install State**: The observable result of bootstrap setup, including whether
  the AI can find the CLI command, what command/version it will use, and which
  setup prerequisites remain missing.
- **Lark Auth Session**: Locally stored login state containing redacted account
  and app identity, Lark domain, token expiration metadata, scopes, storage path,
  and readiness status. Raw token values are secrets and must not appear in
  reports or normal command output.
- **Validation Result**: A readiness report for a global or workflow-scoped
  check, including status, checked prerequisites, blocking issues, remediation
  commands, and the next safe command.

## Success Criteria _(mandatory)_

### Report Accuracy Criteria _(mandatory for AI-facing output)_

- **RA-001**: 100% of factual claims in a research report identify their source
  as a bug record field, repository file, command output, user input, or marked
  runtime observation.
- **RA-002**: 100% of assumptions and inferred causes in a research report are
  labeled separately from observed facts.
- **RA-003**: Every research report includes enough selected bug context and
  repository evidence references for another AI agent or developer to audit the
  conclusion without reopening the full Lark UI.
- **RA-004**: Bootstrap self-check output identifies the installation evidence
  used, including the command path or invocation method, version or health
  status, and any missing prerequisites.
- **RA-005**: Auth status evidence identifies only redacted auth file path,
  readiness status, domain, expiration metadata, and missing prerequisites; raw
  access or refresh tokens never appear in AI-facing reports.
- **RA-006**: Validation output identifies checked prerequisites, evidence for
  readiness or blockage, skipped checks, and remediation steps without exposing
  secrets.

### Measurable Outcomes

- **SC-001**: A first-time user can configure a Lark Base URL and confirm the
  active table identity in under 2 minutes.
- **SC-002**: Given an accessible table with at least 50 records, users can list,
  filter, search, and retrieve a selected record without manually opening Lark.
- **SC-003**: In guided triage, actionable candidates are shown in priority order
  and exclude records outside the configured actionable status in 100% of test
  cases with known expected data.
- **SC-004**: 100% of command modules expose command-specific help that is
  understandable to a developer or AI agent without reading external
  documentation, as measured by the help coverage test and documented examples
  in review.
- **SC-005**: A selected bug can be turned into a first investigation report that
  includes facts, assumptions, analysis, recommendation, risks, and next actions
  in one guided workflow.
- **SC-006**: The CLI reports authorization, inaccessible source, empty result,
  and ambiguous field mapping failures with actionable remediation text in 100%
  of validation cases.
- **SC-007**: A fresh AI agent can follow the bootstrap install method and
  summarize the supported CLI workflow without additional human explanation in
  at least 90% of validation runs.
- **SC-008**: Bootstrap self-check detects missing CLI installation, missing
  configuration, and unavailable authorization prerequisites in 100% of
  validation cases.
- **SC-009**: Starting with no auth file, a user can complete `lark-bitable lark --login` and
  produce a usable auth status in under 3 minutes when Lark authorization is
  available.
- **SC-010**: API commands refuse to run without valid login state in 100% of
  validation cases and tell the user the exact login command to run.
- **SC-011**: Logout clears stored auth state, and the next Lark API command
  requires login again in 100% of validation cases.
- **SC-012**: `valid` identifies missing login, missing Bitable source, missing
  field mappings, and missing selected bug context in 100% of validation cases.
- **SC-013**: At least 90% of users or AI agents can follow `valid` remediation
  output to reach readiness for inspect or triage workflows without reading
  external documentation.

## Assumptions

- The first version is read-focused: it helps AI agents inspect and reason about
  bug records, but does not update Lark records or change bug status.
- Users have or can provide whatever Lark authorization is required to read the
  configured Base/Bitable table.
- User-level Lark API access is the default mode for this tool because the
  target Base may contain user-visible or private table data.
- The configured table is intended to represent bug or project-management data,
  but field names can differ by language and must be configurable.
- The default guided triage workflow treats "待處理" as the actionable status and
  excludes records with other status values.
- Priority sorting can use configured priority ordering when raw field values are
  not naturally sortable.
- The current working directory is the repository the selected bug should be
  researched against.
- The bootstrap skill is intended to teach AI agents how to use the tool, not to
  replace user-controlled Lark authorization or configuration.
- The auth file path may be configurable later, but the first version uses
  `~/.lark-bitable-cli/auth.json` by default.
