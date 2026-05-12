# Research: Lark Bitable CLI for AI Bug Triage

## Evidence Sources

- User specified TypeScript implementation and explicitly requested using good
  GitHub/OSS CLI packages instead of building framework pieces from scratch.
- Repository command output on 2026-05-07 showed Node `v22.22.2`, npm `10.9.7`,
  and pnpm `10.33.0` available locally.
- `npm view` on 2026-05-07 returned current package versions:
  `@oclif/core` `4.11.1`, `oclif` `4.23.0`, `@larksuiteoapi/node-sdk` `1.62.1`,
  `@inquirer/prompts` `8.4.2`, `conf` `15.1.0`, `zod` `4.4.3`, and `vitest`
  `4.1.5`.
- GitHub/search observations on 2026-05-07 identified mature repositories or
  official sources for oclif, commander.js, Lark Node SDK, Inquirer prompts,
  Conf, Zod, and Vitest.
- Lark official Bitable documentation observed in Chrome DevTools on 2026-05-07
  shows Base/Bitable resources for app, table, view, record, and field, and
  read endpoints such as listing tables, listing views, listing records, getting
  records, and listing fields.
- User follow-up on 2026-05-07 requires an interactive `lark-bitable lark --login` command
  because Lark APIs cannot be used before login, and requires token state stored
  under a user-home auth file.
- User follow-up on 2026-05-07 requires a `valid` function that detects
  incomplete configuration causing unusable functionality and provides
  remediation or guided setup.
- The larksuite/lark-openapi-mcp CLI reference observed on GitHub on 2026-05-07
  describes `lark-bitable lark --login` for obtaining user access tokens, `lark-bitable lark --logout` for
  clearing stored tokens, and user token mode for API calls.

## Decisions

### Decision: Use TypeScript and Node.js 22-compatible runtime

**Rationale**: The user requested TypeScript. Local environment already has a
modern Node runtime and package managers. TypeScript gives typed command
contracts, typed Lark record mapping, and safer AI-facing structured outputs.

**Alternatives considered**:

- JavaScript only: less setup, but weaker contracts for record shape and command
  output.
- Python: common for CLIs, but conflicts with the user's explicit TypeScript
  direction and the local `python` command is absent while `python3` is present.

### Decision: Use oclif for CLI framework

**Rationale**: oclif is a mature GitHub-backed CLI framework designed for
multi-command CLIs, command discovery, help output, generated command structure,
and plugin-friendly layouts. This feature needs many commands and detailed
help, making oclif a better fit than a minimal parser.

**Alternatives considered**:

- commander.js: mature and lighter, but requires more hand-built command
  organization, help conventions, and testing structure for a multi-command
  tool.
- yargs: capable, but less aligned with generated command classes and plugin
  style.
- Custom parser: rejected because the user explicitly requested not to reinvent
  common CLI tooling.

### Decision: Use the official Lark Node SDK for OpenAPI access

**Rationale**: The feature depends on Lark Base/Bitable APIs. The official
`@larksuiteoapi/node-sdk` package reduces risk around authentication, endpoint
shape, and request conventions compared with direct HTTP calls.

**Alternatives considered**:

- Direct HTTP client: more control, but higher maintenance cost and greater risk
  of mismatching Lark API behavior.
- Browser automation against the Lark UI: useful for manual observation, but not
  reliable or appropriate as the primary data access path for a CLI.

### Decision: Add interactive `lark-bitable lark --login` and store auth at `~/.lark-bitable/auth.json`

**Rationale**: The user explicitly identified login as a prerequisite for Lark
API use. A user-home auth file keeps token state outside repositories, makes API
commands reusable across runs, and gives AI agents a stable readiness check.
The path `~/.lark-bitable/auth.json` concretizes the user's `~/.xxx/auth.json`
requirement with the project name.

**Alternatives considered**:

- Passing tokens through command flags: rejected because tokens would be exposed
  in shell history, logs, and AI-visible command transcripts.
- Storing tokens in the current repository: rejected because repository files can
  be committed, read by unrelated agents, or included in reports.
