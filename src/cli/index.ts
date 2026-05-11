import { execute } from "@oclif/core";

export async function main(args = process.argv.slice(2)): Promise<unknown> {
  return execute({
    args,
    dir: import.meta.url,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
