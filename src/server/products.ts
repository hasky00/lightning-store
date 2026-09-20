import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Product } from "@/lib/types";

/**
 * Product catalogue — the authoritative source of prices.
 *
 * The browser never gets to tell the server what something costs; checkout
 * looks the price up here. Storage is a JSON file for now. Everything else
 * goes through the two functions below, so swapping in Postgres or SQLite
 * later means rewriting this file only.
 */

const DATA_FILE = path.join(process.cwd(), "data", "products.json");

function isProduct(value: unknown): value is Product {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.description === "string" &&
    typeof p.priceSats === "number" &&
    Number.isInteger(p.priceSats) &&
    p.priceSats > 0 &&
    typeof p.image === "string" &&
    typeof p.createdAt === "number"
  );
}

async function readCatalogue(): Promise<Product[]> {
  const raw = await readFile(DATA_FILE, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Product catalogue must be a JSON array");
  }
  return parsed.filter(isProduct);
}

export async function listProducts(): Promise<Product[]> {
  const products = await readCatalogue();
  return products.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getProduct(id: string): Promise<Product | null> {
  const products = await readCatalogue();
  return products.find((p) => p.id === id) ?? null;
}
