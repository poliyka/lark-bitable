import { Flags } from "@oclif/core";
import open from "open";

import { defaultAuthPath } from "../../config/auth-store.js";
import { DEFAULT_DASHBOARD_PORT } from "../../dashboard/port.js";
import { startDashboardServer } from "../../dashboard/server.js";
import { defaultResearchDir } from "../../reporting/research-store.js";
import { toEvidence } from "../../reporting/evidence.js";
import { BaseCommand } from "../base-command.js";
import type { CommandOutput } from "../output.js";

export default class DashboardCommand extends BaseCommand {
  static description = "Start the local no-login dashboard UI.";
  static examples = [
    {
      command: "lark-bitable dashboard",
      description: "Start on port 48731 or the next available port.",
    },
    {
      command: "lark-bitable dashboard --no-open --json",
      description: "Print the dashboard URL without opening a browser.",
    },
  ];
  static flags = {
    ...BaseCommand.baseFlags,
    "auth-path": Flags.string({
      default: defaultAuthPath(),
      hidden: true,
    }),
    "config-cwd": Flags.string({
      hidden: true,
    }),
    host: Flags.string({
      default: "127.0.0.1",
      description: "Local host to bind.",
      hidden: true,
    }),
    "no-open": Flags.boolean({
      description: "Start without opening the browser.",
    }),
    port: Flags.integer({
      default: DEFAULT_DASHBOARD_PORT,
      description: "Requested starting port.",
    }),
    "research-dir": Flags.string({
      default: defaultResearchDir(),
      hidden: true,
    }),
    "shutdown-after-ms": Flags.integer({
      hidden: true,
    }),
  };

  async run(): Promise<CommandOutput> {
    const { flags } = await this.parse(DashboardCommand);
    const handle = await startDashboardServer({
      auditPath: flags["audit-path"],
      authPath: flags["auth-path"],
      configCwd: flags["config-cwd"],
      host: flags.host,
      port: flags.port,
      researchDir: flags["research-dir"],
    });
    let opened = false;
    const issues: CommandOutput["issues"] = [];
    if (!flags["no-open"]) {
      try {
        await open(handle.binding.origin, { wait: false });
        opened = true;
      } catch (error) {
        issues.push({
          code: "dashboard-open-failed",
          message: error instanceof Error ? error.message : String(error),
          remediation: `Open ${handle.binding.origin} manually.`,
        });
      }
    }

    const output: CommandOutput<{
      binding: typeof handle.binding;
      dashboardLoginRequired: false;
      localOnly: boolean;
      nextSafeActions: string[];
      opened: boolean;
    }> = {
      command: "dashboard",
      evidence: [
        toEvidence({
          excerpt: `Dashboard bound to ${handle.binding.origin}`,
          reference: "dashboard",
          status: "verified",
          type: "runtime-observation",
        }),
      ],
      issues,
      status: issues.length > 0 ? "partial" : "ok",
      data: {
        binding: handle.binding,
        dashboardLoginRequired: false,
        localOnly:
          handle.binding.host === "127.0.0.1" ||
          handle.binding.host === "localhost",
        nextSafeActions: [`Open ${handle.binding.origin}`],
        opened,
      },
    };

    this.emit(output, Boolean(flags.json));

    if (flags["shutdown-after-ms"] !== undefined) {
      await new Promise((resolve) =>
        setTimeout(resolve, flags["shutdown-after-ms"]),
      );
      await handle.stop();
      return output;
    }

    await waitForShutdown(handle.stop);
    return output;
  }
}

async function waitForShutdown(stop: () => Promise<void>): Promise<void> {
  await new Promise<void>((resolve) => {
    const onSignal = () => {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
      resolve();
    };
    process.once("SIGINT", onSignal);
    process.once("SIGTERM", onSignal);
  });
  await stop();
}
