import { Command, Flags, type Interfaces } from "@oclif/core";
import { randomUUID } from "node:crypto";

import {
  appendAuditEntry,
  buildAuditEntry,
  resolveAuditPath,
} from "../audit/log.js";
import {
  defaultChangedSurfacesForCommand,
  type DashboardLivePhase,
  type DashboardLiveTrigger,
} from "../dashboard/live-events.js";
import { deliverCommandLiveEvent } from "../dashboard/live-client.js";
import { runtimePathFromAuditPath } from "../dashboard/live-runtime.js";
import { isCliError } from "./errors.js";
import { writeOutput, type CommandOutput } from "./output.js";

export abstract class BaseCommand extends Command {
  private readonly commandStartedAt = new Date();
  private readonly commandRunId = `run_${randomUUID()}`;
  private liveOutcomeSent = false;

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

  protected override async init(): Promise<void> {
    await super.init();
    this.reportLiveLifecycle({
      phase: "started",
      status: "running",
    });
  }

  protected emit(output: CommandOutput, json = false): CommandOutput {
    writeOutput(output, json);
    this.writeAudit(output);
    this.reportLiveLifecycle({
      durationMs: new Date().getTime() - this.commandStartedAt.getTime(),
      finishedAt: new Date().toISOString(),
      issues: output.issues ?? [],
      phase: output.status === "ok" ? "completed" : output.status,
      status: output.status,
      evidenceCount: output.evidence?.length ?? 0,
    });
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
      this.reportLiveLifecycle({
        durationMs: new Date().getTime() - this.commandStartedAt.getTime(),
        finishedAt: new Date().toISOString(),
        issues: output.issues ?? [],
        phase: output.status === "partial" ? "partial" : "failed",
        status: output.status,
        evidenceCount: output.evidence?.length ?? 0,
      });
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
    this.reportLiveLifecycle({
      durationMs: new Date().getTime() - this.commandStartedAt.getTime(),
      finishedAt: new Date().toISOString(),
      issues: output.issues ?? [],
      phase: "failed",
      status: output.status,
      evidenceCount: output.evidence?.length ?? 0,
    });
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

  private reportLiveLifecycle(input: {
    durationMs?: number;
    evidenceCount?: number;
    finishedAt?: string;
    issues?: NonNullable<CommandOutput["issues"]>;
    phase: DashboardLivePhase | CommandOutput["status"];
    status: "running" | CommandOutput["status"];
  }): void {
    if (input.phase !== "started") {
      if (this.liveOutcomeSent) return;
      this.liveOutcomeSent = true;
    }

    const phase =
      input.phase === "ok"
        ? "completed"
        : input.phase === "error"
          ? "failed"
          : input.phase;
    const trigger = this.liveTrigger();
    void deliverCommandLiveEvent({
      event: {
        changedSurfaces: defaultChangedSurfacesForCommand(
          this.liveCommandName(),
        ),
        command: this.liveCommandName(),
        commandRunId: this.commandRunId,
        dataSource: "live",
        durationMs: input.durationMs ?? null,
        evidenceCount: input.evidenceCount ?? 0,
        finishedAt: input.finishedAt ?? null,
        issues: input.issues ?? [],
        phase,
        startedAt: this.commandStartedAt.toISOString(),
        status: input.status,
        trigger,
      },
      runtimePath: runtimePathFromAuditPath(this.auditPath()),
    });
  }

  private liveCommandName(): string {
    const ctorName = this.constructor.name || "unknown";
    const derived = ctorName
      .replace(/Command$/, "")
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .toLowerCase();
    const explicit = this.id?.trim().toLowerCase();
    if (explicit && !explicit.endsWith("command")) return explicit;
    return derived;
  }

  private liveTrigger(): DashboardLiveTrigger {
    return process.env.LARK_BITABLE_LIVE_TRIGGER === "dashboard"
      ? "dashboard"
      : "terminal";
  }
}
