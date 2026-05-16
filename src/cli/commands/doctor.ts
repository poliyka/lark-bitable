import { Flags } from "@oclif/core";

import { BaseCommand } from "../base-command.js";
import type { CommandOutput } from "../output.js";
import { defaultAuthPath } from "../../config/auth-store.js";
import { inspectDoctorHealth } from "../../config/doctor-health.js";

export default class DoctorCommand extends BaseCommand {
  static description =
    "Check CLI installation, bootstrap guidance, source configuration, and Lark auth status.";
  static examples = [
    {
      command: "lark-bitable doctor",
      description: "Show human-readable setup status.",
    },
    {
      command: "lark-bitable doctor --json",
      description: "Show structured setup status for AI agents.",
    },
  ];
  static flags = {
    ...BaseCommand.baseFlags,
    "auth-path": Flags.string({ default: defaultAuthPath(), hidden: true }),
    "config-cwd": Flags.string({ hidden: true }),
    "install-skill": Flags.boolean({
      description: "Install shipped bootstrap skill guidance when supported.",
    }),
    "skill-dir": Flags.string({
      description: "Agent skill directory for bootstrap checks.",
      hidden: true,
    }),
  };

  async run(): Promise<CommandOutput> {
    const { flags } = await this.parse(DoctorCommand);
    const health = await inspectDoctorHealth({
      authPath: flags["auth-path"],
      cli: {
        bin: this.config.bin,
        version: this.config.version,
      },
      configCwd: flags["config-cwd"],
      installSkill: flags["install-skill"],
      skillDir: flags["skill-dir"],
    });
    const output: CommandOutput = {
      command: "doctor",
      status: health.status,
      auth: health.auth,
      mode: health.mode,
      issues: health.issues,
      data: health.data,
    };

    this.emit(output, Boolean(flags.json));
    return output;
  }
}
