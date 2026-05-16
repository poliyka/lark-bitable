# Contract: Browser Live UI Behavior

## Scope

The browser dashboard consumes WebSocket messages, displays connection state, and refreshes dashboard-visible facts through existing HTTP APIs. This contract defines user-visible behavior for all seven primary dashboard pages.

## Global Shell

Live UI state:

- `connected`: Live updates are active.
- `stale`: The dashboard may not reflect the latest command activity.
- `reconnecting`: The browser is trying to restore the live channel.
- `fallback`: Manual refresh is available because live updates are unavailable.

Rules:

- The shell shows live state without blocking navigation.
- Manual refresh remains available in every live state.
- Live state text is dashboard-owned UI text and follows the selected UI language.
- Source-controlled values are never translated by live update handling.

## Page Refresh Rules

Overview:

- Refresh `/api/status`, recent audit summary, and config mapping summary when invalidated.
- Do not render a separate live activity feed; the existing Recent Activity table is the user-facing live activity surface.
- Preserve current page and shell state.

Configuration:

- Refresh saved config, field discovery, readiness, and mapping options when invalidated.
- Preserve unsaved form drafts and visibly distinguish incoming saved values from local edits.
- Preserve scroll position and focused control.

Lark Login:

- Refresh auth state and login flow state when invalidated.
- Never display tokens, authorization codes, refresh tokens, or application secrets.

Audit Logs:

- Refresh list and counts when invalidated.
- Preserve active filters.
- Preserve selected detail when it still exists; otherwise show a clear unavailable state.

Playground:

- Update run status when dashboard-triggered workflows run.
- Preserve command selection, parameter drafts, response tab, and run history unless the user clears them.

Research Reports:

- Refresh report list when reports are created, changed, removed, malformed, or unreadable.
- Preserve selected report when still available; otherwise show unavailable state.

Source Table:

- Refresh records, schema, mapping state, blocked state, partial state, and empty state when invalidated.
- Preserve active tab, filters, and horizontal inspection state where applicable.

## Reconnect and Catch-Up

Rules:

- The browser shows stale or reconnecting state within 2 seconds of detected connection loss.
- On reconnect, the browser fetches current state for the active page and global shell.
- Catch-up state is labeled as current API-loaded state, not as missed live delivery.
- Stale indicators are cleared only after current state is loaded successfully.

## Multi-Tab Behavior

Rules:

- Every connected tab receives the same live command activity events.
- Each tab refreshes only the surfaces relevant to its current page and global shell.
- All tabs converge to the same final facts within 3 seconds after the final relevant command update.

## Error Behavior

Rules:

- Live channel errors do not replace page content with raw failures.
- Page-specific HTTP refresh errors are shown in the existing dashboard issue style.
- The browser never reports a command as failed solely because live delivery failed.
- Console errors from live update handling are validation failures unless explicitly classified as unrelated environment noise.
