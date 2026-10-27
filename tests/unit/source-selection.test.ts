import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveCommandSource } from "../../src/cli/source-selection.js";
import { ConfigStore } from "../../src/config/store.js";
import { fixtureSource } from "../fixtures/lark.js";

const scratch = join(
  homedir(),
  "scratchpad/lark-bitable-perf-20261027/c01-writer",
);
let cwd: string;
let store: ConfigStore;

beforeEach(async () => {
  await mkdir(scratch, { recursive: true });
  cwd = await mkdtemp(join(scratch, "source-selection-"));
  store = new ConfigStore({ cwd });
  store.setSource(fixtureSource);
});

afterEach(async () => {
  if (cwd) await rm(cwd, { recursive: true, force: true });
});

describe("resolveCommandSource", () => {
  it("resolves a saved profile instead of the active source", () => {
    store.setTableProfile("req", {
      ...fixtureSource,
      appToken: "appRequirements",
      tableId: "tblRequirements",
    });
    expect(resolveCommandSource(store, { tableProfile: "req" })).toMatchObject({
      appToken: "appRequirements",
      tableId: "tblRequirements",
    });
  });

  it("resolves a full URL including its recorded view without an active source", () => {
    store.clearSource();
    expect(
      resolveCommandSource(store, {
        table:
          "https://example.larksuite.com/base/appUrl?table=tblUrl&view=vewUrl",
      }),
    ).toMatchObject({
      appToken: "appUrl",
      tableId: "tblUrl",
      viewId: "vewUrl",
    });
  });

  it("resolves a table token using the active app token and drops the old view from metadata and URL", async () => {
    const before = await readFile(store.path, "utf8");
    const source = resolveCommandSource(store, { table: "tblRequirements" });
    expect(source).toMatchObject({
      appToken: "TypDbjKBfaJcaSsoEI1lZjHsgIY",
      tableId: "tblRequirements",
      viewId: undefined,
    });
    expect(new URL(source.sourceUrl).searchParams.get("table")).toBe(
      "tblRequirements",
    );
    expect(new URL(source.sourceUrl).searchParams.has("view")).toBe(false);
    expect(await readFile(store.path, "utf8")).toBe(before);
  });

  it("returns the active source when neither selection flag is given", () => {
    expect(resolveCommandSource(store, {})).toEqual(fixtureSource);
  });

  it("rejects conflicting table and profile flags even when the profile does not exist", () => {
    expect(() =>
      resolveCommandSource(store, {
        table: "tblRequirements",
        tableProfile: "unknown",
      }),
    ).toThrow(expect.objectContaining({ code: "conflicting-table-flags" }));
  });

  it("rejects an unknown profile with remediation listing existing names", () => {
    store.setTableProfile("req", fixtureSource);
    store.setTableProfile("release", fixtureSource);
    expect(() =>
      resolveCommandSource(store, { tableProfile: "missing" }),
    ).toThrow(
      expect.objectContaining({
        code: "unknown-table-profile",
        remediation: expect.stringContaining("req"),
      }),
    );
    expect(() =>
      resolveCommandSource(store, { tableProfile: "missing" }),
    ).toThrow(
      expect.objectContaining({
        remediation: expect.stringContaining("release"),
      }),
    );
  });

  it("rejects a table token without an active source with missing-source", () => {
    store.clearSource();
    expect(() =>
      resolveCommandSource(store, { table: "tblRequirements" }),
    ).toThrow(expect.objectContaining({ code: "missing-source" }));
  });

  it("rejects default selection without an active source with missing-source", () => {
    store.clearSource();
    expect(() => resolveCommandSource(store, {})).toThrow(
      expect.objectContaining({ code: "missing-source" }),
    );
  });

  it("resolves a saved profile without requiring an active source", () => {
    store.setTableProfile("req", fixtureSource);
    store.clearSource();
    expect(resolveCommandSource(store, { tableProfile: "req" })).toEqual(
      fixtureSource,
    );
  });

  it("does not treat inherited object properties as saved profiles", () => {
    expect(() =>
      resolveCommandSource(store, { tableProfile: "constructor" }),
    ).toThrow(expect.objectContaining({ code: "unknown-table-profile" }));
    store.setTableProfile("constructor", fixtureSource);
    expect(
      resolveCommandSource(store, { tableProfile: "constructor" }),
    ).toEqual(fixtureSource);
  });

  it("rejects malformed table URLs through the existing URL parser", () => {
    expect(() =>
      resolveCommandSource(store, {
        table: "https://example.com/base/app?table=tblOther",
      }),
    ).toThrow(expect.objectContaining({ code: "invalid-lark-domain" }));
  });
});
