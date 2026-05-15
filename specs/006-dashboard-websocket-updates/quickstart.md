# Quickstart: Validate Dashboard Real-Time Command Updates

## Prerequisites

- Node.js `>=22`
- `pnpm` matching the repository package manager
- A clean working tree or intentional Spec Kit changes on branch `006-dashboard-websocket-updates`
- Optional Lark test credentials and a test Bitable for live Lark-backed checks

## Install and Baseline

```bash
pnpm install
pnpm test
pnpm build
pnpm format:check
```

Expected result:

- Tests pass before implementation work starts, or existing failures are recorded before changes.
- Build and format checks provide baseline evidence.

## Start Dashboard With Isolated State

Use temporary local paths so validation does not mutate real user state.

```bash
tmpdir="$(mktemp -d)"
pnpm dev dashboard \
  --no-open \
  --json \
  --port 0 \
  --audit-path "$tmpdir/audit.json" \
  --auth-path "$tmpdir/auth.json" \
  --config-cwd "$tmpdir/config" \
  --research-dir "$tmpdir/research"
```

Expected result:

- Command prints the selected local dashboard origin.
- Dashboard remains local-only.
- No dashboard/web login is required.

## Browser Live Smoke Test

1. Open the printed dashboard URL.
2. Confirm the global shell shows live connection state.
3. Open Overview in one tab and Audit Logs in another tab.
4. Run a representative command in a separate terminal using the same isolated audit/config/auth paths.

Example:

```bash
pnpm dev valid --workflow dashboard --json --audit-path "$tmpdir/audit.json"
```

Expected result:

- Connected tabs show command start activity within 1 second.
- Connected tabs show command outcome or affected state within 2 seconds.
- Audit and Overview update without browser refresh.
- No token-like or secret-like values appear.

## Dashboard-Absent CLI Test

1. Stop the dashboard service.
2. Run representative CLI commands that would normally affect dashboard-visible state.

Example:

```bash
pnpm dev valid --workflow dashboard --json --audit-path "$tmpdir/audit.json"
pnpm dev research --json --audit-path "$tmpdir/audit.json" --research-dir "$tmpdir/research"
```

Expected result:

- Commands do not require a dashboard connection.
- Commands do not show dashboard update errors, warnings, or prompts.
- Primary command status reflects the command's own outcome only.

## Multi-Tab and Reconnect Test

1. Start the dashboard and open at least two browser tabs.
2. Trigger overlapping commands from terminal and from Playground.
3. Temporarily disconnect one browser tab by closing the WebSocket connection through devtools or disabling network briefly.
4. Restore the connection.

Expected result:

- All connected tabs converge to the same final facts within 3 seconds.
- The disconnected tab shows stale or reconnecting state within 2 seconds.
- After reconnect, the tab catches up through current API-loaded state.
- The UI does not claim missed events were live-delivered.

## Page Preservation Test

1. Open Configuration and scroll to field mappings.
2. Edit a field without saving.
3. Trigger a command that invalidates configuration or table schema.

Expected result:

- Route, scroll position, focused control, and unsaved draft remain stable.
- Incoming saved/current values are distinguished from the unsaved draft.
- Manual refresh remains available.

## Automated Validation Targets

Run after implementation:

```bash
pnpm test
pnpm build
pnpm format:check
```

Required focused coverage:

- WebSocket connection and initial `live.connected`.
- `command.activity` event delivery for dashboard and terminal triggers.
- `state.invalidate` event handling and API catch-up.
- Multi-client convergence.
- Reconnect stale indicator and catch-up.
- Out-of-order or overlapping command protection.
- Dashboard-absent CLI no-op behavior.
- Redaction on ingress and WebSocket payloads.
- Runtime session stale and cleanup behavior.

## Evidence to Record

- Command used to start dashboard and resulting origin.
- Triggering command and timestamp.
- Browser-visible live state before and after trigger.
- WebSocket event summary or network observation.
- Final API state used for catch-up.
- Pass, fail, or blocked conclusion.
- Blocked reason for unavailable live Lark credentials or test Bitable.
