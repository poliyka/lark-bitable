import { Command, Flags, type Interfaces } from "@oclif/core";

import { isCliError } from "./errors.js";
import { writeOutput, type CommandOutput } from "./output.js";

export abstract class BaseCommand extends Command {
  static baseFlags = {
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
      process.exitCode = 1;
      throw error;
    }
    throw error;
  }
}
