import { randomUUID } from "node:crypto";

import {
  liveIngressAcceptedResponseSchema,
  redactLiveCommandEvent,
  type CommandEventIngress,
} from "./live-events.js";
import {
  DASHBOARD_RUNTIME_STALE_AFTER_MS,
  defaultDashboardRuntimePath,
  isDashboardRuntimeSessionStale,
  readDashboardRuntimeSession,
} from "./live-runtime.js";

export interface DeliverCommandLiveEventInput {
  event: CommandEventIngress;
  fetchImpl?: typeof fetch;
  now?: Date;
  runtimePath?: string;
  staleAfterMs?: number;
  timeoutMs?: number;
}

export interface LiveDeliveryAttempt {
  attemptId: string;
  commandRunId: string;
  finishedAt: string;
  phase: CommandEventIngress["phase"];
  result:
    | "delivered"
    | "failed"
    | "rejected"
    | "skipped-no-session"
    | "skipped-stale-session"
    | "skipped-unreachable";
  runtimeSessionId?: string;
  silent: boolean;
  startedAt: string;
  statusCode?: number;
  targetOrigin?: string;
}

class LiveDeliveryTimeoutError extends Error {}

export async function deliverCommandLiveEvent(
  input: DeliverCommandLiveEventInput,
): Promise<LiveDeliveryAttempt> {
  const startedAt = (input.now ?? new Date()).toISOString();
  const attemptId = `attempt_${randomUUID()}`;
  const runtimePath = input.runtimePath ?? defaultDashboardRuntimePath();
  const session = await readDashboardRuntimeSession(runtimePath);

  if (!session) {
    return finalizeAttempt({
      attemptId,
      commandRunId: input.event.commandRunId,
      phase: input.event.phase,
      result: "skipped-no-session",
      silent: true,
      startedAt,
    });
  }

  if (
    isDashboardRuntimeSessionStale(session, {
      now: input.now,
      staleAfterMs: input.staleAfterMs ?? DASHBOARD_RUNTIME_STALE_AFTER_MS,
    })
  ) {
    return finalizeAttempt({
      attemptId,
      commandRunId: input.event.commandRunId,
      phase: input.event.phase,
      result: "skipped-stale-session",
      runtimeSessionId: session.sessionId,
      silent: true,
      startedAt,
      targetOrigin: session.origin,
    });
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const payload = redactLiveCommandEvent(input.event);

  try {
    const response = await withTimeout(
      fetchImpl(new URL("/api/live/events", session.origin), {
        body: JSON.stringify(payload),
        headers: {
          "content-type": "application/json",
          "x-dashboard-live-token": session.deliveryToken,
        },
        method: "POST",
      }),
      input.timeoutMs ?? 750,
    );
    const body = await response
      .json()
      .catch(() => ({ status: "error" as const }));

    if (response.ok) {
      const parsed = liveIngressAcceptedResponseSchema.safeParse(body);
      if (parsed.success) {
        return finalizeAttempt({
          attemptId,
          commandRunId: payload.commandRunId,
          phase: payload.phase,
          result: "delivered",
          runtimeSessionId: session.sessionId,
          silent: false,
          startedAt,
          statusCode: response.status,
          targetOrigin: session.origin,
        });
      }
    }

    return finalizeAttempt({
      attemptId,
      commandRunId: payload.commandRunId,
      phase: payload.phase,
      result: "rejected",
      runtimeSessionId: session.sessionId,
      silent: false,
      startedAt,
      statusCode: response.status,
      targetOrigin: session.origin,
    });
  } catch (error) {
    return finalizeAttempt({
      attemptId,
      commandRunId: payload.commandRunId,
      phase: payload.phase,
      result:
        error instanceof LiveDeliveryTimeoutError
          ? "failed"
          : "skipped-unreachable",
      runtimeSessionId: session.sessionId,
      silent: error instanceof LiveDeliveryTimeoutError ? false : true,
      startedAt,
      targetOrigin: session.origin,
    });
  }
}

function finalizeAttempt(
  attempt: Omit<LiveDeliveryAttempt, "finishedAt">,
): LiveDeliveryAttempt {
  return {
    ...attempt,
    finishedAt: new Date().toISOString(),
  };
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(new LiveDeliveryTimeoutError("Live delivery timed out.")),
          timeoutMs,
        );
        timer.unref?.();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
