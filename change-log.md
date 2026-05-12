# Change Log

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
