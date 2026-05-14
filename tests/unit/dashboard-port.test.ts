import { createServer } from "node:net";
import type { AddressInfo } from "node:net";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_DASHBOARD_PORT,
  findAvailablePort,
} from "../../src/dashboard/port.js";

async function reservePort(port = 0) {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });
  return server;
}

async function closeServer(server: ReturnType<typeof createServer>) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

describe("dashboard port selection", () => {
  it("uses a low-collision default port", () => {
    expect(DEFAULT_DASHBOARD_PORT).toBe(48731);
  });

  it("increments when the requested port is occupied", async () => {
    const occupied = await reservePort();
    const port = (occupied.address() as AddressInfo).port;

    try {
      await expect(
        findAvailablePort({
          host: "127.0.0.1",
          maxAttempts: 2,
          startPort: port,
        }),
      ).resolves.toBe(port + 1);
    } finally {
      await closeServer(occupied);
    }
  });

  it("fails with evidence when every candidate is occupied", async () => {
    const occupied = await reservePort();
    const port = (occupied.address() as AddressInfo).port;

    try {
      await expect(
        findAvailablePort({
          host: "127.0.0.1",
          maxAttempts: 1,
          startPort: port,
        }),
      ).rejects.toThrow("No dashboard port is available");
    } finally {
      await closeServer(occupied);
    }
  });
});
