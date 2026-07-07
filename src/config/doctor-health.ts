import {
  defaultSkillTargetDirs,
  inspectBootstrapSkill,
  inspectBootstrapSkillTargets,
  installBootstrapSkill,
  installBootstrapSkillTargets,
  type BootstrapInstallGroupResult,
  type BootstrapInstallResult,
  type BootstrapSkillGroupState,
  type BootstrapSkillState,
  type BootstrapSkillTargetState,
} from "../bootstrap/installer.js";
import { resolveWorkflowMode } from "../mode/mode-config.js";
import type { CommandOutput } from "../cli/output.js";
import { AuthStore, defaultAuthPath } from "./auth-store.js";
import type { Issue } from "./schema.js";
import { ConfigStore } from "./store.js";

export interface DoctorHealthInput {
  authPath?: string;
  configCwd?: string;
  installSkill?: boolean;
  skillDir?: string;
  cli?: {
    bin: string;
    version: string;
  };
}

export interface DoctorHealthData {
  activeMode: ReturnType<typeof resolveWorkflowMode>["active"];
  authPath: string;
  bootstrapSkillInstalled: boolean;
  bootstrapSkillPath: string;
  bootstrapSkillPaths: string[];
  bootstrapSkillStale: boolean | undefined;
  bootstrapSkillTargets: Array<{
    installed: boolean;
    path: string;
    stale: boolean | undefined;
    targetDir: string;
  }>;
  cli?: {
    bin: string;
    version: string;
  };
  configPath: string;
  installSkillRequested: boolean;
  larkAppConfigured: boolean;
  modeSource: ReturnType<typeof resolveWorkflowMode>["source"];
  sourceConfigured: boolean;
}

export interface DoctorHealthResult {
  auth: NonNullable<CommandOutput["auth"]>;
  bootstrap:
    | BootstrapSkillTargetState
    | BootstrapSkillGroupState
    | BootstrapInstallResult
    | BootstrapInstallGroupResult;
  data: DoctorHealthData;
  issues: Issue[];
  mode: NonNullable<CommandOutput["mode"]>;
  status: CommandOutput["status"];
}

export async function inspectDoctorHealth(
  input: DoctorHealthInput = {},
): Promise<DoctorHealthResult> {
  const authStore = new AuthStore(input.authPath ?? defaultAuthPath());
  const auth = await authStore.read();
  const store = new ConfigStore({ cwd: input.configCwd });
  const source = store.getSource();
  const larkApp = store.getLarkApp();
  const mode = resolveWorkflowMode(store);
  const bootstrap = await inspectOrInstallBootstrap(input);
  const data: DoctorHealthData = {
    ...(input.cli ? { cli: input.cli } : {}),
    activeMode: mode.active,
    authPath: authStore.path,
    bootstrapSkillInstalled: bootstrap.installed,
    bootstrapSkillPath: bootstrap.skillPath,
    bootstrapSkillPaths:
      "targets" in bootstrap
        ? bootstrap.targets.map((target) => target.skillPath)
        : [bootstrap.skillPath],
    bootstrapSkillStale: bootstrap.stale,
    bootstrapSkillTargets:
      "targets" in bootstrap
        ? bootstrap.targets.map((target) => targetSnapshot(target))
        : [targetSnapshot(bootstrap)],
    configPath: store.path,
    installSkillRequested: Boolean(input.installSkill),
    larkAppConfigured: Boolean(larkApp),
    modeSource: mode.source,
    sourceConfigured: Boolean(source),
  };
  const issues = doctorHealthIssues({
    authReady: Boolean(auth),
    bootstrapInstalled: bootstrap.installed,
    larkAppConfigured: Boolean(larkApp),
    sourceConfigured: Boolean(source),
  });

  return {
    auth: {
      status: auth?.status ?? "missing",
      storagePath: authStore.path,
      domain: auth?.domain,
      accountLabel: auth?.accountLabel,
      expiresAt: auth?.expiresAt,
    },
    bootstrap,
    data,
    issues,
    mode: {
      active: mode.active,
      source: mode.source,
    },
    status: issues.length > 0 ? "partial" : "ok",
  };
}

async function inspectOrInstallBootstrap(input: DoctorHealthInput) {
  if (input.skillDir) {
    return input.installSkill
      ? installBootstrapSkill({
          targetDir: input.skillDir,
        })
      : inspectBootstrapSkill({
          targetDir: input.skillDir,
        });
  }
  return input.installSkill
    ? installBootstrapSkillTargets({
        targetDirs: defaultSkillTargetDirs(),
      })
    : inspectBootstrapSkillTargets({
        targetDirs: defaultSkillTargetDirs(),
      });
}

function targetSnapshot(
  target: BootstrapSkillState | BootstrapSkillTargetState,
) {
  return {
    installed: target.installed,
    path: target.skillPath,
    stale: target.stale,
    targetDir: "targetDir" in target ? target.targetDir : "",
  };
}

function doctorHealthIssues(input: {
  authReady: boolean;
  bootstrapInstalled: boolean;
  larkAppConfigured: boolean;
  sourceConfigured: boolean;
}): Issue[] {
  const issues: Issue[] = [];
  if (!input.authReady) {
    issues.push({
      code: "missing-auth",
      message: "Lark auth is missing.",
      remediation: "Run lark-bitable lark --login",
    });
  }
  if (!input.sourceConfigured) {
    issues.push({
      code: "missing-source",
      message: "No active Lark Bitable source is configured.",
      remediation: "Run lark-bitable configure <url>",
    });
  }
  if (!input.larkAppConfigured) {
    issues.push({
      code: "missing-lark-app-config",
      message:
        "Lark app settings are not stored, so login and token refresh may fail.",
      remediation:
        "Run lark-bitable configure and provide Lark app id, app secret, and redirect URI.",
    });
  }
  if (!input.bootstrapInstalled) {
    issues.push({
      code: "missing-bootstrap",
      message: "Bootstrap skill guidance is not installed.",
      remediation: "Run lark-bitable doctor --install-skill",
    });
  }
  return issues;
}
