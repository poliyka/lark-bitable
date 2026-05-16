import { execute } from "@oclif/core";

export function isSourceEntrypoint(entryUrl: string): boolean {
  try {
    return new URL(entryUrl).pathname.endsWith("/src/cli/index.ts");
  } catch {
    return entryUrl.endsWith("/src/cli/index.ts");
  }
}

export async function main(args = process.argv.slice(2)): Promise<unknown> {
  return execute({
    args,
    development: isSourceEntrypoint(import.meta.url),
    dir: import.meta.url,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
