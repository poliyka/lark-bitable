import { Flags } from "@oclif/core";

import { BaseCommand } from "../base-command.js";
import type { CommandOutput } from "../output.js";
import { AuthStore } from "../../config/auth-store.js";
import { ConfigStore } from "../../config/store.js";
import {
  installBootstrapSkill,
  inspectBootstrapSkill,
} from "../../bootstrap/installer.js";

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
    const auth = await new AuthStore().read();
    const source = new ConfigStore().getSource();
    const bootstrap = flags["install-skill"]
      ? await installBootstrapSkill({
          targetDir: flags["skill-dir"] ?? ".agents/skills",
        })
      : await inspectBootstrapSkill({
          targetDir: flags["skill-dir"] ?? ".agents/skills",
        });
    const output: CommandOutput = {
      command: "doctor",
      status: auth && source && bootstrap.installed ? "ok" : "partial",
      auth: {
        status: auth?.status ?? "missing",
        storagePath: "~/.lark-bitable-cli/auth.json",
        domain: auth?.domain,
        accountLabel: auth?.accountLabel,
        expiresAt: auth?.expiresAt,
      },
      issues: [],
      data: {
        cli: {
          bin: this.config.bin,
          version: this.config.version,
        },
        bootstrapSkillInstalled: bootstrap.installed,
        bootstrapSkillPath: bootstrap.skillPath,
        bootstrapSkillStale: bootstrap.stale,
        sourceConfigured: Boolean(source),
        installSkillRequested: Boolean(flags["install-skill"]),
      },
    };

    if (!auth) {
      output.issues?.push({
        code: "missing-auth",
        message: "Lark auth is missing.",
        remediation: "Run lark-bitable lark --login",
      });
    }
    if (!source) {
      output.issues?.push({
        code: "missing-source",
        message: "No active Lark Bitable source is configured.",
        remediation: "Run lark-bitable configure <url>",
      });
    }
    if (!bootstrap.installed) {
      output.issues?.push({
        code: "missing-bootstrap",
        message: "Bootstrap skill guidance is not installed.",
        remediation: "Run lark-bitable doctor --install-skill",
      });
    }

    this.emit(output, Boolean(flags.json));
    return output;
  }
}
