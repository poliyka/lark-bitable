import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";

import { WebSocketServer } from "ws";

import type { DashboardBinding } from "./schemas.js";
import {
  buildStateInvalidationPayload,
  clientViewStatePayloadSchema,
  defaultChangedSurfacesForCommand,
  liveMessageEnvelopeSchema,
  type CommandEventIngress,
  type DashboardLiveDataSource,
  type DashboardLiveMessageEnvelope,
  type DashboardRuntimeSession,
  type DashboardSurface,
} from "./live-events.js";

export interface DashboardLiveIngressAcceptance {
  accepted: true;
  eventId: string;
  sequence: number;
}

export interface DashboardLiveServer {
  readonly clientCount: number;
  acceptCommandEvent(
    event: CommandEventIngress,
  ): DashboardLiveIngressAcceptance;
  handleUpgrade(
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer,
    runtimeSession: DashboardRuntimeSession,
  ): void;
  invalidateState(input: {
    dataSource?: DashboardLiveDataSource;
    reason: string;
    surfaces: DashboardSurface[];
  }): DashboardLiveIngressAcceptance;
  stop(): Promise<void>;
}

interface ConnectedClientState {
  clientId: string;
  connectedAt: string;
  isAlive: boolean;
  lastSeenAt: string;
  lastViewSequence: number;
  runtimeSessionId?: string;
}

const LIVE_SERVER_HEARTBEAT_MS = 5_000;
const reconnectCatchupSurfaces: DashboardSurface[] = [
  "shell",
  "overview",
  "config",
  "auth",
  "audit",
  "playground",
  "research",
  "table",
];

