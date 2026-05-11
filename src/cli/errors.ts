export class CliError extends Error {
  readonly code: string;
  readonly remediation?: string;
  readonly status: "error" | "partial";

  constructor(input: {
    code: string;
    message: string;
    remediation?: string;
    status?: "error" | "partial";
  }) {
    super(input.message);
    this.name = "CliError";
    this.code = input.code;
    this.remediation = input.remediation;
    this.status = input.status ?? "error";
  }
}

export function missingPrerequisite(
  prerequisite: string,
  remediation: string,
): CliError {
  return new CliError({
    code: `missing-${prerequisite}`,
    message: `Missing prerequisite: ${prerequisite}`,
    remediation,
  });
}

export function isCliError(error: unknown): error is CliError {
  return error instanceof CliError;
}
