# Phase 0 Research: Dashboard Real-Time Command Updates

## Decision: Use WebSocket for browser-facing live dashboard updates

**Rationale**: The user explicitly requested WebSocket-based immediate dashboard updates. The dashboard already runs a local HTTP service and serves browser assets from one localhost origin, so a WebSocket upgrade path fits the existing local service without creating a hosted service or separate frontend package. WebSocket also supports connection health, multi-tab delivery, and bidirectional control messages needed for reconnect and catch-up.

**Alternatives considered**:

- **Polling existing APIs**: Simpler but fails the "as soon as command triggers" requirement and adds avoidable repeated reads.
- **Server-Sent Events**: Works for one-way updates but does not match the requested WebSocket transport and gives less room for client control messages.
- **Manual refresh only**: Existing behavior remains as fallback, but it does not satisfy live update requirements.
- **Bare protocol implementation**: Avoided because WebSocket framing and lifecycle are well-established protocol concerns better handled by a focused library.

## Decision: Add a focused WebSocket dependency instead of a full web framework

**Rationale**: The existing dashboard service uses Node `http` directly and the repository has no WebSocket server implementation. A focused dependency keeps the blast radius small, avoids introducing a full application framework, and allows integration tests to connect real WebSocket clients. The plan expects a runtime dependency for WebSocket server/client support and a type dependency if the chosen package needs it.

**Alternatives considered**:

- **Full web framework**: Rejected because existing HTTP routing is small and local-only.
- **No new dependency**: Rejected because maintaining WebSocket framing manually would increase protocol risk.
- **Browser-only WebSocket with no server library**: Not viable because the local service must accept WebSocket connections.

## Decision: Use an ephemeral runtime session file for CLI-to-dashboard discovery

**Rationale**: External CLI commands run in separate processes from the dashboard service. They need a way to know whether a dashboard is running without prompting the user or scanning arbitrary ports. The dashboard service can write a short-lived runtime file containing origin, process id, started time, and a local delivery token, then remove or invalidate it on shutdown. CLI commands read that file, perform a very short best-effort localhost delivery, and silently skip when the file is missing, stale, invalid, or unreachable.

**Alternatives considered**:

- **Always attempt default port delivery**: Rejected because the dashboard may have selected an incremented port or another local service may occupy that port.
- **Persistent database queue**: Rejected by existing dashboard no-database constraints and because missed events should be loaded as current persisted state, not replayed as live delivery.
- **OS-specific named pipe/socket only**: Rejected for portability and added platform-specific operational risk.

## Decision: Deliver redacted invalidation events, then fetch authoritative page state

**Rationale**: Existing dashboard APIs already enforce redaction and data-source boundaries for status, config, auth, audit, playground, research, and table data. Live events should tell connected pages what changed, include safe command activity summary, and identify affected surfaces. Browser pages then re-read the relevant API endpoints to obtain current facts. This avoids pushing large or secret-bearing payloads through the live channel and prevents event order from becoming the source of truth.

**Alternatives considered**:

- **Push full page payloads over WebSocket**: Rejected because it duplicates API contracts and increases secret exposure risk.
- **Push only "refresh everything" events**: Rejected because it is safe but too coarse for preserving active filters, selections, and unsaved drafts.
- **Use audit log only as live source**: Rejected because audit entries are written after command completion and cannot represent command start or progress.

## Decision: Use service-local sequence numbers plus current-state catch-up

**Rationale**: The service can assign monotonic sequence numbers to live events while it is running. Clients track the last sequence they processed and ignore older events. On reconnect, refresh, or detected sequence gap, clients request the current state for the active dashboard surfaces rather than requiring durable replay. This satisfies convergence without adding a persistent live-event queue.

**Alternatives considered**:

- **Durable event replay**: Rejected because missed events before dashboard startup should not be claimed as live delivered and a queue would violate the no-database direction.
- **Client timestamp ordering only**: Rejected because local browser and process clocks may not be reliable enough for ordering overlapping commands.
- **No ordering metadata**: Rejected because overlapping commands can otherwise replace newer facts with older updates.

## Decision: Keep CLI command results independent from live delivery

**Rationale**: The spec requires normal CLI behavior when the dashboard service is not running. Live delivery attempts therefore must be best-effort, non-blocking from the user's perspective, and never able to turn a successful command into a failed command. Delivery failures may be visible in dashboard diagnostics only when the dashboard is actually running; they must not appear as command output warnings when the dashboard is absent.

**Alternatives considered**:

- **Fail command on live delivery failure**: Rejected because it directly violates the dashboard-absent requirement.
- **Warn whenever delivery fails**: Rejected because dashboard-absent command runs must remain clean.
- **Require dashboard for commands**: Rejected because the dashboard is an optional local UI over existing CLI workflows.

## Decision: Validate with Vitest plus browser evidence quickstart

**Rationale**: The repository already uses Vitest, Node runtime fetch, in-process dashboard server tests, and focused dashboard unit tests. Automated tests can cover WebSocket connection, event envelopes, ordering, redaction, reconnect, multi-client convergence, command lifecycle hooks, and dashboard-absent no-op behavior. Browser evidence remains necessary for visible stale/reconnecting indicators and page-preservation behavior, so quickstart documents deterministic browser observations.

**Alternatives considered**:

- **Add a browser test framework immediately**: Deferred because the active repository already has a separate dashboard E2E validation feature and no current browser test dependency.
- **Manual-only validation**: Rejected because ordering, redaction, and dashboard-absent behavior require deterministic regression coverage.
- **Unit-only validation**: Rejected because WebSocket behavior must be exercised through a running local service.
