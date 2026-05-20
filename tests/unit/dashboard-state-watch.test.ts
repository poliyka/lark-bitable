import { EventEmitter } from "node:events";
import type { Stats } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fsMock = vi.hoisted(() => ({
  mkdirSync: vi.fn(),
  unwatchFile: vi.fn(),
  watch: vi.fn(),
  watchFile: vi.fn(),
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    mkdirSync: fsMock.mkdirSync,
    unwatchFile: fsMock.unwatchFile,
    watch: fsMock.watch,
    watchFile: fsMock.watchFile,
  };
});

describe("dashboard state watcher", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    fsMock.mkdirSync.mockReset();
    fsMock.unwatchFile.mockReset();
    fsMock.watch.mockReset();
    fsMock.watchFile.mockReset();
    fsMock.watch.mockImplementation(() => {
      const watcher = new EventEmitter() as EventEmitter & {
        close: () => void;
      };
      watcher.close = vi.fn();
      return watcher;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps a polling fallback for state-file invalidation when fs.watch is unavailable", async () => {
    fsMock.watch.mockImplementation(() => {
      throw Object.assign(new Error("too many open files"), {
        code: "EMFILE",
      });
    });
    const { startDashboardStateWatcher } =
      await import("../../src/dashboard/state-watch.js");
    const liveServer = { invalidateState: vi.fn() };
    const configPath = "/tmp/lark-bitable/config.json";
    const authPath = "/tmp/lark-bitable/auth.json";

    const watcher = startDashboardStateWatcher({
      authPath,
      configPath,
      liveServer,
    });
    const configWatch = fsMock.watchFile.mock.calls.find(
      ([path]) => path === configPath,
    );

    expect(configWatch).toBeDefined();

    const listener = configWatch?.[2] as (
      current: Stats,
      previous: Stats,
    ) => void;
    listener(stats({ mtimeMs: 2, size: 32 }), stats({ mtimeMs: 1, size: 32 }));
    await vi.advanceTimersByTimeAsync(100);

    expect(liveServer.invalidateState).toHaveBeenCalledWith({
      reason: "config.json changed on disk",
      surfaces: ["shell", "overview", "config", "audit"],
    });

    watcher.stop();

    expect(fsMock.unwatchFile).toHaveBeenCalledWith(configPath, listener);
  });

  it("does not poll state files while native file watching is active", async () => {
    const { startDashboardStateWatcher } =
      await import("../../src/dashboard/state-watch.js");

    startDashboardStateWatcher({
      authPath: "/tmp/lark-bitable/auth.json",
      configPath: "/tmp/lark-bitable/config.json",
      liveServer: { invalidateState: vi.fn() },
    });

    expect(fsMock.watchFile).not.toHaveBeenCalled();
  });
});

function stats(input: { mtimeMs: number; size: number }): Stats {
  return input as Stats;
}
