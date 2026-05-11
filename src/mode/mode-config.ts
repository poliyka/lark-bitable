import type { ConfigStore } from "../config/store.js";
import type { WorkflowConfig, WorkflowMode } from "../config/schema.js";

export interface ResolvedMode {
  active: WorkflowMode;
  config?: WorkflowConfig;
  source: "explicit" | "defaulted" | "invalid";
}

export function normalizeWorkflowMode(value: string): WorkflowMode {
  if (value === "QA" || value.toLowerCase() === "qa") return "QA";
  if (value === "Developer" || value.toLowerCase() === "developer") {
    return "Developer";
  }
  throw new Error("Workflow mode must be QA or Developer.");
}

export function resolveWorkflowMode(store: ConfigStore): ResolvedMode {
  const config = store.getWorkflowConfig();
  if (!config) {
    return {
      active: "Developer",
      source: "defaulted",
    };
  }

  return {
    active: config.activeMode,
    config,
    source: "explicit",
  };
}

export function defaultOwnerForMode(
  config: WorkflowConfig | undefined,
  mode: WorkflowMode,
): string | undefined {
  return config?.modeConfigs?.[mode]?.defaultOwner;
}
