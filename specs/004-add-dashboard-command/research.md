# Research: Dashboard Command for Local UI

## Decision 1: Use a local-only Node HTTP service

**Decision**: Implement `dashboard` as a local-only HTTP service started by an
oCLIF command. Bind to `127.0.0.1` by default, use port `48731`, and increment
by one until an available port is found.

**Rationale**: The feature is explicitly a local CLI dashboard with no separate
web login. Node's standard HTTP and networking APIs are already available in
the target runtime, keep packaging simple, and avoid adding a server framework
for a local-only control surface. The workspace port reference documents common
project ports such as `3000`, `3001`, `3100`, `8081`, and `54320-54327`;
`48731` avoids those known project ports.

**Alternatives considered**: Express/Fastify would add familiar routing but
also adds runtime dependencies and a larger security surface. Vite dev server
would improve frontend iteration but conflicts with the package's current
single CLI build model and local-dashboard scope. Reusing the existing Lark SSO
callback server would not provide routes for dashboard pages or API endpoints.

## Decision 2: Embed dashboard assets in TypeScript

**Decision**: Store dashboard HTML, CSS, and browser JavaScript as embedded
strings exported from `src/dashboard/assets.ts`.

**Rationale**: The current package build emits TypeScript output to `dist/` and
does not include a static asset copy pipeline. Embedded assets keep the build,
packaging, and tests deterministic without introducing a frontend bundle step.
The first dashboard can still be a polished operational interface because the
assets are static and domain-focused.

**Alternatives considered**: A separate frontend app would be more scalable for
large UI work but adds a new build system and package surface. Copying static
files from `src/dashboard/assets/` would require build-script changes and extra
packaging checks. Server-rendered HTML only would make language switching and
playground interactions less ergonomic.

## Decision 3: Route dashboard actions through shared service modules

**Decision**: Add focused services under `src/dashboard/` that call existing
config, auth, readiness, audit, research, write, schema, and command helpers
directly when possible.

**Rationale**: Direct service calls keep dashboard behavior aligned with CLI
modules while allowing safe redaction, route-level validation, and structured
responses. It also avoids brittle shell command construction for workflows that
already have reusable TypeScript functions.

**Alternatives considered**: Re-entering the CLI for every dashboard action
would maximize parity but makes long-running login flows, request cancellation,
and structured in-memory state harder. Reimplementing command logic inside the
dashboard would risk drift from CLI behavior.

## Decision 4: Add reusable audit query helpers

**Decision**: Add `src/audit/query.ts` to read active and rotated audit logs,
validate entries, tolerate partial file failures, apply filters, paginate
results, and return redacted detail views.

**Rationale**: Existing audit writing is centralized in `src/audit/log.ts`, but
its read helpers are private and optimized for append/rotation maintenance.
Dashboard audit browsing needs explicit query semantics, partial-failure
reporting, and detail view shaping without weakening write-path safety.

**Alternatives considered**: Exporting every private helper from
`src/audit/log.ts` would blur write-maintenance responsibilities. Parsing audit
files directly inside dashboard routes would duplicate validation and redaction
logic.

## Decision 5: Persist canonical research reports as structured JSON

**Decision**: Add a research store that writes every generated research report
as canonical JSON under `~/.lark-bitable/research/{name}-{datetime}.json`.
Update `research` so `--out` and `-o` create a symbolic link to that canonical
JSON file when safe and supported.

**Rationale**: The dashboard requires a durable, searchable research library.
JSON preserves structured report sections and evidence better than Markdown for
machine consumers and dashboard filtering. A symlink keeps user-provided output
paths as convenience handles while maintaining one canonical artifact.

**Alternatives considered**: Keeping Markdown as the only durable report would
make dashboard search and evidence-aware rendering less reliable. Writing both
Markdown and JSON would create duplicate artifacts and possible drift. Making
`--out` copy the canonical JSON would not preserve the single-source artifact
requested by the spec.

## Decision 6: Keep language preference in browser web cache only

**Decision**: Implement dashboard-owned language switching for Traditional
Chinese and English, store the selected language only in browser web cache, and
never write the preference to local CLI configuration, auth, audit, research,
or dashboard server files.

**Rationale**: The user explicitly requested web-cache-only persistence.
Language preference is UI state, not workflow configuration. Keeping it in the
browser preserves the no-database design and avoids cross-browser or
cross-user leakage.

**Alternatives considered**: Storing language in `~/.lark-bitable/config.json`
would make it available across browsers but violates the requested persistence
boundary. Server-side sessions would introduce dashboard account/state concepts
that the spec excludes.

## Decision 7: Keep source data untranslated

**Decision**: Translate only dashboard-owned labels, controls, status messages,
and remediation copy. Do not translate Lark field names, record values, command
output, audit snapshots, file paths, or research report body text.

**Rationale**: The constitution requires fact traceability. Translating source
data would blur evidence and could fabricate values that were never present in
Lark, local files, or command output.

**Alternatives considered**: Automatic translation would improve readability
for some users but requires external services or inference and conflicts with
evidence preservation. Per-report translated summaries can be considered later
only if they are explicitly marked as derived views.

## Decision 8: Test HTTP routes without a browser E2E framework in v1

**Decision**: Validate dashboard server behavior with Vitest and Node 22 fetch
against in-process HTTP servers. Validate language switching through asset and
browser-state helper tests.

**Rationale**: The first implementation can prove contracts, route behavior,
redaction, port selection, and report persistence deterministically without
adding Playwright or another browser runner. Manual quickstart covers real
browser launch and Lark login.

**Alternatives considered**: Browser E2E tests provide stronger visual
confidence but add a new dependency and CI/runtime complexity. They are a good
follow-up after the local dashboard surface stabilizes.
