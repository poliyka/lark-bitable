# Change Log

## 1.3.0 - 2026-05-20

### Changed

- Bumped npm package version from `1.2.0` to `1.3.0`.
- Reworked non-`--json` CLI output so command `data` renders as readable sections and tables instead of one-line JSON blobs.
- Added table-backed human rendering for common output shapes, including records, search matches, schema fields, candidates, field changes, issues, and evidence.
- Updated `schema` human output to use the shared renderer and show field metadata, mappings, sample counts, and next commands while preserving the machine-readable `--json` contract.
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
