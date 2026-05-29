import { stat } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";

import { CliError } from "../cli/errors.js";
import type {
  BitableRecord,
  BitableSource,
  ResearchEvidence,
} from "../config/schema.js";
import type { UploadMediaInput, UploadMediaResult } from "../lark/client.js";
import type { BitableFieldInfo } from "../lark/field-discovery.js";
import { writeEvidence } from "./result.js";

const MAX_DIRECT_UPLOAD_BYTES = 20 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set([
  ".apng",
  ".avif",
  ".bmp",
  ".gif",
  ".heic",
  ".heif",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
]);

export interface PrepareAttachmentFieldUploadsInput {
  attachmentMode: AttachmentWriteMode;
  confirm: boolean;
  currentRecord?: BitableRecord;
  fields: Record<string, unknown>;
  source: BitableSource;
  tableFields: BitableFieldInfo[];
  uploadMedia: (input: UploadMediaInput) => Promise<UploadMediaResult>;
}

export interface PreparedAttachmentFieldUploads {
  attachmentPlan: AttachmentPlan[];
  evidence: ResearchEvidence[];
  fields: Record<string, unknown>;
  warnings: string[];
}

export type AttachmentWriteMode = "preserve" | "replace";

export interface AttachmentLocalFilePlan {
  name: string;
  parentType: UploadMediaInput["parentType"];
  path: string;
  size: number;
}

export interface AttachmentPlan {
  existingAttachmentCount: number;
  existingFileTokens: string[];
  fieldName: string;
  localFileCount: number;
  localFiles: AttachmentLocalFilePlan[];
  /**
   * Backward-compatible alias for requestedEffect. Prefer requestedEffect in
   * new automation so it is not confused with replacementPolicy.
   */
  mode: "append" | "replace";
  requestedAttachmentCount: number;
  requestedEffect: "append" | "replace";
  preservedExistingAttachmentCount: number;
  replacementPolicy: AttachmentWriteMode;
  willReplaceExisting: boolean;
}

export async function prepareAttachmentFieldUploads(
  input: PrepareAttachmentFieldUploadsInput,
): Promise<PreparedAttachmentFieldUploads> {
  const attachmentFields = new Set(
    input.tableFields
      .filter((field) => isAttachmentField(field))
      .map((field) => field.fieldName),
  );
  const attachmentPlan: AttachmentPlan[] = [];
  const fields: Record<string, unknown> = {};
  const evidence: ResearchEvidence[] = [];
  const warnings: string[] = [];

  for (const [fieldName, value] of Object.entries(input.fields)) {
    if (!attachmentFields.has(fieldName)) {
      fields[fieldName] = value;
      continue;
    }

    const prepared = await prepareAttachmentFieldValue({
      attachmentMode: input.attachmentMode,
      confirm: input.confirm,
      currentRecord: input.currentRecord,
      fieldName,
      source: input.source,
      uploadMedia: input.uploadMedia,
      value,
    });
    attachmentPlan.push(prepared.plan);
    fields[fieldName] = prepared.value;
    evidence.push(...prepared.evidence);
    warnings.push(...prepared.warnings);
  }

  return { attachmentPlan, evidence, fields, warnings };
}

function isAttachmentField(field: BitableFieldInfo): boolean {
  const uiType = field.uiType?.toLowerCase();
  return uiType === "attachment" || uiType === "image" || uiType === "photo";
}

