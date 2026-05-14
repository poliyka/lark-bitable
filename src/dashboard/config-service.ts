import { AuthStore } from "../config/auth-store.js";
import { checkReadiness } from "../config/readiness.js";
import {
  bitableSourceSchema,
  larkAppConfigSchema,
  type ValidationResult,
} from "../config/schema.js";
import type { ConfigStore } from "../config/store.js";
import { parseBitableUrl } from "../lark/url-parser.js";
import { normalizeWorkflowMode } from "../mode/mode-config.js";
import {
  configDraftInputSchema,
  type ConfigDraftInput,
  type ConfigDraftView,
} from "./schemas.js";
import { redactDashboardPayload } from "./api.js";

export async function loadConfigDraft(input: {
  authStore?: AuthStore;
  configStore: ConfigStore;
}): Promise<{ draft: ConfigDraftView; readiness: ValidationResult }> {
  const source = input.configStore.getSource();
  const larkApp = input.configStore.getLarkApp();
  const workflow = input.configStore.getWorkflowConfig();
  const mode = workflow?.activeMode ?? "Developer";
  const defaultOwner = workflow?.modeConfigs?.[mode]?.defaultOwner;
  const readiness = await checkReadiness("dashboard", {
    authStore: input.authStore,
    bootstrapInstalled: true,
    configStore: input.configStore,
  });

  return redactDashboardPayload({
    draft: {
      sourceUrl: source?.sourceUrl ?? "",
      sourceName: source?.name,
      mode,
      larkAppId: larkApp?.appId,
      larkAppSecretState: larkApp?.appSecret ? "stored-redacted" : "missing",
      larkDomain: larkApp?.domain ?? "larksuite.com",
      redirectUri: larkApp?.redirectUri,
      callbackPort: larkApp?.callbackPort ?? 14543,
      scopes: larkApp?.scopes ?? ["bitable:app:readonly"],
      statusField: source?.statusField,
      priorityField: source?.priorityField,
      titleField: source?.fieldAliases.title,
      ownerField: source?.fieldAliases.owner,
      actionableStatus: source?.actionableStatus ?? "待處理",
      defaultOwner,
      validation: readiness,
    },
    readiness,
  });
}

export async function saveConfigDraft(input: {
  authStore?: AuthStore;
  configStore: ConfigStore;
  draft: ConfigDraftInput;
}): Promise<{ draft: ConfigDraftView; readiness: ValidationResult }> {
  const draft = configDraftInputSchema.parse(input.draft);
  let parsedUrl: ReturnType<typeof parseBitableUrl>;
  try {
    parsedUrl = parseBitableUrl(draft.sourceUrl);
  } catch (error) {
    throw new Error(
      `Invalid Lark Bitable URL: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const previousSource = input.configStore.getSource();
  input.configStore.setSource(
    bitableSourceSchema.parse({
      sourceUrl: parsedUrl.sourceUrl,
      appToken: parsedUrl.appToken,
      tableId: parsedUrl.tableId,
      viewId: parsedUrl.viewId,
      name: draft.sourceName ?? previousSource?.name,
      statusField: draft.statusField ?? previousSource?.statusField,
      actionableStatus:
        draft.actionableStatus ?? previousSource?.actionableStatus,
      priorityField: draft.priorityField ?? previousSource?.priorityField,
      priorityOrder: previousSource?.priorityOrder,
      fieldAliases: {
        ...previousSource?.fieldAliases,
        title: draft.titleField ?? previousSource?.fieldAliases.title,
        owner: draft.ownerField ?? previousSource?.fieldAliases.owner,
      },
      updatedAt: new Date().toISOString(),
    }),
  );

  const mode = normalizeWorkflowMode(draft.mode);
  input.configStore.setActiveMode({ configuredBy: "dashboard", mode });
  if (draft.defaultOwner !== undefined) {
    input.configStore.setModeDefaultOwner({ mode, owner: draft.defaultOwner });
  }

  const previousLarkApp = input.configStore.getLarkApp();
  const appSecret = draft.larkAppSecret ?? previousLarkApp?.appSecret;
  if (draft.larkAppId && appSecret) {
    input.configStore.setLarkApp(
      larkAppConfigSchema.parse({
        appId: draft.larkAppId,
        appSecret,
        callbackPort: draft.callbackPort,
        domain: draft.larkDomain,
        redirectUri: draft.redirectUri,
        scopes: draft.scopes,
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  return loadConfigDraft({
    authStore: input.authStore,
    configStore: input.configStore,
  });
}
