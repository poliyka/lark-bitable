# Change Log

## Unreleased

- Add named table profiles managed by `configure`, plus shared `--table-profile` and `--table` selection for list, get, filter, search, schema, and write; keep active settings and shared auth unchanged, and retain view IDs as metadata only.
- Fetch explicit record ids directly and report missing records without masking other Lark errors.
- Use record-list pages of up to 500 records and keep reading the whole table regardless of configured view.
- Correct doctor auth expiry status and report token refresh failures with safe retry/login guidance.
- Validate explicit client tokens as UUIDs locally before confirmed create writes.

## 2.0.2 - 2026-07-07

### Changed

- Bumped npm package version from `2.0.1` to `2.0.2`.
- Simplified `configure` so it stores only the active Base/Bitable source, Lark app settings, and workflow mode.
- Removed persisted bug field settings from source config, dashboard config, readiness, doctor output, schema output, and bootstrap guidance.
- Kept `triage --actionable-status` as a per-run exact status filter instead of a configured default.
- Updated owner filtering to use per-run `--owner` with runtime owner-field inference instead of configured owner fields or mode default owners.

### Fixed

- Fixed record listing so active source URLs containing `view=<viewId>` no longer scope normal `list`, `filter`, `search`, `schema`, `triage`, or dashboard table reads to that view.
- Preserved `viewId` as source metadata while removing it from default record-list API requests.
- Added legacy normalization for old owner criteria values such as `mode-default` so existing audit/research records remain readable.

### Verification

Run release validation:

```bash
pnpm format:check
pnpm test
pnpm build
git diff --check
```

## 2.0.1 - 2026-05-28

### Changed

- Bumped npm package version from `2.0.0` to `2.0.1`.
- Added confirmed `write` support for local file paths in Bitable attachment/photo fields.
- Local attachment writes now upload files through Lark Drive media `upload_all`, then write the returned `file_token` objects to the target record.
- Added structured `attachmentPlan` output for preview and confirmed writes, including existing token counts, local file details, append/replace mode, and `willReplaceExisting`.
- Added `--attachment-mode preserve|replace`; the default `preserve` mode blocks accidental attachment/photo replacement before local files are uploaded.
- Clarified attachment preview output with `requestedEffect` and `replacementPolicy`; the existing `mode` field remains as a compatibility alias for `requestedEffect`.
- Updated `write` help, README guidance, and bootstrap workflow instructions with the safe append flow, evidence image upload runbook, and upload/write failure recovery steps.
- Renamed the conservative write readiness diagnostic from `write-permission-unverified` to `write-permission-not-probed` so agents do not mistake a non-mutating readiness check for a failed committed write.

### Fixed

- Fixed the previous `AttachFieldConvFail` path by converting local files to Bitable media `file_token` values before committing the record update.
- Kept preview mode non-mutating for attachments: local files are validated and reported as not-run media evidence, but are not uploaded without `--confirm`.
- Made the preserve-existing-attachments flow the default guidance so appending evidence includes existing `file_token` objects instead of replacing the field by accident.
- Removed high-risk attachment replacement confirm commands from preview `nextSafeCommands` when the current replacement policy is `preserve`; output now points agents to `get`, rebuild fields JSON with existing tokens, or use `--attachment-mode replace` only for explicit replacement.
- Preserved uploaded `file_token` values in failed write output and added a retry command that reuses those tokens instead of uploading the same local files again.
- Strengthened bootstrap stale detection with a shipped guidance marker so older installed skills are flagged for reinstall.

### Verification

Run release validation:

```bash
pnpm format:check
pnpm test
pnpm build
pnpm quickstart:validate
git diff --check
```

## 2.0.0 - 2026-05-27

### Changed

- Bumped npm package version from `1.3.0` to `2.0.0`.
- Removed OAuth scope persistence from `config.json`; Lark app configuration now stores only app credentials, domain, redirect URI, and callback settings.
- Moved dashboard writable/read-only scope selection fully into the Lark Login flow, with successful login scopes recorded in `auth.json`.
- Removed the legacy `configure --lark-scope` option; CLI writable OAuth login should now be requested with `lark-bitable lark --login --scope="bitable:app"`.
- Updated bootstrap guidance and dashboard/spec documentation so auth scopes are inspected from auth state instead of Lark app config.

### Fixed

- Fixed dashboard logout/login behavior where a writable login could be reset back to read-only by stale configured scopes.
- Fixed dashboard auth session creation so requested login scopes are stored when Lark omits scopes from the token exchange response.
- Stopped creating a synthetic read-only auth scope when no OAuth scope is present.

### Verification

Run release validation:

```bash
pnpm format:check
pnpm test
pnpm build
pnpm quickstart:validate
git diff --check
```

