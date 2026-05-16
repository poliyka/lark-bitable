import { mkdirSync, watch, type FSWatcher } from "node:fs";
import { dirname, basename } from "node:path";

import type { DashboardLiveServer } from "./live-server.js";
import type { DashboardSurface } from "./live-events.js";

export interface DashboardStateWatcher {
  stop(): void;
}

export interface DashboardStateWatcherInput {
  authPath: string;
  configPath: string;
  liveServer: DashboardLiveServer;
}

const STATE_WATCH_DEBOUNCE_MS = 100;

export function startDashboardStateWatcher(
  input: DashboardStateWatcherInput,
): DashboardStateWatcher {
  const watchedFiles = new Map<
    string,
    { label: string; surfaces: DashboardSurface[] }
  >([
    [
      input.configPath,
      {
        label: basename(input.configPath),
        surfaces: ["shell", "overview", "config", "audit"],
      },
    ],
    [
      input.authPath,
      {
        label: basename(input.authPath),
        surfaces: ["shell", "overview", "auth", "table", "audit"],
      },
    ],
  ]);
  const dirs = [...new Set([...watchedFiles.keys()].map(dirname))];
  const watchers: FSWatcher[] = [];
  const timers = new Map<string, NodeJS.Timeout>();

  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    try {
      const watcher = watch(dir, { persistent: false }, (_event, filename) => {
        const changedName = filename?.toString();
        if (!changedName) {
          for (const [path, target] of watchedFiles.entries()) {
            scheduleInvalidation(path, target);
          }
          return;
        }
        for (const [path, target] of watchedFiles.entries()) {
          if (basename(path) === changedName) {
            scheduleInvalidation(path, target);
          }
        }
      });
      watchers.push(watcher);
    } catch {
      // Dashboard status still has fallback reconciliation in the browser.
    }
  }

  return {
    stop() {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      for (const watcher of watchers) watcher.close();
    },
  };

  function scheduleInvalidation(
    path: string,
    target: { label: string; surfaces: DashboardSurface[] },
  ): void {
    const existing = timers.get(path);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      timers.delete(path);
      input.liveServer.invalidateState({
        reason: `${target.label} changed on disk`,
        surfaces: target.surfaces,
      });
    }, STATE_WATCH_DEBOUNCE_MS);
    timer.unref?.();
    timers.set(path, timer);
  }
}
