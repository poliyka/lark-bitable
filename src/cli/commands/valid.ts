import { Flags } from "@oclif/core";

import { BaseCommand } from "../base-command.js";
import type { CommandOutput } from "../output.js";
import { inspectBootstrapSkill } from "../../bootstrap/installer.js";
import { AuthStore, defaultAuthPath } from "../../config/auth-store.js";
import { checkReadiness, type Workflow } from "../../config/readiness.js";
import { ConfigStore } from "../../config/store.js";

export default class ValidCommand extends BaseCommand {
  static description =
    "Validate whether the current setup can run a workflow and show remediation.";
  static examples = [
    {
      command: "lark-bitable valid",
      description: "Validate global setup readiness.",
    },
    {
      command: "lark-bitable valid --workflow triage",
      description: "Validate guided triage prerequisites.",
    },
  ];
  static flags = {
    ...BaseCommand.baseFlags,
    "auth-path": Flags.string({
      default: defaultAuthPath(),
      description: "Auth storage path for tests or advanced use.",
      hidden: true,
    }),
    "config-cwd": Flags.string({
      description: "Config storage directory for tests or advanced use.",
      hidden: true,
    }),
    guide: Flags.boolean({
      description: "Show guided remediation when setup is incomplete.",
    }),
    "live-access": Flags.string({
      description: "Live access validation state for deterministic tests.",
      hidden: true,
      options: ["verified", "partial", "failed", "skipped"],
    }),
    "skill-dir": Flags.string({
      description: "Agent skill directory for bootstrap checks.",
      hidden: true,
    }),
    workflow: Flags.string({
      default: "global",
      description: "Workflow to validate.",
      options: ["global", "inspect", "triage", "research", "verify"],
    }),
  };

  async run(): Promise<CommandOutput> {
    const { flags } = await this.parse(ValidCommand);
    const bootstrap = await inspectBootstrapSkill({
      targetDir: flags["skill-dir"] ?? ".agents/skills",
    });
    const result = await checkReadiness(flags.workflow as Workflow, {
      authStore: new AuthStore(flags["auth-path"]),
      bootstrap,
      configStore: new ConfigStore({ cwd: flags["config-cwd"] }),
      liveAccessStatus: flags["live-access"] as
        | "verified"
        | "partial"
        | "failed"
        | "skipped"
        | undefined,
    });

    const output: CommandOutput = {
      command: "valid",
      status:
        result.status === "ready"
          ? "ok"
          : result.status === "partial"
            ? "partial"
            : "error",
      issues: [...result.blockingIssues, ...result.partialIssues],
      evidence: result.evidence,
      mode: {
        active: result.activeMode ?? null,
        source: result.modeSource,
      },
      data: {
        ...result,
        guidedRemediation: Boolean(flags.guide),
      },
    };

    this.emit(output, Boolean(flags.json));
    return output;
  }
}