async function prepareAttachmentFieldValue(input: {
  attachmentMode: AttachmentWriteMode;
  confirm: boolean;
  currentRecord?: BitableRecord;
  fieldName: string;
  source: BitableSource;
  uploadMedia: (input: UploadMediaInput) => Promise<UploadMediaResult>;
  value: unknown;
}): Promise<{
  evidence: ResearchEvidence[];
  plan: AttachmentPlan;
  value: unknown;
  warnings: string[];
}> {
  const rawItems = Array.isArray(input.value) ? input.value : [input.value];
  const existingFileTokens = fileTokensFrom(
    input.currentRecord?.fields[input.fieldName],
  );
  const existingTokenSet = new Set(existingFileTokens);
  const evidence: ResearchEvidence[] = [];
  const warnings: string[] = [];
  const requestedFileTokens: string[] = [];
  const localFilesByItem = new Map<unknown, AttachmentLocalFilePlan>();
  let changed = false;

  for (const item of rawItems) {
    const existingToken = fileTokenFrom(item);
    if (existingToken) {
      requestedFileTokens.push(existingToken);
      changed = true;
      continue;
    }

    const localPath = localPathFrom(item);
    if (!localPath) {
      continue;
    }

    const file = await localAttachmentFile(localPath, input.fieldName);
    localFilesByItem.set(item, file);
    changed = true;

    if (!input.confirm) {
      evidence.push(
        writeEvidence({
          type: "lark-media",
          reference: file.path,
          excerpt: `Local attachment file ${file.name} (${file.size} bytes) will be uploaded only when --confirm is provided.`,
          status: "not-run",
        }),
      );
      continue;
    }
  }

  const preservedExistingAttachmentCount = requestedFileTokens.filter((token) =>
    existingTokenSet.has(token),
  ).length;
  const willReplaceExisting =
    existingFileTokens.length > preservedExistingAttachmentCount;
  const plan: AttachmentPlan = {
    existingAttachmentCount: existingFileTokens.length,
    existingFileTokens,
    fieldName: input.fieldName,
    localFileCount: localFilesByItem.size,
    localFiles: [...localFilesByItem.values()],
    mode: willReplaceExisting ? "replace" : "append",
    requestedAttachmentCount: rawItems.length,
    requestedEffect: willReplaceExisting ? "replace" : "append",
    preservedExistingAttachmentCount,
    replacementPolicy: input.attachmentMode,
    willReplaceExisting,
  };

  warnings.push(...warningsForPlan(plan, input.attachmentMode));

  if (
    input.confirm &&
    plan.willReplaceExisting &&
    input.attachmentMode !== "replace"
  ) {
    throw new CliError({
      code: "attachment-replacement-not-explicit",
      message: `Confirmed write would replace existing attachments in field ${input.fieldName}; pass --attachment-mode replace only when replacement is intentional.`,
      remediation:
        'Run get <record-id> first and include existing {"file_token":"..."} objects with the new local paths, or pass --attachment-mode replace only when replacement is intentional.',
    });
  }

  if (!input.confirm) {
    return {
      evidence,
      plan,
      value: input.value,
      warnings,
    };
  }

  const confirmedItems: unknown[] = [];
  for (const item of rawItems) {
    const existingToken = fileTokenFrom(item);
    if (existingToken) {
      confirmedItems.push({ file_token: existingToken });
      continue;
    }

    const file = localFilesByItem.get(item);
    if (!file) {
      confirmedItems.push(item);
      continue;
    }

    let upload: UploadMediaResult;
    try {
      upload = await input.uploadMedia({
        fileName: file.name,
        filePath: file.path,
        parentNode: input.source.appToken,
        parentType: file.parentType,
        size: file.size,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Lark media upload failed.";
      throw new CliError({
        code: "attachment-upload-failed",
        message: `Attachment upload failed for field ${input.fieldName}: ${message}`,
        remediation:
          "Confirm the Lark app/user has write-capable Bitable media permission, the Base app_token is correct, and the file is no larger than 20MB.",
      });
    }
    evidence.push(
      writeEvidence({
        type: "lark-media",
        reference: upload.fileToken,
        excerpt: `Uploaded ${upload.fileName} (${upload.size} bytes) to Bitable media with parent_type=${upload.parentType}.`,
        status: "verified",
      }),
    );
    confirmedItems.push({ file_token: upload.fileToken });
  }

  if (!changed) return { evidence, plan, value: input.value, warnings };
  return {
    evidence,
    plan,
    value: confirmedItems,
    warnings,
  };
}

function warningsForPlan(
  plan: AttachmentPlan,
  attachmentMode: AttachmentWriteMode,
): string[] {
  if (plan.localFileCount === 0 && !plan.willReplaceExisting) return [];
  if (plan.willReplaceExisting) {
    return [
      `High risk: confirmed write will replace attachment/photo field ${plan.fieldName}. Existing attachments: ${plan.existingAttachmentCount}. Requested attachments after confirm: ${plan.requestedAttachmentCount}. Include existing file_token objects to preserve them, or pass --attachment-mode replace only when replacement is intentional.`,
    ];
  }
  if (plan.existingAttachmentCount > 0 && plan.localFileCount > 0) {
    return [
      `Confirmed write will preserve ${plan.preservedExistingAttachmentCount} existing attachment(s) and add ${plan.localFileCount} local file(s) to attachment/photo field ${plan.fieldName}. Preview did not upload media.`,
    ];
  }
  if (plan.localFileCount > 0) {
    return [
      `Local attachment file(s) for field ${plan.fieldName} will be uploaded during confirmed write; preview did not upload media.`,
    ];
  }
  if (attachmentMode === "replace") {
    return [
      `Explicit attachment replacement mode is active for field ${plan.fieldName}.`,
    ];
  }
  return [];
}

function fileTokensFrom(value: unknown): string[] {
  const items = Array.isArray(value)
    ? value
    : value === undefined
      ? []
      : [value];
  return items.flatMap((item) => {
    const token = fileTokenFrom(item);
    return token ? [token] : [];
  });
}

function fileTokenFrom(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  return stringValue(value.file_token) ?? stringValue(value.fileToken);
}

function localPathFrom(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (!isRecord(value)) return undefined;
  return (
    stringValue(value.path) ??
    stringValue(value.localPath) ??
    stringValue(value.local_path) ??
    stringValue(value.filePath) ??
    stringValue(value.file_path)
  );
}

async function localAttachmentFile(
  path: string,
  fieldName: string,
): Promise<AttachmentLocalFilePlan> {
  const filePath = resolve(path);
  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    throw new CliError({
      code: "attachment-file-not-found",
      message: `Attachment file does not exist for field ${fieldName}: ${filePath}`,
      remediation:
        'Pass an existing local file path, or pass an existing Drive file token as {"file_token":"..."}.',
    });
  }

  if (!fileStat.isFile()) {
    throw new CliError({
      code: "attachment-path-not-file",
      message: `Attachment path is not a file for field ${fieldName}: ${filePath}`,
      remediation: "Pass a regular local file path for attachment upload.",
    });
  }

  if (fileStat.size > MAX_DIRECT_UPLOAD_BYTES) {
    throw new CliError({
      code: "attachment-file-too-large",
      message: `Attachment file exceeds the direct upload limit for field ${fieldName}: ${filePath}`,
      remediation:
        "Use a file no larger than 20MB, or upload it separately with a chunked media flow and write the returned file_token.",
    });
  }

  const fileName = basename(filePath);
  return {
    name: fileName,
    path: filePath,
    parentType: parentTypeFor(fileName),
    size: fileStat.size,
  };
}

function parentTypeFor(fileName: string): UploadMediaInput["parentType"] {
  return IMAGE_EXTENSIONS.has(extname(fileName).toLowerCase())
    ? "bitable_image"
    : "bitable_file";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
