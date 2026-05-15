import { Command, Flags, type Interfaces } from "@oclif/core";

import {
  appendAuditEntry,
  buildAuditEntry,
  resolveAuditPath,
} from "../audit/log.js";
import { isCliError } from "./errors.js";
import { writeOutput, type CommandOutput } from "./output.js";

export abstract class BaseCommand extends Command {
  private readonly commandStartedAt = new Date();

  static baseFlags = {
    "audit-path": Flags.string({
      default: resolveAuditPath(),
      hidden: true,
    }),
    json: Flags.boolean({
      description: "Emit structured JSON output.",
      required: false,
    }),
  };

  static override async run<T extends Command>(
    this: new (argv: string[], config: Interfaces.Config) => T,
    argv?: string[],
    opts?: Interfaces.LoadOptions,
  ): Promise<ReturnType<T["run"]>> {
    return Command.run.call(
      this,
      argv,
      opts ?? {
        devPlugins: false,
        root: process.cwd(),
      },
    ) as Promise<ReturnType<T["run"]>>;
  }

  protected async parseJsonFlag(): Promise<boolean> {
    const parsed = await this.parse(this.ctor as never);
    return Boolean(parsed.flags.json);
  }

  protected emit(output: CommandOutput, json = false): CommandOutput {
    writeOutput(output, json);
    this.writeAudit(output);
    return output;
  }

  protected async catch(error: Error): Promise<unknown> {
    if (isCliError(error)) {
      const output: CommandOutput = {
        command: this.id ?? "unknown",
        status: error.status,
        issues: [
          {
            code: error.code,
            message: error.message,
            remediation: error.remediation,
          },
        ],
      };
      writeOutput(output, this.argv.includes("--json"));
      this.writeAudit(output, error);
      process.exitCode = 1;
      throw error;
    }
    const output: CommandOutput = {
      command: this.id ?? this.constructor.name.toLowerCase() ?? "unknown",
      status: "error",
      issues: [
        {
          code: "unexpected-error",
          message: error.message || "Unexpected command failure.",
        },
      ],
    };
    this.writeAudit(output, error);
    throw error;
  }

  protected writeAudit(
    output: CommandOutput,
    error?: Error & { code?: string },
  ): void {
    const result = appendAuditEntry(
      this.auditPath(),
      buildAuditEntry({
        argv: this.argv,
        error,
        finishedAt: new Date(),
        output,
        startedAt: this.commandStartedAt,
      }),
    );
    if (!result.ok) {
      process.stderr.write(
        `warning: audit log write failed for ${result.path}: ${result.error.message}\n`,
      );
    }
  }

  private auditPath(): string {
    const explicitIndex = this.argv.findIndex(
      (item) => item === "--audit-path" || item.startsWith("--audit-path="),
    );
    if (explicitIndex === -1) return resolveAuditPath();
    const item = this.argv[explicitIndex];
    if (!item) return resolveAuditPath();
    const [, inlineValue] = item.split("=", 2);
    if (inlineValue) return inlineValue;
    return this.argv[explicitIndex + 1] ?? resolveAuditPath();
  }
}
