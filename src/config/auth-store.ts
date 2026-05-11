import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { homedir } from "node:os";

import { authSessionSchema, type LarkAuthSession } from "./schema.js";

export function defaultAuthPath(home = homedir()): string {
  return join(home, ".lark-bitable", "auth.json");
}

export class AuthStore {
  readonly path: string;

  constructor(path = defaultAuthPath()) {
    this.path = path;
    migrateLegacyAuth(this.path);
  }

  async read(): Promise<LarkAuthSession | undefined> {
    try {
      const raw = await readFile(this.path, "utf8");
      return authSessionSchema.parse(JSON.parse(raw));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }

  async write(session: LarkAuthSession): Promise<LarkAuthSession> {
    const parsed = authSessionSchema.parse({
      ...session,
      storagePath: this.path,
    });
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    await writeFile(this.path, `${JSON.stringify(parsed, null, 2)}\n`, {
      mode: 0o600,
    });
    return parsed;
  }

  async delete(): Promise<boolean> {
    try {
      await rm(this.path);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw error;
    }
  }

  async exists(): Promise<boolean> {
    try {
      await stat(this.path);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw error;
    }
  }
}

function migrateLegacyAuth(targetPath: string): void {
  const legacyPath = legacyAuthPathForTarget(targetPath);
  if (!legacyPath || existsSync(targetPath) || !existsSync(legacyPath)) return;

  mkdirSync(dirname(targetPath), { recursive: true, mode: 0o700 });
  chmodSync(dirname(targetPath), 0o700);
  try {
    renameSync(legacyPath, targetPath);
  } catch (error) {
    if (!isCrossDeviceRenameError(error)) throw error;
    copyFileSync(legacyPath, targetPath);
    rmSync(legacyPath, { force: true });
  }
  if (existsSync(targetPath) && statSync(targetPath).isFile()) {
    rewriteMigratedAuthStoragePath(targetPath);
    chmodSync(targetPath, 0o600);
  }
}

function rewriteMigratedAuthStoragePath(targetPath: string): void {
  const parsed = JSON.parse(readFileSync(targetPath, "utf8")) as unknown;
  if (typeof parsed !== "object" || parsed === null) return;
  writeFileSync(
    targetPath,
    `${JSON.stringify({ ...parsed, storagePath: targetPath }, null, 2)}\n`,
    { mode: 0o600 },
  );
}

function legacyAuthPathForTarget(targetPath: string): string | undefined {
  const targetDir = dirname(targetPath);
  if (basename(targetDir) !== ".lark-bitable") return undefined;
  return join(dirname(targetDir), ".lark-bitable-cli", "auth.json");
}

function isCrossDeviceRenameError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "EXDEV"
  );
}
