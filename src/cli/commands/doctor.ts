import { Flags } from "@oclif/core";

import { BaseCommand } from "../base-command.js";
import type { CommandOutput } from "../output.js";
import { AuthStore, defaultAuthPath } from "../../config/auth-store.js";
import { ConfigStore } from "../../config/store.js";
import {
  installBootstrapSkill,
  inspectBootstrapSkill,
} from "../../bootstrap/installer.js";
import { resolveWorkflowMode } from "../../mode/mode-config.js";

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
    const authStore = new AuthStore(flags["auth-path"]);
    const auth = await authStore.read();
    const store = new ConfigStore({ cwd: flags["config-cwd"] });
    const source = store.getSource();
    const larkApp = store.getLarkApp();
    const mode = resolveWorkflowMode(store);
    const missingMappings = source
      ? [
          source.statusField ? null : "status-field",
          source.priorityField ? null : "priority-field",
          source.fieldAliases.title ? null : "title-field",
        ].filter((value): value is string => Boolean(value))
      : [];
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
        storagePath: authStore.path,
        domain: auth?.domain,
        accountLabel: auth?.accountLabel,
        expiresAt: auth?.expiresAt,
      },
      mode: {
        active: mode.active,
        source: mode.source,
      },
      issues: [],
      data: {
        cli: {
          bin: this.config.bin,
          version: this.config.version,
        },
        configPath: store.path,
        authPath: authStore.path,
        bootstrapSkillInstalled: bootstrap.installed,
        bootstrapSkillPath: bootstrap.skillPath,
        bootstrapSkillStale: bootstrap.stale,
        sourceConfigured: Boolean(source),
        larkAppConfigured: Boolean(larkApp),
        activeMode: mode.active,
        modeSource: mode.source,
        configureMappingsReady: Boolean(source) && missingMappings.length === 0,
        missingConfigureMappings: missingMappings,
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
    if (source && missingMappings.length > 0) {
      output.issues?.push({
        code: "incomplete-configure",
        message:
          "Active source exists, but required bug mappings are incomplete.",
        remediation:
          "Run lark-bitable configure and choose status, priority, and title fields.",
      });
    }
    if (!larkApp) {
      output.issues?.push({
        code: "missing-lark-app-config",
        message:
          "Lark app settings are not stored, so refresh and interactive field discovery may fail.",
        remediation:
          "Run lark-bitable configure and provide Lark app id, app secret, and redirect URI.",
      });
    }
    if (!bootstrap.installed) {
      output.issues?.push({
        code: "missing-bootstrap",
        message: "Bootstrap skill guidance is not installed.",
        remediation: "Run lark-bitable doctor --install-skill",
      });
    }

    output.status =
      output.issues && output.issues.length > 0 ? "partial" : "ok";

    this.emit(output, Boolean(flags.json));
    return output;
  }
}
