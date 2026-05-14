import { createServer } from "node:net";

export const DEFAULT_DASHBOARD_PORT = 48731;

export interface FindAvailablePortInput {
  host?: string;
  maxAttempts?: number;
  startPort?: number;
}

export async function findAvailablePort(
  input: FindAvailablePortInput = {},
): Promise<number> {
  const host = input.host ?? "127.0.0.1";
  const startPort = input.startPort ?? DEFAULT_DASHBOARD_PORT;
  const maxAttempts = input.maxAttempts ?? 100;
  if (startPort === 0) return 0;

  for (let index = 0; index < maxAttempts; index += 1) {
    const port = startPort + index;
    if (port > 65535) break;
    if (await canBindPort(host, port)) return port;
  }

  throw new Error(
    `No dashboard port is available from ${startPort} after ${maxAttempts} attempts.`,
  );
}

async function canBindPort(host: string, port: number): Promise<boolean> {
  const server = createServer();
  return await new Promise<boolean>((resolve, reject) => {
    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE" || error.code === "EACCES") {
        resolve(false);
        return;
      }
      reject(error);
    });
    server.listen(port, host, () => {
      server.close((error) => (error ? reject(error) : resolve(true)));
    });
  });
}
