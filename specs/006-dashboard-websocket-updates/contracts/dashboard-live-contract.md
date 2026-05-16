# Contract: Dashboard WebSocket Live Channel

## Scope

The dashboard service exposes a local WebSocket endpoint for browser dashboard views. This channel delivers redacted command activity, state invalidation hints, connection status, and catch-up instructions. It does not replace existing HTTP APIs as the source of truth.

## Endpoint

```text
GET /api/live/ws
Upgrade: websocket
Origin: same dashboard origin
```

Rules:

- The endpoint is served only by the local dashboard service.
- Browser clients connect from the same dashboard origin.
- The service accepts multiple browser tabs or windows.
- The service sends ping/heartbeat messages and closes inactive clients.
- The service never sends runtime delivery tokens to browser clients.

## Server-to-Client Message Envelope

```json
{
  "type": "event.type",
  "eventId": "evt_01",
  "sequence": 42,
  "createdAt": "2026-05-15T00:00:00.000Z",
  "dataSource": "live",
  "payload": {}
}
```

Allowed `dataSource` values:

- `live`
- `file-backed`
- `cached`
- `missing`
- `partial`
- `failed`
- `stale`
- `reconnecting`

Common rules:

- `sequence` is monotonic for one dashboard service lifetime.
- Clients ignore messages with a sequence lower than the last processed sequence.
- Payloads are redacted by dashboard redaction rules before delivery.
- Source-controlled values are preserved exactly when included.

## Message Types

### `live.connected`

Sent immediately after a browser connects.

```json
{
  "type": "live.connected",
  "eventId": "evt_connected",
  "sequence": 1,
  "createdAt": "2026-05-15T00:00:00.000Z",
  "dataSource": "live",
  "payload": {
    "clientId": "client_01",
    "sessionId": "dash_01",
    "binding": {
      "origin": "http://127.0.0.1:48731",
      "host": "127.0.0.1",
      "port": 48731
    },
    "catchUpRequired": true,
    "surfaces": ["shell", "overview"]
  }
}
```

Client behavior:

- Mark live state as connected.
- Fetch current state for the active page and global shell.
- Do not claim any pre-connection command was live-delivered.

### `command.activity`

Sent when a command or dashboard workflow starts, progresses, finishes, fails, is blocked, or times out.

```json
{
  "type": "command.activity",
  "eventId": "evt_command_01",
  "sequence": 2,
  "createdAt": "2026-05-15T00:00:01.000Z",
  "dataSource": "live",
  "payload": {
    "commandRunId": "run_01",
    "command": "valid",
    "trigger": "terminal",
    "phase": "started",
    "status": "running",
    "changedSurfaces": ["shell", "overview", "audit"],
    "evidenceCount": 0,
    "issues": []
  }
}
```

Client behavior:

- Reload only affected visible surfaces unless the event asks for full catch-up.
- On the overview page, command activity updates are represented by the Recent Activity table after the browser re-reads audit/status APIs; there is no separate live activity feed.
- Preserve active route, filters, selected detail, scroll position, and unsaved drafts.

### `state.invalidate`

Sent when current dashboard-visible state should be reloaded through existing HTTP APIs.

```json
{
  "type": "state.invalidate",
  "eventId": "evt_invalidate_01",
  "sequence": 3,
  "createdAt": "2026-05-15T00:00:02.000Z",
  "dataSource": "file-backed",
  "payload": {
    "reason": "audit entry updated",
    "surfaces": ["overview", "audit"],
    "resources": ["/api/status", "/api/audit"],
    "sourceEventId": "evt_command_01"
  }
}
```

Client behavior:

- Treat the event as an invalidation hint.
- Re-read listed resources if they affect the current page.
- Keep manual refresh available.

### `live.stale`

Sent or inferred when the live channel is unhealthy.

```json
{
  "type": "live.stale",
  "eventId": "evt_stale_01",
  "sequence": 10,
  "createdAt": "2026-05-15T00:00:10.000Z",
  "dataSource": "stale",
  "payload": {
    "reason": "heartbeat missed",
    "retryAfterMs": 1000
  }
}
```

Client behavior:

- Show a stale or reconnecting indicator within 2 seconds of detected loss.
- Avoid presenting stale data as current.
- Retry connection with bounded backoff.

### `live.catchup-required`

Sent after reconnect or sequence gap.

```json
{
  "type": "live.catchup-required",
  "eventId": "evt_catchup_01",
  "sequence": 11,
  "createdAt": "2026-05-15T00:00:12.000Z",
  "dataSource": "reconnecting",
  "payload": {
    "reason": "client reconnected",
    "surfaces": ["shell", "overview", "audit", "research", "table"]
  }
}
```

Client behavior:

- Fetch current state for active and affected surfaces.
- Clear stale indicators only after successful catch-up.

## Client-to-Server Control Messages

### `client.view-state`

Browser clients may send safe view-state summaries.

```json
{
  "type": "client.view-state",
  "payload": {
    "activePage": "audit",
    "selectedId": "audit-entry-id",
    "filters": {
      "status": "partial"
    },
    "lastProcessedSequence": 42
  }
}
```

Rules:

- The payload must not include secrets, full source records, command output, or research report bodies.
- The server may use this only for diagnostics and targeted delivery.

## Error Handling

- Invalid client messages receive a redacted `live.error` message or are ignored.
- Server-side live failures do not change command outcomes.
- Browser clients fall back to manual refresh when the live channel is unavailable.
