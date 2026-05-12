import {
  access,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { ConfigStore, defaultConfigPath } from "../../src/config/store.js";
import { fixtureSource } from "../fixtures/lark.js";

describe("ConfigStore", () => {
  it("stores default config under the private lark-bitable home directory", async () => {
    const home = await mkdtemp(join(tmpdir(), "lark-home-"));
    const store = new ConfigStore({ home });

    store.setSource(fixtureSource);

    expect(store.path).toBe(defaultConfigPath(home));
    expect(
      JSON.parse(await readFile(store.path, "utf8")).activeSource,
    ).toMatchObject({
      tableId: fixtureSource.tableId,
    });

    const dirStat = await stat(join(home, ".lark-bitable"));
    const fileStat = await stat(store.path);
    expect(dirStat.mode & 0o077).toBe(0);
    expect(fileStat.mode & 0o077).toBe(0);
  });

  it("migrates legacy conf config into the unified CLI directory", async () => {
    const home = await mkdtemp(join(tmpdir(), "lark-home-"));
    const legacyDir = await mkdtemp(join(tmpdir(), "lark-legacy-config-"));
    const legacyPath = join(legacyDir, "config.json");

    await writeFile(
      legacyPath,
      `${JSON.stringify({ activeSource: fixtureSource }, null, 2)}\n`,
    );

    const store = new ConfigStore({ home, legacyPath });

    expect(store.path).toBe(defaultConfigPath(home));
    expect(store.getSource()?.tableId).toBe(fixtureSource.tableId);
  });

  it("does not resurrect legacy config after the unified config is deleted", async () => {
    const home = await mkdtemp(join(tmpdir(), "lark-home-"));
    const legacyDir = await mkdtemp(join(tmpdir(), "lark-legacy-config-"));
    const legacyPath = join(legacyDir, "config.json");

    await writeFile(
      legacyPath,
      `${JSON.stringify({ activeSource: fixtureSource }, null, 2)}\n`,
    );

    const migrated = new ConfigStore({ home, legacyPath });
    expect(migrated.getSource()?.tableId).toBe(fixtureSource.tableId);

    await expect(access(legacyPath)).rejects.toThrow();
    await rm(defaultConfigPath(home));

    const freshStore = new ConfigStore({ home, legacyPath });
    expect(freshStore.getSource()).toBeUndefined();
  });

  it("stores, replaces, and clears active source configuration", async () => {
    const store = new ConfigStore({
      cwd: await mkdtemp(join(tmpdir(), "lark-config-")),
      projectName: "test-config",
    });

    store.setSource(fixtureSource);
    expect(store.getSource()?.tableId).toBe(fixtureSource.tableId);

    store.setSource({ ...fixtureSource, tableId: "tblNew" });
    expect(store.getSource()?.tableId).toBe("tblNew");

    store.clearSource();
    expect(store.getSource()).toBeUndefined();
  });

  it("persists field mappings and actionable defaults", async () => {
    const store = new ConfigStore({
      cwd: await mkdtemp(join(tmpdir(), "lark-config-")),
      projectName: "test-config",
    });

    store.setSource({
      ...fixtureSource,
      statusField: "Status",
      priorityField: "Priority",
      fieldAliases: {
        title: "Title",
      },
    });

    expect(store.getSource()).toMatchObject({
      actionableStatus: "待處理",
      statusField: "Status",
      priorityField: "Priority",
      fieldAliases: {
        title: "Title",
      },
    });
  });

  it("stores Lark app OAuth configuration separately from the active source", async () => {
    const store = new ConfigStore({
      cwd: await mkdtemp(join(tmpdir(), "lark-config-")),
      projectName: "test-config",
    });

    store.setLarkApp({
      appId: "cli-app",
      appSecret: "cli-secret",
      callbackPort: 14543,
      domain: "larksuite.com",
      redirectUri: "http://127.0.0.1:14543/callback",
      scopes: ["bitable:app:readonly"],
      updatedAt: "2026-05-08T04:00:00.000Z",
    });

    expect(store.getLarkApp()).toMatchObject({
      appId: "cli-app",
      appSecret: "cli-secret",
      callbackPort: 14543,
      domain: "larksuite.com",
      redirectUri: "http://127.0.0.1:14543/callback",
      scopes: ["bitable:app:readonly"],
    });

    store.clearLarkApp();
    expect(store.getLarkApp()).toBeUndefined();
  });
});
