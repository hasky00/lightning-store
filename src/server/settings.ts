import "server-only";

import type { StoreSettings } from "@/lib/types";
import { DEFAULT_STORE_NAME } from "@/lib/constants";
import { mutateJson, readJson } from "./json-store";

/**
 * Store-wide settings. These belong on the server rather than in one
 * shopkeeper's browser: every visitor should see the same shop name.
 *
 * Note what is *not* here any more — the merchant wallet connection. That is
 * a secret and lives in the environment, never in a file the app serves.
 */

const FILE = "settings.json";
const MAX_STORE_NAME_LENGTH = 60;

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: DEFAULT_STORE_NAME,
};

export async function getSettings(): Promise<StoreSettings> {
  const stored = await readJson<Partial<StoreSettings>>(FILE, {});
  return {
    storeName:
      typeof stored.storeName === "string" && stored.storeName.trim()
        ? stored.storeName.trim()
        : DEFAULT_SETTINGS.storeName,
  };
}

export class SettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsValidationError";
  }
}

export async function updateSettings(input: unknown): Promise<StoreSettings> {
  if (typeof input !== "object" || input === null) {
    throw new SettingsValidationError("Expected a settings object.");
  }
  const raw = input as Record<string, unknown>;

  const storeName = typeof raw.storeName === "string" ? raw.storeName.trim() : "";
  if (!storeName) {
    throw new SettingsValidationError("Store name is required.");
  }
  if (storeName.length > MAX_STORE_NAME_LENGTH) {
    throw new SettingsValidationError(
      `Store name must be ${MAX_STORE_NAME_LENGTH} characters or fewer.`
    );
  }

  return mutateJson<StoreSettings>(FILE, DEFAULT_SETTINGS, () => ({
    storeName,
  }));
}
