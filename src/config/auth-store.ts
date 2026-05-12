import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

import { authSessionSchema, type LarkAuthSession } from "./schema.js";

export function defaultAuthPath(home = homedir()): string {
  return join(home, ".lark-bitable", "auth.json");
}

export class AuthStore {
  readonly path: string;

  constructor(path = defaultAuthPath()) {
    this.path = path;
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
