import { Flags } from "@oclif/core";

import type { BitableSource } from "../config/schema.js";
import type { ConfigStore } from "../config/store.js";
import { parseBitableUrl } from "../lark/url-parser.js";
import { CliError } from "./errors.js";

export interface CommandSourceSelection {
  table?: string;
  tableProfile?: string;
}

export const tableSelectionFlags = {
  table: Flags.string({
    description:
      'Select a table token (e.g. --table tblXXX, using the active Base) or a full Lark Base URL (e.g. --table "https://example.larksuite.com/base/appXXX?table=tblXXX"). View IDs are recorded only; reads use the whole table.',
  }),
  "table-profile": Flags.string({
    description:
      "Select a saved table profile (e.g. --table-profile req). Create one with configure <url> --table-profile req.",
  }),
};

export function resolveCommandSource(
  configStore: ConfigStore,
  selection: CommandSourceSelection,
): BitableSource {
  if (selection.table !== undefined && selection.tableProfile !== undefined) {
    throw new CliError({
      code: "conflicting-table-flags",
      message: "--table and --table-profile cannot be used together.",
      remediation:
        "Use either --table <token-or-url> or --table-profile <name>.",
    });
  }

  if (selection.tableProfile !== undefined) {
    const source = configStore.getTableProfile(selection.tableProfile);
    if (!source) {
      const names = Object.keys(configStore.listTableProfiles());
      throw new CliError({
        code: "unknown-table-profile",
        message: `Unknown table profile: ${selection.tableProfile}`,
        remediation: `Available table profiles: ${names.length ? names.join(", ") : "(none)"}. Run lark-bitable configure <url> --table-profile <name> to save one.`,
      });
    }
    return source;
  }

  if (
    selection.table !== undefined &&
    !/^tbl[a-zA-Z0-9]+$/.test(selection.table)
  ) {
    const parsed = parseBitableUrl(selection.table);
    return {
      sourceUrl: parsed.sourceUrl,
      appToken: parsed.appToken,
      tableId: parsed.tableId,
      viewId: parsed.viewId,
      updatedAt: new Date().toISOString(),
    };
  }

  const source = configStore.getSource();
  if (!source) {
    throw new CliError({
      code: "missing-source",
      message: "No active Lark Bitable source is configured.",
      remediation: "Run lark-bitable configure <url>",
    });
  }

  if (selection.table !== undefined) {
    const url = new URL(source.sourceUrl);
    url.searchParams.set("table", selection.table);
    url.searchParams.delete("view");
    return {
      ...source,
      sourceUrl: url.toString(),
      tableId: selection.table,
      viewId: undefined,
    };
  }

  return source;
}
