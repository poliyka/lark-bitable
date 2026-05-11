# Validation Notes: Lark Bitable CLI for AI Bug Triage

Validation started on 2026-05-07 in
`/Users/openclaw/im-app/hybrid-im-qa-lark-cli`.

## Commands

- `pnpm format:check`: PASS. Prettier reported all matched files use Prettier
  code style.
- `pnpm build`: PASS. TypeScript build completed after cleaning `dist`; stale
  `dist/cli/commands/shared-records.*` command artifacts were absent.
- `pnpm test`: PASS. Vitest reported 30 test files passed and 76 tests passed.
- `pnpm quickstart:validate`: PASS. Deterministic setup, mocked login,
  configure, valid, list, get, filter, search, triage, research, and logout flow
  completed, including installed bootstrap skill validation before `valid`.
- `node bin/run.js help --json`: PASS. Binary help output contained the
  supported workflow, used `lark-bitable lark --login`, and did not include the
  internal `shared-records` helper as a command.
- `pnpm vitest run tests/integration/help-commands.test.ts`: PASS. The help
  coverage test scans every command module and verifies each command, including
  `help`, has human-readable sections for human usage, AI usage, inputs,
  outputs, common failures, next steps, and examples. Unknown command-specific
  help requests return an actionable error with the available command list.
- `node bin/run.js lark --help`: PASS. The single `lark-bitable` binary exposes
  the `lark` auth subcommand with `--login`, `--logout`, `--auth-mode sso`, and
  `--auth-mode code`.
- `node -e "require('./package.json').bin"`: PASS. Package binary contract
  exposes only `lark-bitable`.
- `git diff --check`: PASS. No whitespace errors were reported.

## Security Audit

- Raw token leakage audit: PASS.
- Narrow scan over user-facing docs and bootstrap guidance:
  `README.md`, `src/bootstrap/skill`, `quickstart.md`, and this validation file
  returned no raw mock token hits.
- Broad scan found only expected mock token strings in deterministic tests,
  hidden test flags, source schemas, and `scripts/quickstart-validate.ts`; no
  user-facing docs, bootstrap skill, validation notes, or research report
  examples expose raw tokens.

## Report Accuracy Audit

- Unsupported factual claim audit: PASS.
- `renderResearchReport` checks observed factual claims with
  `assertClaimsHaveEvidence`; tests cover cited facts and unsupported factual
  claim rejection.
- Report sections keep assumptions and likely causes separate from observed
  facts. Default and quickstart report output labels causes as unconfirmed until
  repository, command, or runtime evidence is collected.

## Bootstrap Consistency Audit

- Bootstrap skill versus help output audit: PASS.
- Scripted comparison of bootstrap guidance against `src/cli/commands/help.ts`
  returned `{ "missing": [] }` for `doctor`, `valid`, `configure`, `list`,
  `get`, `filter`, `search`, `triage`, `research`, and `lark-bitable lark --login`.
- The `valid --workflow inspect` next safe command is `lark-bitable list`, not a
  nonexistent inspect command.
- `valid` now inspects the actual configured bootstrap skill directory instead
  of assuming installation, and blocks on missing or stale bootstrap guidance.
- Bootstrap installation resolves the shipped skill from the package location
  rather than the caller's current working directory.

## Auth Readiness Audit

- Auth is now routed through the single `lark-bitable lark` command surface:
  `--login --auth-mode sso`, `--login --auth-mode code`, and `--logout`.
- Lark app id/secret can be stored through `lark-bitable configure`; command
  output reports only redacted app metadata and does not expose the app secret.
- SSO mode builds the Lark OAuth authorization URL using
  `https://accounts.larksuite.com/open-apis/authen/v1/authorize` for Lark
  domains, starts a local callback server by default, and preserves the returned
  authorization-code exchange path.
- Human-oriented commands now support guided prompts where safe: `configure`
  prompts for source/app/mapping settings; `lark --login` waits for the browser
  callback; `get`, `filter`, and `search` prompt for missing inputs in TTY mode.
- Expired stored auth sessions are no longer treated as ready. API record
  commands call `authStatusFor` before loading records and fail closed with
  `auth-expired` unless refresh credentials are available.
- `valid` uses the same auth status check for readiness output so expired,
  invalid, insufficient-scope, and missing states are reported as blocking
  issues with remediation.

## Live Lark Permission Observation

- Observation date: 2026-05-08.
- Tooling: Chrome DevTools MCP against Lark Developer Console app
  `cli_a9143795de389ed4`.
- Root cause observed for configure field discovery failure: Lark returned
  code `99991672` with required scopes
  `[bitable:app:readonly, bitable:app, base:field:read]`. The existing
  `bitable:app:readonly` permission was user identity only, while configure
  field discovery uses `tenant_access_token` and therefore needs an
  application-identity field-read permission.
- Console action taken: added application-identity permission `base:field:read`
  (`获取字段信息`) and created app version `1.0.5` with update note
  `更新权限`.
- Current factual status: version `1.0.5` is `审核中`; the console says
  `无法修改，企业管理员 正在审核应用发布申请`. Current approvers shown by the
  console are `boyan`, `Huanzhou Huang`, and `Xiong`, with one approval
  sufficient.
- Consequence: `lark-bitable configure` may continue to fail live field
  discovery until version `1.0.5` is approved and published. Do not report the
  permission as active until the console shows the new version published or a
  live configure run successfully loads fields.
