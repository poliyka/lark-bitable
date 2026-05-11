import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import LarkCommand from "../../src/cli/commands/lark.js";
import { AuthStore } from "../../src/config/auth-store.js";
import { readyAuthSession } from "../fixtures/auth.js";

describe("logout command", () => {
  it("succeeds when auth state is already absent", async () => {
    const path = join(
      await mkdtemp(join(tmpdir(), "lark-logout-")),
      "auth.json",
    );

    const result = await LarkCommand.run([
      "--logout",
      "--auth-path",
      path,
      "--yes",
    ]);

    expect(JSON.stringify(result)).toContain("already absent");
  });

  it("removes existing auth state", async () => {
    const path = join(
      await mkdtemp(join(tmpdir(), "lark-logout-")),
      "auth.json",
    );
    const store = new AuthStore(path);
    await store.write({ ...readyAuthSession, storagePath: path });

    const result = await LarkCommand.run([
      "--logout",
      "--auth-path",
      path,
      "--yes",
    ]);

    expect(await store.exists()).toBe(false);
    expect(JSON.stringify(result)).toContain("removed");
  });
});
