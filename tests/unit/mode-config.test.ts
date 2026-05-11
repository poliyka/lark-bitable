import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  defaultOwnerForMode,
  normalizeWorkflowMode,
  resolveWorkflowMode,
} from "../../src/mode/mode-config.js";
import { ConfigStore } from "../../src/config/store.js";

describe("workflow mode config", () => {
  it("normalizes supported mode names", () => {
    expect(normalizeWorkflowMode("QA")).toBe("QA");
    expect(normalizeWorkflowMode("qa")).toBe("QA");
    expect(normalizeWorkflowMode("Developer")).toBe("Developer");
    expect(normalizeWorkflowMode("developer")).toBe("Developer");
  });

  it("rejects unsupported mode names with a human-readable message", () => {
    expect(() => normalizeWorkflowMode("support")).toThrow(
      "Workflow mode must be QA or Developer.",
    );
  });

  it("defaults to Developer when no workflow config exists", async () => {
    const store = new ConfigStore({
      cwd: await mkdtemp(join(tmpdir(), "mode-config-")),
    });

    expect(resolveWorkflowMode(store)).toEqual({
      active: "Developer",
      source: "defaulted",
    });
  });

  it("resolves explicitly configured QA and Developer modes", async () => {
    const store = new ConfigStore({
      cwd: await mkdtemp(join(tmpdir(), "mode-config-")),
    });

    store.setActiveMode({ mode: "QA" });
    expect(resolveWorkflowMode(store)).toMatchObject({
      active: "QA",
      source: "explicit",
    });

    store.setActiveMode({ mode: "Developer" });
    expect(resolveWorkflowMode(store)).toMatchObject({
      active: "Developer",
      source: "explicit",
    });
  });

  it("reads mode-specific default owners without making owner required", async () => {
    const store = new ConfigStore({
      cwd: await mkdtemp(join(tmpdir(), "mode-config-")),
    });
    store.setActiveMode({ mode: "Developer" });
    store.setModeDefaultOwner({ mode: "Developer", owner: "openclaw" });

    const config = store.getWorkflowConfig();

    expect(defaultOwnerForMode(config, "Developer")).toBe("openclaw");
    expect(defaultOwnerForMode(config, "QA")).toBeUndefined();
  });
});
