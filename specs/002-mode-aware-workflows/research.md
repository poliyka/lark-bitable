# Research: Mode-Aware QA and Developer Workflows

## Evidence Sources

- User request on 2026-05-11 requires two modes, `QA` and `Developer`, with
  mode-specific capabilities and owner-aware discovery.
- [spec.md](./spec.md) defines functional requirements FR-001 through FR-020
  and report accuracy criteria RA-001 through RA-003.
- `package.json` shows the current TypeScript/oCLIF/Vitest stack and Node
  `>=22` engine requirement.
- `src/config/schema.ts` currently defines Bitable source config, field aliases,
  auth session, validation result, triage selection, and research report
  schemas.
- `src/config/store.ts` persists source, Lark app settings, and last selection
  under the unified `~/.lark-bitable/config.json` store.
- `src/config/auth-store.ts` persists auth under
  `~/.lark-bitable/auth.json`.
- `src/cli/shared-records.ts` is the existing shared path for loading config,
  auth, and records for list/get/filter/search/triage-like commands.
- `src/triage/candidate-sort.ts` already extracts owner from
  `source.fieldAliases.owner`, but current commands do not expose owner-aware
  filtering.
- `src/reporting/research-report.ts` and `src/reporting/evidence.ts` implement
  existing report evidence and secret-redaction behavior.

## Decisions

### Decision: Store `QA` and `Developer` as explicit local workflow modes

**Rationale**: The user-facing mode values are part of the feature contract, and
commands/help/valid need a stable, machine-readable value. Existing users should
not lose current bug workflow behavior, so `Developer` is the backward-compatible
default when no mode has been explicitly configured.

**Alternatives considered**:

- Infer mode from command name: rejected because validation/help/configure need a
  durable setup state before a mode-specific command runs.
- Store only lowercase internal values: possible, but the spec requires exact
  user-facing values. The implementation may normalize internally, but
  structured output must expose `QA` or `Developer`.

### Decision: Extend the existing config store instead of adding a new file

**Rationale**: Source, field mappings, Lark app settings, and last selection are
already stored under `~/.lark-bitable/config.json`. Mode and owner defaults
are part of the same workflow configuration, so colocating them keeps
`valid`, `configure`, and AI bootstrap checks simple and auditable.

**Alternatives considered**:

- Add `mode.json`: rejected because it creates multiple readiness sources for a
  single CLI state and increases migration risk.
- Store mode in the repo: rejected because mode is user/workstation state and
  should not be committed.

### Decision: Preserve common source/auth/field configuration across mode changes

**Rationale**: The user explicitly requires mode switching without losing the
configured Lark source. Common field mappings such as status, priority, title,
and owner are not inherently mode-specific and should remain available to both
modes.

**Alternatives considered**:

- Maintain fully separate per-mode source configs: rejected for this feature
  because it would force users to repeat Base URL and Lark app setup when the
  same table supports both workflows.

### Decision: Add owner field as an optional first-class field alias plus per-mode default owner

**Rationale**: Existing `fieldAliases.owner` gives a natural place for the Lark
field mapping when the table has an owner-like column. The default owner is a
workflow preference, not a table schema property, so it belongs in mode-specific
config. Both owner field and default owner remain optional, and command-level
`--owner` overrides the stored default for one run when owner filtering can be
applied.

**Alternatives considered**:

- Add separate `qaOwnerField` and `developerOwnerField`: rejected because the
  owner field is the same table column in normal use and duplicated mappings
  would drift.
- Make owner mandatory: rejected because existing Developer workflows must keep
  working when no owner field exists.

### Decision: Centralize owner filtering in shared record discovery helpers

**Rationale**: `list`, `search`, `filter`, `triage`, and QA verification need the
same owner criteria semantics. A shared helper can normalize field values,
apply filters when an owner field exists, and attach criteria metadata
consistently. When an owner value is requested but no owner field is configured,
the helper must return unfiltered records with `ownerCriteria.applied=false` and
a clear not-applied reason instead of blocking the command.

**Alternatives considered**:

- Implement owner filtering independently in each command: rejected because it
  risks inconsistent matching and inconsistent remediation.
- Push owner filtering into Lark API query expressions first: deferred because
  current commands already fetch records and operate over fixtures; local
  filtering is deterministic and easier to test. API-side filtering can be added
  later as an optimization if the same criteria metadata is preserved.

### Decision: Add a shared query limit contract for record discovery commands

**Rationale**: `list` already supports `--limit`, while `search`, `filter`, and
`triage` currently do not. The user explicitly requires filter/search and
related query commands to support limiting result count. A shared contract keeps
limit validation and output metadata consistent across record discovery
commands.

**Alternatives considered**:

- Limit only `list`: rejected because search/filter can return large result
  sets and the user explicitly called out those commands.
