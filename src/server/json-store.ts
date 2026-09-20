import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

/**
 * Tiny JSON-file persistence.
 *
 * Two things here are worth more than they look:
 *
 *  - Writes go to a temporary file and are then renamed over the target.
 *    Rename is atomic, so a crash mid-write leaves the previous file intact
 *    rather than a half-written one. Writing in place risks losing the whole
 *    catalogue to a badly timed power cut.
 *
 *  - Writes are queued. Two admin requests saving at the same moment would
 *    otherwise read the same array, each add one product, and the second
 *    write would silently discard the first.
 */

export const DATA_DIR = path.join(process.cwd(), "data");

let writeQueue: Promise<unknown> = Promise.resolve();

export async function readJson<T>(fileName: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path.join(DATA_DIR, fileName), "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if (isMissingFile(error)) return fallback;
    throw error;
  }
}

/**
 * Read-modify-write under the queue, so concurrent updates compose instead of
 * overwriting each other. `update` receives the current value and returns the
 * next one.
 */
export async function mutateJson<T>(
  fileName: string,
  fallback: T,
  update: (current: T) => T | Promise<T>
): Promise<T> {
  const run = writeQueue.then(async () => {
    const current = await readJson<T>(fileName, fallback);
    const next = await update(current);
    await writeJsonUnqueued(fileName, next);
    return next;
  });

  // Keep the chain alive even if this caller's update throws, otherwise one
  // failed write would wedge every write that follows it.
  writeQueue = run.catch(() => undefined);
  return run;
}

async function writeJsonUnqueued(fileName: string, value: unknown) {
  await mkdir(DATA_DIR, { recursive: true });
  const target = path.join(DATA_DIR, fileName);
  const temp = `${target}.${randomUUID()}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temp, target);
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}