## 1.3.0 - 2026-05-20

### Changed

- Bumped npm package version from `1.2.0` to `1.3.0`.
- Reworked non-`--json` CLI output so command `data` renders as readable sections and tables instead of one-line JSON blobs.
- Added table-backed human rendering for common output shapes, including records, search matches, schema fields, candidates, field changes, issues, and evidence.
- Updated `schema` human output to use the shared renderer and show field metadata, sample counts, and next commands while preserving the machine-readable `--json` contract.
- Added `cli-table3` for terminal table formatting and updated command-specific help to distinguish readable human output from machine-readable JSON.
- Expanded regression coverage for human output formatting, schema output, command help, dashboard state watching, and live dashboard audit refresh behavior.

### Fixed

- Fixed dashboard state watching so config/auth invalidation still works when native `fs.watch` is unavailable, errors, or misses a delete/change event, using a polling companion that is cleaned up on watcher shutdown.
- Fixed dashboard audit detail refresh behavior so a selected or pending audit row remains selected when live updates refresh the audit list.
- Fixed dashboard audit detail error handling so unavailable selected entries stay visible with a clear remediation instead of silently jumping to another audit entry.
- Avoided dumping long report or markdown strings into human CLI output by replacing them with compact omitted-length summaries.

### Verification

Run release validation:

```bash
pnpm format:check
pnpm test
pnpm build
pnpm quickstart:validate
git diff --check
```

## 1.2.0 - 2026-05-16

### Changed

- Bumped npm package version from `1.1.1` to `1.2.0`.
- Expanded the local dashboard with WebSocket live updates so browser views react to command activity and external state changes without manual refresh.
- Added live invalidation for `config.json` and `auth.json` changes so the dashboard converges when those files are deleted or rewritten outside the dashboard process.
- Updated the dashboard overview to surface doctor-level readiness, source configuration health, auth status, and bootstrap skill status instead of only a coarse ready state.
- Improved the dashboard UI for audit filtering, date-time picking, research report display, auth scope selection, recent activity, and playground execution feedback.
- Expanded the research report flow so report titles and original details can be entered explicitly, with the selected ticket title used as the default.
- Kept the CLI and dashboard command runner resilient when the dashboard is absent and added regression coverage for concurrent external writes.

### Fixed

- Fixed dashboard state-watch behavior so it does not block concurrent CLI writes while watching config and auth files.
- Fixed the dashboard playground, research, auth, and audit interactions that previously failed to render or update correctly.
- Fixed `doctor` output so it reports the actual configuration and bootstrap health gathered from doctor-level inspection.

### Verification

Run release validation:

```bash
pnpm format:check
pnpm test
pnpm build
pnpm quickstart:validate
git diff --check
```

Release smoke checks already ran in this workspace for the dashboard server and live WebSocket updates.

## 1.0.1 - 2026-05-12

### Changed

- Bumped npm package version from `1.0.0` to `1.0.1`.
- Added repository-local Claude Code bootstrap skill support at
  `.claude/skills/lark-bitable/SKILL.md`.
- Updated bootstrap installation so `lark-bitable doctor --install-skill`
  installs project skill guidance for both Codex and Claude Code:
  - `.agents/skills/lark-bitable/SKILL.md`
  - `.claude/skills/lark-bitable/SKILL.md`
- Updated bootstrap validation so `lark-bitable valid` checks both default skill
  target directories unless `--skill-dir` is explicitly provided.
- Expanded `doctor --json` bootstrap output with `bootstrapSkillPaths` and
  `bootstrapSkillTargets` for multi-agent install visibility.

### Fixed

- Documented the local development recovery step for stale pnpm global links
  that still point at the old `hybrid-im-qa-lark-cli` project path:

  ```bash
  pnpm remove --global hybrid-im-qa-lark-cli
  pnpm link --global
  hash -r
  lark-bitable --version
  ```

### Publish Checklist

Before publishing `1.0.1`, verify package metadata:

```bash
node -p "require('./package.json').name"
node -p "require('./package.json').version"
node -p "require('./package.json').license"
```

Expected output:

```text
lark-bitable
1.0.1
MIT
```

Run release validation:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm test
pnpm build
pnpm quickstart:validate
git diff --check
npm pack --dry-run
```

Confirm `npm pack --dry-run` includes at least:

```text
package.json
README.md
change-log.md
LICENSE
bin/run.js
dist/
src/bootstrap/skill/SKILL.md
```

Publish:

```bash
npm publish --access public
```

Post-publish validation:

```bash
npm view lark-bitable@1.0.1 version
npx lark-bitable@1.0.1 --version
```

If this workspace has been linked globally with `pnpm link --global`, unlink it
before validating the published package so the check exercises npm rather than
the local workspace.
