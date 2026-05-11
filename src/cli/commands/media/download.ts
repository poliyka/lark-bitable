import { mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { Args, Flags } from "@oclif/core";

import { BaseCommand } from "../../base-command.js";
import { CliError } from "../../errors.js";
import type { CommandOutput } from "../../output.js";
import { AuthStore, defaultAuthPath } from "../../../config/auth-store.js";
import { toEvidence } from "../../../reporting/evidence.js";
import { LarkClient, createLarkSdkTransport } from "../../../lark/client.js";

export default class MediaDownloadCommand extends BaseCommand {
  static args = {
    fileToken: Args.string({
      description:
        "Lark drive media file_token from a Bitable image/attachment.",
      required: true,
    }),
  };
  static description =
    "Download a Lark Bitable image or attachment media token with stored auth.";
  static examples = [
    {
      command:
        "lark-bitable media download boxcnabcdefg --out ./evidence/image.png",
      description:
        "Download a Bitable image/attachment media token through the Drive media API.",
    },
  ];
  static flags = {
    ...BaseCommand.baseFlags,
    "auth-path": Flags.string({ default: defaultAuthPath(), hidden: true }),
    extra: Flags.string({
      description:
        "Drive media extra query string required by some permission-protected Bitable assets.",
    }),
    out: Flags.string({
      char: "o",
      description: "Output file path.",
      required: true,
    }),
    range: Flags.string({
      description: "Optional HTTP Range header, for example bytes=0-1024.",
    }),
  };

  async run(): Promise<CommandOutput> {
    const { args, flags } = await this.parse(MediaDownloadCommand);
    const auth = await new AuthStore(flags["auth-path"]).read();
    if (!auth) {
      throw new CliError({
        code: "missing-auth",
        message: "Lark auth is missing or not ready.",
        remediation: "Run lark-bitable lark --login",
      });
    }
    if (auth.status !== "ready") {
      throw new CliError({
        code: `auth-${auth.status}`,
        message: `Lark auth is ${auth.status}.`,
        remediation: "Run lark-bitable lark --login",
      });
    }

    const outPath = resolve(flags.out);
    await mkdir(dirname(outPath), { recursive: true });
    const download = await new LarkClient(
      createLarkSdkTransport(auth),
    ).downloadMedia({
      extra: flags.extra,
      fileToken: args.fileToken,
      outPath,
      range: flags.range,
    });
    const downloaded = await stat(outPath);
    const evidence = [
      toEvidence({
        type: "lark-media",
        reference: args.fileToken,
        excerpt: [
          `Downloaded ${download.contentType ?? "unknown content type"}`,
          `to ${outPath}`,
          `size=${downloaded.size}`,
        ].join(" "),
        status: "verified",
      }),
    ];

    const output: CommandOutput = {
      command: "media download",
      status: "ok",
      evidence,
      data: {
        fileToken: args.fileToken,
        outPath,
        size: downloaded.size,
        contentType: download.contentType ?? null,
        contentDisposition: download.contentDisposition ?? null,
        usedAuthenticatedRequest: true,
        api: "GET /open-apis/drive/v1/medias/:file_token/download",
      },
    };

    this.emit(output, Boolean(flags.json));
    return output;
  }
}
