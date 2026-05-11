import { Command } from "@oclif/core";

export interface RunCommandResult {
  stderr: string;
  stdout: string;
  value: unknown;
}

export async function runCommand(
  command: typeof Command,
  argv: string[] = [],
): Promise<RunCommandResult> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args: unknown[]) => stdout.push(args.join(" "));
  console.error = (...args: unknown[]) => stderr.push(args.join(" "));

  try {
    const value = await command.run(argv, {
      root: process.cwd(),
    });
    return {
      stderr: stderr.join("\n"),
      stdout: stdout.join("\n"),
      value,
    };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}
