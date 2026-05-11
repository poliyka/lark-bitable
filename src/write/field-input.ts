import { CliError } from "../cli/errors.js";

export interface ParseFieldInputOptions {
  fieldAssignments?: string[];
  fieldsJson?: string;
}

export function parseFieldInput(
  input: ParseFieldInputOptions,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  for (const assignment of input.fieldAssignments ?? []) {
    const separator = assignment.indexOf("=");
    if (separator < 0) {
      throw new CliError({
        code: "invalid-field-assignment",
        message: "Field assignment must use name=value.",
        remediation:
          'Pass field values as --field "欄位=值" or --fields-json \'{"欄位":"值"}\'.',
      });
    }

    const fieldName = assignment.slice(0, separator).trim();
    if (!fieldName) {
      throw new CliError({
        code: "empty-field-name",
        message: "Field name cannot be empty.",
        remediation: 'Use --field "欄位名稱=值" with a non-empty field name.',
      });
    }
    addField(
      fields,
      fieldName,
      parseFieldValue(assignment.slice(separator + 1)),
    );
  }

  if (input.fieldsJson?.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input.fieldsJson);
    } catch {
      throw invalidFieldsJsonError();
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw invalidFieldsJsonError();
    }

    for (const [rawName, value] of Object.entries(parsed)) {
      const fieldName = rawName.trim();
      if (!fieldName) {
        throw new CliError({
          code: "empty-field-name",
          message: "Field name cannot be empty.",
          remediation:
            "--fields-json must use non-empty object keys for field names.",
        });
      }
      addField(fields, fieldName, value);
    }
  }

  return fields;
}

function parseFieldValue(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function addField(
  fields: Record<string, unknown>,
  fieldName: string,
  value: unknown,
): void {
  if (Object.hasOwn(fields, fieldName)) {
    throw new CliError({
      code: "duplicate-field-name",
      message: `Duplicate field name: ${fieldName}`,
      remediation:
        "Pass each field once. Remove duplicates across --field and --fields-json.",
    });
  }
  fields[fieldName] = value;
}

function invalidFieldsJsonError(): CliError {
  return new CliError({
    code: "invalid-fields-json",
    message: "fields-json must be a valid JSON object.",
    remediation:
      'Pass structured fields as --fields-json \'{"欄位":"值"}\'. Arrays and scalars are not supported.',
  });
}
