import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import VerifyCommand from "../../src/cli/commands/verify.js";
import { AuthStore } from "../../src/config/auth-store.js";
import { ConfigStore } from "../../src/config/store.js";
import { readyAuthSession } from "../fixtures/auth.js";
import { fixtureRecords, fixtureSource } from "../fixtures/lark.js";

async function createVerifyFixture() {
  const cwd = await mkdtemp(join(tmpdir(), "verify-"));
  const authPath = join(cwd, "auth.json");
  await new AuthStore(authPath).write({
    ...readyAuthSession,
    storagePath: authPath,
  });
  const store = new ConfigStore({ cwd });
  store.setSource({
    ...fixtureSource,
    fieldAliases: {
      ...fixtureSource.fieldAliases,
      owner: "負責人",
    },
  });
  store.setActiveMode({ mode: "QA" });
  return { authPath, cwd, store };
}

describe("verify command", () => {
  it("requires QA mode", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "verify-"));
    const authPath = join(cwd, "auth.json");
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });
    new ConfigStore({ cwd }).setSource(fixtureSource);

    await expect(
      VerifyCommand.run([
        "recLogin",
        "--checks",
        "none",
        "--config-cwd",
        cwd,
        "--auth-path",
        authPath,
        "--fixture",
        JSON.stringify(fixtureRecords),
        "--json",
      ]),
    ).rejects.toThrow("QA verification requires active mode QA.");
  });

  it("reads full record detail, reports media references, owner criteria, and limit metadata", async () => {
    const { authPath, cwd } = await createVerifyFixture();
    await writeFile(
      join(cwd, "package.json"),
      JSON.stringify({
        packageManager: "pnpm@10.0.0",
        scripts: {
          test: "vitest run",
          typecheck: "tsc -p tsconfig.json",
        },
      }),
    );
    const records = [
      {
        ...fixtureRecords[0],
        fields: {
          ...fixtureRecords[0].fields,
          问题名称: "简体标题",
          負責人: [{ name: "openclaw" }],
          附件: [
            {
              file_token: "boxcnimage",
              mime_type: "image/png",
              name: "bug.png",
              size: 123,
            },
          ],
        },
      },
      {
        ...fixtureRecords[1],
        fields: {
          ...fixtureRecords[1].fields,
          負責人: [{ name: "other" }],
        },
      },
    ];

    const result = await VerifyCommand.run([
      "recLogin",
      "--checks",
      "none",
      "--owner",
      "openclaw",
      "--limit",
      "1",
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture",
      JSON.stringify(records),
      "--json",
    ]);

    expect(result.ownerCriteria).toMatchObject({
      applied: true,
      field: "負責人",
      matchedRecords: 1,
      value: "openclaw",
    });
    expect(result.queryLimit).toMatchObject({
      limit: 1,
      returned: 1,
      source: "command",
    });
    expect(result.data).toMatchObject({
      taskSummary: {
        recordId: "recLogin",
        title: "简体标题",
      },
    });
    expect(JSON.stringify(result.data)).toContain("boxcnimage");

    const packageEvidence = result.evidence?.filter((item) =>
      item.reference.endsWith("package.json"),
    );
    expect(packageEvidence).toHaveLength(1);
  });

  it("uses the previous selected task when no record id is provided", async () => {
    const { authPath, cwd, store } = await createVerifyFixture();
    store.setSelection({
      selectedRecordId: "recLogin",
      selectedAt: "2026-05-11T10:00:00.000Z",
      mode: "QA",
      selectionEvidence: {},
      candidateSnapshot: {},
    });

    const result = await VerifyCommand.run([
      "--checks",
      "none",
      "--config-cwd",
      cwd,
      "--auth-path",
      authPath,
      "--fixture",
      JSON.stringify(fixtureRecords),
      "--json",
    ]);

    expect(result.data).toMatchObject({
      taskSummary: {
        recordId: "recLogin",
      },
    });
    expect(JSON.stringify(result.data)).toContain(
      "Automatic check execution was disabled",
    );
  });

  it("blocks when the selected record is outside an applied owner filter", async () => {
    const { authPath, cwd } = await createVerifyFixture();
    const records = [
      {
        ...fixtureRecords[0],
        fields: {
          ...fixtureRecords[0].fields,
          負責人: [{ name: "other" }],
        },
      },
    ];

    await expect(
      VerifyCommand.run([
        "recLogin",
        "--checks",
        "none",
        "--owner",
        "openclaw",
        "--config-cwd",
        cwd,
        "--auth-path",
        authPath,
        "--fixture",
        JSON.stringify(records),
        "--json",
      ]),
    ).rejects.toThrow("does not match the active owner filter");
  });
});