- Requiring environment variables only: useful as a future option, but less
  ergonomic for interactive users and harder for AI agents to self-check.

### Decision: Provide logout and auth status through `doctor`

**Rationale**: A login flow must also support clearing local token state and
reporting whether API access can be attempted. `doctor` gives AI agents a
redacted, evidence-backed status without exposing raw token values.

**Alternatives considered**:

- Login-only flow: incomplete because users need a way to remove local access.
- Printing raw token details for debugging: rejected because report accuracy and
  security require redaction.

### Decision: Add `valid` as workflow readiness validation

**Rationale**: `doctor` answers whether the tool installation and environment
are healthy, while `valid` answers whether a specific workflow can run now.
Keeping `valid` separate lets users and AI agents check inspect, triage, or
research prerequisites and receive focused remediation steps.

**Alternatives considered**:

- Fold validation into `doctor`: simpler command surface, but mixes install
  health with workflow readiness and makes remediation less focused.
- Let each command fail independently: reactive only, harder for AI agents to
  plan next steps, and less helpful when multiple prerequisites are missing.

### Decision: Use `@inquirer/prompts` for guided triage selection

**Rationale**: Guided bug selection needs interactive prompts and numbered
choices. Inquirer is a mature CLI prompts project and avoids building custom
terminal interaction logic.

**Alternatives considered**:

- `@clack/prompts`: modern and attractive, but Inquirer has broader established
  usage and a direct fit for select/input flows.
- Plain stdin/stdout prompts: possible, but would reimplement interaction
  behavior and error handling.

### Decision: Use `conf` plus `zod` for local config and validation

**Rationale**: The CLI must store active source, field mappings, and selected
bug context. `conf` provides a focused local config store for Node CLIs, while
`zod` validates user-provided URLs, field mapping values, command options, and
structured output shapes.

**Alternatives considered**:

- Raw JSON files: simpler, but would require custom path resolution, migrations,
  schema validation, and corruption handling.
- SQLite: unnecessary for a small read-focused CLI configuration model.

### Decision: Use Vitest for tests

**Rationale**: Vitest is a current TypeScript-friendly test runner with fast
feedback and straightforward mocking. It fits unit tests for URL parsing,
configuration validation, triage sorting, and report evidence formatting.

**Alternatives considered**:

- Jest: mature, but heavier and less aligned with current ESM TypeScript setups.
- Node built-in test runner: viable, but Vitest has a stronger TypeScript and
  mocking developer experience for this CLI.

### Decision: Generate Markdown CLI contracts instead of OpenAPI contracts

**Rationale**: This feature exposes a command-line interface, not an HTTP API.
The contract needs command names, inputs, outputs, exit behavior, and evidence
metadata rather than endpoint schemas.

**Alternatives considered**:

- OpenAPI: rejected because it would misrepresent a CLI as a web service.
- JSON Schema only: useful for structured output later, but incomplete for
  command help, interactive prompts, and exit behavior.

### Decision: Deliver bootstrap as installable AI-facing skill assets plus CLI self-check

**Rationale**: The spec requires AI agents to know how to install and use the
tool. A local skill asset can teach the workflow, while a CLI `doctor` or
bootstrap self-check can provide observable installation/configuration evidence.

**Alternatives considered**:

- README-only instructions: easier, but less discoverable by AI agents that use
  skill loading.
- Hidden prompt text in CLI help: insufficient because the AI needs setup
  instructions before it knows the CLI is available.

## Resolved Clarifications

- **Packaging format**: Plan for a Node package with an oclif command binary and
  repository-local bootstrap skill assets. Exact publishing target can be
  decided during implementation tasks.
- **Auth file path**: Use `~/.lark-bitable/auth.json` by default. The first
  version may later add an override, but docs and self-checks use this default.
- **Readiness validation**: `valid` checks global readiness by default and can
  scope checks to inspect, triage, or research workflows.
- **Lark write behavior**: First version is read-only. Write-back to records is
  out of scope.
- **Live Lark validation**: Plan uses mocked Lark responses for deterministic
  tests and keeps live Lark checks as manual quickstart validation requiring
  user-provided credentials and table access.
