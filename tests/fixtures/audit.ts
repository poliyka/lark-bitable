import { readFile } from "node:fs/promises";

export async function readAuditEntries(path: string): Promise<unknown[]> {
  const raw = await readFile(path, "utf8");
  return raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}
