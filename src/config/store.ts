import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import Conf from "conf";

import {
  bitableSourceSchema,
  larkAppConfigSchema,
  triageSelectionSchema,
  workflowConfigSchema,
  type BitableSource,
  type LarkAppConfig,
  type TriageSelection,
  type WorkflowConfig,
  type WorkflowMode,
} from "./schema.js";

interface StoreShape {
  activeSource?: BitableSource;
  larkApp?: LarkAppConfig;
  lastSelection?: TriageSelection;
  workflow?: WorkflowConfig;
}

export interface StoreOptions {
  cwd?: string;
  home?: string;
  legacyPath?: string;
  projectName?: string;
}

export function defaultConfigDir(home = homedir()): string {
  return join(home, ".lark-bitable");
}

export function defaultConfigPath(home = homedir()): string {
  return join(defaultConfigDir(home), "config.json");
}

function legacyUnifiedConfigPath(home = homedir()): string {
  return join(home, ".lark-bitable-cli", "config.json");
}

function legacyConfigPath(projectName: string): string {
  return new Conf<StoreShape>({
    projectName,
    schema: {},
  }).path;
}

function ensurePrivateDir(path: string): void {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  chmodSync(path, 0o700);
}

function ensurePrivateFile(path: string): void {
  if (existsSync(path) && statSync(path).isFile()) {
    chmodSync(path, 0o600);
  }
}

function migrateLegacyConfig(targetPath: string, legacyPath: string): void {
  if (
    targetPath === legacyPath ||
    existsSync(targetPath) ||
    !existsSync(legacyPath)
  ) {
    return;
  }

  try {
    renameSync(legacyPath, targetPath);
  } catch (error) {
    if (!isCrossDeviceRenameError(error)) throw error;
    copyFileSync(legacyPath, targetPath);
    rmSync(legacyPath, { force: true });
  }

  ensurePrivateFile(targetPath);
}

function isCrossDeviceRenameError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "EXDEV"
  );
}

export class ConfigStore {
  private readonly conf: Conf<StoreShape>;
  readonly path: string;

  constructor(options: StoreOptions = {}) {
    const projectName = options.projectName ?? "lark-bitable-cli";
    const cwd = options.cwd ?? defaultConfigDir(options.home);

    ensurePrivateDir(cwd);
    if (!options.cwd) {
      migrateLegacyConfig(
        defaultConfigPath(options.home),
        legacyUnifiedConfigPath(options.home),
      );
      migrateLegacyConfig(
        defaultConfigPath(options.home),
        options.legacyPath ?? legacyConfigPath(projectName),
      );
    }

    this.conf = new Conf<StoreShape>({
      cwd,
      projectName,
      schema: {},
    });
    this.path = this.conf.path;
    ensurePrivateFile(this.path);
  }

  getSource(): BitableSource | undefined {
    const source = this.conf.get("activeSource");
    return source ? bitableSourceSchema.parse(source) : undefined;
  }

  setSource(source: BitableSource): BitableSource {
    const parsed = bitableSourceSchema.parse(source);
    this.conf.set("activeSource", parsed);
    ensurePrivateFile(this.path);
    return parsed;
  }

  clearSource(): void {
    this.conf.delete("activeSource");
    ensurePrivateFile(this.path);
  }

  getLarkApp(): LarkAppConfig | undefined {
    const app = this.conf.get("larkApp");
    return app ? larkAppConfigSchema.parse(app) : undefined;
  }

  setLarkApp(app: LarkAppConfig): LarkAppConfig {
    const parsed = larkAppConfigSchema.parse(app);
    this.conf.set("larkApp", parsed);
    ensurePrivateFile(this.path);
    return parsed;
  }

  clearLarkApp(): void {
    this.conf.delete("larkApp");
    ensurePrivateFile(this.path);
  }

  getWorkflowConfig(): WorkflowConfig | undefined {
    const workflow = this.conf.get("workflow");
    return workflow ? workflowConfigSchema.parse(workflow) : undefined;
  }

  setWorkflowConfig(workflow: WorkflowConfig): WorkflowConfig {
    const parsed = workflowConfigSchema.parse(workflow);
    this.conf.set("workflow", parsed);
    ensurePrivateFile(this.path);
    return parsed;
  }

  setActiveMode(input: {
    configuredBy?: string;
    mode: WorkflowMode;
  }): WorkflowConfig {
    const previous = this.getWorkflowConfig();
    return this.setWorkflowConfig({
      activeMode: input.mode,
      configuredAt: new Date().toISOString(),
      configuredBy: input.configuredBy,
      modeConfigs: previous?.modeConfigs ?? {},
    });
  }

  setModeDefaultOwner(input: {
    mode: WorkflowMode;
    owner?: string;
  }): WorkflowConfig {
    const previous = this.getWorkflowConfig() ?? {
      activeMode: input.mode,
      configuredAt: new Date().toISOString(),
      modeConfigs: {},
    };
    const trimmedOwner = input.owner?.trim();
    return this.setWorkflowConfig({
      ...previous,
      modeConfigs: {
        ...previous.modeConfigs,
        [input.mode]: {
          ...previous.modeConfigs[input.mode],
          ...(trimmedOwner ? { defaultOwner: trimmedOwner } : {}),
          updatedAt: new Date().toISOString(),
        },
      },
    });
  }

  getSelection(): TriageSelection | undefined {
    const selection = this.conf.get("lastSelection");
    return selection ? triageSelectionSchema.parse(selection) : undefined;
  }

  setSelection(selection: TriageSelection): TriageSelection {
    const parsed = triageSelectionSchema.parse(selection);
    this.conf.set("lastSelection", parsed);
    ensurePrivateFile(this.path);
    return parsed;
  }

  clearSelection(): void {
    this.conf.delete("lastSelection");
    ensurePrivateFile(this.path);
  }
}
