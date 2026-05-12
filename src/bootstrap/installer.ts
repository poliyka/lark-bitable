import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface BootstrapSkillState {
  installed: boolean;
  skillPath: string;
  stale?: boolean;
}

export interface BootstrapSkillTargetState extends BootstrapSkillState {
  targetDir: string;
}

export interface BootstrapSkillGroupState extends BootstrapSkillState {
  targets: BootstrapSkillTargetState[];
}

export interface BootstrapInstallResult extends BootstrapSkillTargetState {
  installed: true;
}

export interface BootstrapInstallGroupResult extends BootstrapSkillGroupState {
  installed: true;
}

const DEFAULT_SKILL_TARGET_DIRS = [".agents/skills", ".claude/skills"] as const;

export function defaultSkillTargetDirs(): string[] {
  return [...DEFAULT_SKILL_TARGET_DIRS];
}

export function defaultSkillSourcePath(): string {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  return resolve(moduleDir, "../../src/bootstrap/skill/SKILL.md");
}

export function skillTargetPath(targetDir: string): string {
  return join(targetDir, "lark-bitable", "SKILL.md");
}

export async function inspectBootstrapSkill(input: {
  targetDir: string;
}): Promise<BootstrapSkillTargetState> {
  const skillPath = skillTargetPath(input.targetDir);
  try {
    const content = await readFile(skillPath, "utf8");
    return {
      installed: true,
      skillPath,
      targetDir: input.targetDir,
      stale: !content.includes("lark-bitable valid"),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { installed: false, skillPath, targetDir: input.targetDir };
    }
    throw error;
  }
}

export async function inspectBootstrapSkillTargets(input: {
  targetDirs: string[];
}): Promise<BootstrapSkillGroupState> {
  const targets = await Promise.all(
    uniqueTargetDirs(input.targetDirs).map((targetDir) =>
      inspectBootstrapSkill({ targetDir }),
    ),
  );
  const firstProblem = targets.find(
    (target) => !target.installed || target.stale,
  );
  const representative = firstProblem ?? targets[0];

  return {
    installed:
      targets.length > 0 && targets.every((target) => target.installed),
    skillPath: representative?.skillPath ?? "",
    stale: targets.some((target) => target.stale),
    targets,
  };
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
    targetDir: input.targetDir,
    stale: false,
  };
}

export async function installBootstrapSkillTargets(input: {
  sourcePath?: string;
  targetDirs: string[];
}): Promise<BootstrapInstallGroupResult> {
  const targets: BootstrapInstallResult[] = [];
  for (const targetDir of uniqueTargetDirs(input.targetDirs)) {
    targets.push(
      await installBootstrapSkill({
        sourcePath: input.sourcePath,
        targetDir,
      }),
    );
  }

  return {
    installed: true,
    skillPath: targets[0]?.skillPath ?? "",
    stale: false,
    targets,
  };
}

function uniqueTargetDirs(targetDirs: string[]): string[] {
  return [...new Set(targetDirs)];
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