export function createDashboardLiveServer(input: {
  binding: Pick<DashboardBinding, "host" | "origin" | "port">;
}): DashboardLiveServer {
  const socketServer = new WebSocketServer({ noServer: true });
  const clients = new Map<object, ConnectedClientState>();
  let sequence = 0;
  const heartbeatTimer = setInterval(() => {
    for (const [client, state] of clients.entries()) {
      if (!state.isAlive) {
        clients.delete(client);
        try {
          (client as { terminate(): void }).terminate();
        } catch {
          // Ignore shutdown races.
        }
        continue;
      }
      state.isAlive = false;
      try {
        (client as { ping(): void }).ping();
      } catch {
        clients.delete(client);
      }
    }
  }, LIVE_SERVER_HEARTBEAT_MS);
  heartbeatTimer.unref?.();

  socketServer.on("connection", (socket) => {
    const state: ConnectedClientState = {
      clientId: `client_${randomUUID()}`,
      connectedAt: new Date().toISOString(),
      isAlive: true,
      lastSeenAt: new Date().toISOString(),
      lastViewSequence: 0,
    };
    clients.set(socket, state);
    socket.on("message", (payload) => {
      state.lastSeenAt = new Date().toISOString();
      try {
        const data = JSON.parse(payload.toString("utf8")) as {
          payload?: unknown;
          type?: string;
        };
        if (data.type === "client.view-state") {
          const parsed = clientViewStatePayloadSchema.safeParse(data.payload);
          if (parsed.success) {
            state.lastViewSequence =
              parsed.data.lastProcessedSequence ?? state.lastViewSequence;
          }
        }
      } catch {
        // Ignore malformed client messages.
      }
    });
    socket.on("pong", () => {
      state.isAlive = true;
      state.lastSeenAt = new Date().toISOString();
    });
    socket.on("close", () => {
      clients.delete(socket);
    });
  });

  return {
    get clientCount() {
      return clients.size;
    },
    acceptCommandEvent(event) {
      const surfaces =
        event.changedSurfaces.length > 0
          ? event.changedSurfaces
          : defaultChangedSurfacesForCommand(event.command);
      const eventEnvelope = nextEnvelope("command.activity", "live", {
        ...event,
        changedSurfaces: surfaces,
      });
      broadcast(eventEnvelope);

      const invalidationEnvelope = nextEnvelope(
        "state.invalidate",
        inferInvalidationDataSource(event),
        buildStateInvalidationPayload({
          reason: `${event.command} ${event.phase}`,
          sourceEventId: eventEnvelope.eventId,
          surfaces,
        }),
      );
      broadcast(invalidationEnvelope);

      return {
        accepted: true,
        eventId: eventEnvelope.eventId,
        sequence: eventEnvelope.sequence,
      };
    },
    handleUpgrade(request, socket, head, runtimeSession) {
      socketServer.handleUpgrade(request, socket, head, (client) => {
        socketServer.emit("connection", client, request);
        const state = clients.get(client);
        if (state) {
          state.runtimeSessionId = runtimeSession.sessionId;
          state.lastViewSequence = parseRequestedSequence(
            request.url,
            input.binding.origin,
          );
          sendEnvelope(
            client,
            nextEnvelope("live.connected", "live", {
              binding: {
                host: input.binding.host,
                origin: input.binding.origin,
                port: input.binding.port,
              },
              catchUpRequired: true,
              clientId: state.clientId,
              sessionId: state.runtimeSessionId,
              surfaces: ["shell", "overview"] satisfies DashboardSurface[],
            }),
          );
          if (state.lastViewSequence > 0 && state.lastViewSequence < sequence) {
            sendEnvelope(
              client,
              nextEnvelope("live.catchup-required", "reconnecting", {
                reason: "client reconnected",
                surfaces: reconnectCatchupSurfaces,
              }),
            );
          }
        }
      });
    },
    invalidateState(input) {
      const invalidationEnvelope = nextEnvelope(
        "state.invalidate",
        input.dataSource ?? "file-backed",
        buildStateInvalidationPayload({
          reason: input.reason,
          surfaces: input.surfaces,
        }),
      );
      broadcast(invalidationEnvelope);
      return {
        accepted: true,
        eventId: invalidationEnvelope.eventId,
        sequence: invalidationEnvelope.sequence,
      };
    },
    async stop() {
      clearInterval(heartbeatTimer);
      for (const client of clients.keys()) {
        try {
          (client as { close(): void }).close();
        } catch {
          // Ignore shutdown races.
        }
      }
      clients.clear();
      await new Promise<void>((resolve) => {
        socketServer.close(() => resolve());
      });
    },
  };

  function nextEnvelope(
    type: DashboardLiveMessageEnvelope["type"],
    dataSource: DashboardLiveDataSource,
    payload: unknown,
  ): DashboardLiveMessageEnvelope {
    sequence += 1;
    return liveMessageEnvelopeSchema.parse({
      createdAt: new Date().toISOString(),
      dataSource,
      eventId: `evt_${randomUUID()}`,
      payload,
      sequence,
      type,
    });
  }

  function broadcast(message: DashboardLiveMessageEnvelope): void {
    const serialized = JSON.stringify(message);
    for (const client of clients.keys()) {
      sendEnvelope(client, serialized);
    }
  }

  function sendEnvelope(
    client: object,
    message: DashboardLiveMessageEnvelope | string,
  ): void {
    (client as { send(payload: string): void }).send(
      typeof message === "string" ? message : JSON.stringify(message),
    );
  }
}

function parseRequestedSequence(
  requestUrl: string | undefined,
  origin: string,
): number {
  if (!requestUrl) return 0;
  const raw = new URL(requestUrl, origin).searchParams.get("lastSequence");
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : 0;
}

function inferInvalidationDataSource(
  event: CommandEventIngress,
): DashboardLiveDataSource {
  if (event.phase === "started" || event.phase === "progress") return "live";
  if (event.phase === "partial" || event.status === "partial") return "partial";
  if (
    event.phase === "failed" ||
    event.phase === "blocked" ||
    event.phase === "canceled" ||
    event.phase === "timeout" ||
    event.status === "error"
  ) {
    return "failed";
  }
  return "file-backed";
}
