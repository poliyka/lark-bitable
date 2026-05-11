import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import MediaDownloadCommand from "../../src/cli/commands/media/download.js";
import { CliError } from "../../src/cli/errors.js";
import { AuthStore } from "../../src/config/auth-store.js";
import { readyAuthSession } from "../fixtures/auth.js";
import { mediaFileTokenFixture } from "../fixtures/media.js";

describe("media download command", () => {
  afterEach(() => {
    vi.doUnmock("@larksuiteoapi/node-sdk");
  });

  it("requires stored ready Lark auth before downloading media", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "media-download-"));

    await expect(
      MediaDownloadCommand.run([
        mediaFileTokenFixture,
        "--auth-path",
        join(cwd, "missing-auth.json"),
        "--out",
        join(cwd, "asset.bin"),
        "--json",
      ]),
    ).rejects.toThrow(CliError);
  });

  it("downloads through authenticated Drive media API and returns file metadata", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "media-download-"));
    const authPath = join(cwd, "auth.json");
    const outPath = join(cwd, "evidence", "image.png");
    const requests: Array<{ options: unknown; payload: unknown }> = [];
    await new AuthStore(authPath).write({
      ...readyAuthSession,
      storagePath: authPath,
    });

    vi.doMock("@larksuiteoapi/node-sdk", () => ({
      Client: class {
        drive = {
          media: {
            async download(payload: unknown, options: unknown) {
              requests.push({ payload, options });
              return {
                headers: {
                  "content-disposition": "attachment; filename=image.png",
                  "content-type": "image/png",
                },
                async writeFile(filePath: string) {
                  await mkdir(join(cwd, "evidence"), { recursive: true });
                  await import("node:fs/promises").then(({ writeFile }) =>
                    writeFile(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47])),
                  );
                },
              };
            },
          },
        };
      },
      LoggerLevel: { error: "error" },
    }));

    const result = await MediaDownloadCommand.run([
      mediaFileTokenFixture,
      "--auth-path",
      authPath,
      "--out",
      outPath,
      "--extra",
      "permission-extra",
      "--range",
      "bytes=0-1024",
      "--json",
    ]);

    expect(await readFile(outPath)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    );
    expect(result).toMatchObject({
      command: "media download",
      status: "ok",
      data: {
        fileToken: mediaFileTokenFixture,
        outPath,
        size: 4,
        contentType: "image/png",
        contentDisposition: "attachment; filename=image.png",
        usedAuthenticatedRequest: true,
      },
    });
    expect(JSON.stringify(requests)).toContain(mediaFileTokenFixture);
    expect(JSON.stringify(requests)).toContain("permission-extra");
    expect(JSON.stringify(requests)).toContain("bytes=0-1024");
    expect(JSON.stringify(requests)).toContain("Bearer access-secret");
  });
});
