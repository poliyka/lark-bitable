import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface BootstrapSkillState {
  installed: boolean;
  skillPath: string;
  stale?: boolean;
}

export interface BootstrapInstallResult extends BootstrapSkillState {
  installed: true;
}

export function defaultSkillSourcePath(): string {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  return resolve(moduleDir, "../../src/bootstrap/skill/SKILL.md");
}

export function skillTargetPath(targetDir: string): string {
  return join(targetDir, "lark-bitable-cli", "SKILL.md");
}

export async function inspectBootstrapSkill(input: {
  targetDir: string;
}): Promise<BootstrapSkillState> {
  const skillPath = skillTargetPath(input.targetDir);
  try {
    const content = await readFile(skillPath, "utf8");
    return {
      installed: true,
      skillPath,
      stale: !content.includes("lark-bitable valid"),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { installed: false, skillPath };
    }
    throw error;
  }
}

export async function installBootstrapSkill(input: {
  sourcePath?: string;
  targetDir: string;
}): Promise<BootstrapInstallResult> {
  const sourcePath = input.sourcePath ?? (await findDefaultSkillSourcePath());
  await stat(sourcePath);
  const skillPath = skillTargetPath(input.targetDir);
  await mkdir(dirname(skillPath), { recursive: true });
  await copyFile(sourcePath, skillPath);
  return {
    installed: true,
    skillPath,
    stale: false,
  };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function findDefaultSkillSourcePath(): Promise<string> {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    defaultSkillSourcePath(),
    resolve(moduleDir, "skill/SKILL.md"),
    resolve(moduleDir, "../../dist/bootstrap/skill/SKILL.md"),
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) return candidate;
  }

  return candidates[0] ?? defaultSkillSourcePath();
}
