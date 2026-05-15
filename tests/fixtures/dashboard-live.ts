import type WebSocket from "ws";

export function waitForWebSocketOpen(socket: WebSocket): Promise<void> {
  if (socket.readyState === socket.OPEN) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onOpen = () => {
      cleanup();
      resolve();
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      socket.off("open", onOpen);
      socket.off("error", onError);
    };
    socket.once("open", onOpen);
    socket.once("error", onError);
  });
}

export function waitForWebSocketMessage<T = unknown>(
  socket: WebSocket,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const onMessage = (payload: WebSocket.RawData) => {
      cleanup();
      resolve(JSON.parse(payload.toString("utf8")) as T);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      socket.off("message", onMessage);
      socket.off("error", onError);
    };
    socket.once("message", onMessage);
    socket.once("error", onError);
  });
}

export function createWebSocketMessageCollector<T = unknown>(
  socket: WebSocket,
) {
  const queue: T[] = [];
  const waiters: Array<(message: T) => void> = [];

  const onMessage = (payload: WebSocket.RawData) => {
    const parsed = JSON.parse(payload.toString("utf8")) as T;
    const waiter = waiters.shift();
    if (waiter) {
      waiter(parsed);
      return;
    }
    queue.push(parsed);
  };

  socket.on("message", onMessage);

  return {
    next<U = T>(): Promise<U> {
      const message = queue.shift();
      if (message !== undefined) return Promise.resolve(message as U);
      return new Promise((resolve) => {
        waiters.push(resolve as (message: T) => void);
      });
    },
    stop(): void {
      socket.off("message", onMessage);
    },
  };
}

export function closeWebSocket(socket: WebSocket): Promise<void> {
  if (
    socket.readyState === socket.CLOSING ||
    socket.readyState === socket.CLOSED
  ) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    socket.once("close", () => resolve());
    socket.close();
  });
}