- Apply limit before filtering/searching: rejected because that can hide matches
  that appear later in the fetched records and makes the result set misleading.
  The limit should cap records or candidates after criteria and sorting.
- Add separate option names such as `--max-results`: rejected because existing
  CLI behavior already uses `--limit`.

### Decision: Owner matching uses visible labels and exact match by default

**Rationale**: Lark Bitable owner-like fields may be plain text, people objects,
select values, or multi-select arrays. AI-facing results must explain what was
matched. Exact matching avoids silently broadening results. Matching extracts
visible labels such as strings, `name`, `text`, `email`, `displayName`, or select
labels when present.

**Alternatives considered**:

- Case-insensitive or fuzzy matching: deferred because the spec assumption says
  owner matching is case-sensitive unless future evidence justifies
  normalization.
- Match only people field IDs: rejected because humans and reports need visible
  owner values, and IDs may not be available in all field shapes.

### Decision: Add `lark-bitable verify` for QA mode verification

**Rationale**: Existing `research` is Developer-focused and produces likely
causes/fix guidance. QA verification has different output: executed checks,
skipped checks, manual verification guidance, and pass/fail evidence. A separate
`verify` command keeps command intent clear while reusing selected record and
evidence primitives.

**Alternatives considered**:

- Extend `research` with `--mode QA`: rejected because it would mix bug-fix
  research and QA verification outputs in one command.
- Add nested command `qa verify`: possible with oCLIF topics, but the existing
  command surface is flat and `verify` is easier for humans and AI agents to
  discover.

### Decision: QA verification can run only safe checks backed by workspace evidence

**Rationale**: The spec requires automatic checks when possible, but the
constitution forbids unsupported claims. `verify` must inspect evidence such as
`package.json` scripts, test directories, config files, and README commands
before selecting checks. It must refuse commands that look destructive,
unrelated, or unsupported.

**Alternatives considered**:

- Always run `pnpm test`: rejected because some workspaces are not Node
  projects, may require another package manager, or may have expensive or
  unrelated tests.
- Ask the user to type a test command every time: rejected because QA mode
  should help discover checks when evidence exists.

### Decision: Use an allowlist plus denylist for QA command execution

**Rationale**: Safe automation needs both positive evidence and negative
screening. The first implementation should consider package-manager scripts with
names like `test`, `test:*`, `e2e`, `lint`, or `typecheck` as candidates when
present, while rejecting commands containing destructive or environment-changing
tokens such as `rm`, `reset --hard`, `push`, `publish`, `deploy`, `prisma
migrate deploy`, or unchecked shell redirection.

**Alternatives considered**:

- Full shell static analysis: rejected as too broad for this feature and likely
  to produce false confidence.
- Run only unit tests and never E2E: rejected because the user explicitly
  mentioned E2E when workspace evidence supports it.

### Decision: QA reports record executed and skipped checks separately

**Rationale**: A failed command, a skipped command, and an unverified
recommendation mean different things. Reports must expose command, working
directory, selection reason, exit status, relevant output excerpt, evidence
references, skipped reason, and manual next steps.

**Alternatives considered**:

- Summarize checks in a single paragraph: rejected because AI consumers need
  structured, auditable evidence and skipped-check reasons.

### Decision: `valid` becomes mode-aware and workflow-aware

**Rationale**: Existing `valid` checks global/inspect/triage/research scopes.
This feature adds mode as a prerequisite for mode-specific workflows. QA
verification needs source/auth/selected task or record id plus workspace check
discovery; Developer research needs existing field mappings and selection
behavior.

**Alternatives considered**:

- Let mode-specific commands fail independently: rejected because the user
  requires guided human usage and AI agents need a next safe command before
  acting.

### Decision: Help output includes active mode and mode-specific examples

**Rationale**: The user explicitly requires every command to have human-readable
help. The active mode affects what the next useful command is, so global and
command-specific help should show relevant QA or Developer examples while still
documenting shared commands.

**Alternatives considered**:

- Static help only: rejected because it cannot tell a human or AI agent whether
  the configured mode is QA or Developer.

## Resolved Clarifications

- **Default mode for existing users**: `Developer`, because it preserves current
  behavior.
- **New QA command name**: `verify`.
- **Owner field mapping**: optional shared `fieldAliases.owner`; per-mode
  defaults store preferred owner values when users choose to configure them.
- **Owner override precedence**: command-level `--owner` wins over the active
  mode default for that single run.
- **Owner filtering without owner field**: do not block. Continue without owner
  filtering, set `ownerCriteria.applied=false`, include a missing-owner-field
  reason, and show configure guidance for users who want owner filtering.
- **QA check execution**: run only checks selected from workspace evidence and
  passing safety screening; otherwise report skipped checks and manual steps.
- **Lark writes**: still out of scope. QA mode must not modify Bitable records
  or source files.
