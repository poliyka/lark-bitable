import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { AuthStore, defaultAuthPath } from "../../src/config/auth-store.js";
import { readyAuthSession } from "../fixtures/auth.js";

describe("AuthStore", () => {
  it("stores auth outside the repository under the user home path", () => {
    expect(defaultAuthPath("/home/alice")).toBe(
      "/home/alice/.lark-bitable-cli/auth.json",
    );
  });

  it("writes token state with owner-only permissions", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lark-auth-"));
    const path = join(dir, "auth.json");
    const store = new AuthStore(path);

    await store.write({ ...readyAuthSession, storagePath: path });

    const fileStat = await stat(path);
    expect(fileStat.mode & 0o077).toBe(0);
    expect(JSON.parse(await readFile(path, "utf8")).accessToken).toBe(
      "access-secret",
    );
  });

  it("returns undefined when the auth file is missing and throws on malformed JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lark-auth-"));
    const path = join(dir, "auth.json");
    const store = new AuthStore(path);

    await expect(store.read()).resolves.toBeUndefined();
    await writeFile(path, "{bad json");
    await expect(store.read()).rejects.toThrow();
  });

  it("deletes auth state and reports whether a file existed", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lark-auth-"));
    const path = join(dir, "auth.json");
    const store = new AuthStore(path);

    expect(await store.delete()).toBe(false);
    await store.write({ ...readyAuthSession, storagePath: path });
    expect(await store.delete()).toBe(true);
    expect(await store.exists()).toBe(false);
  });
});
