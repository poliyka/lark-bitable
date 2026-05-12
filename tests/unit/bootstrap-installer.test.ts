import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  defaultSkillTargetDirs,
  installBootstrapSkill,
  installBootstrapSkillTargets,
  inspectBootstrapSkill,
} from "../../src/bootstrap/installer.js";

describe("bootstrap installer", () => {
  it("defaults to Codex and Claude Code skill directories", () => {
    expect(defaultSkillTargetDirs()).toEqual([
      ".agents/skills",
      ".claude/skills",
    ]);
  });

  it("installs skill guidance into a target directory", async () => {
    const targetDir = await mkdtemp(join(tmpdir(), "skill-"));

    const result = await installBootstrapSkill({ targetDir });

    expect(result.installed).toBe(true);
    expect(await readFile(result.skillPath, "utf8")).toContain(
      "lark-bitable doctor",
    );
  });

  it("detects missing and installed skill states", async () => {
    const targetDir = await mkdtemp(join(tmpdir(), "skill-"));

    expect((await inspectBootstrapSkill({ targetDir })).installed).toBe(false);
    await installBootstrapSkill({ targetDir });
    expect((await inspectBootstrapSkill({ targetDir })).installed).toBe(true);
  });

  it("installs skill guidance into both Codex and Claude Code target directories", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "skill-targets-"));
    const targetDirs = [
      join(cwd, ".agents", "skills"),
      join(cwd, ".claude", "skills"),
    ];

    const result = await installBootstrapSkillTargets({ targetDirs });

    expect(result.installed).toBe(true);
    expect(result.targets).toHaveLength(2);
    for (const target of result.targets) {
      expect(await readFile(target.skillPath, "utf8")).toContain(
        "lark-bitable valid",
      );
    }
  });

  it("installs shipped skill guidance when invoked outside the package root", async () => {
    const originalCwd = process.cwd();
    const cwd = await mkdtemp(join(tmpdir(), "skill-cwd-"));
    const targetDir = await mkdtemp(join(tmpdir(), "skill-target-"));

    try {
      process.chdir(cwd);
      const result = await installBootstrapSkill({ targetDir });

      expect(await readFile(result.skillPath, "utf8")).toContain(
        "lark-bitable valid",
      );
    } finally {
      process.chdir(originalCwd);
    }
  });
});
