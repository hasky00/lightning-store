import "server-only";

import { randomUUID } from "node:crypto";
import type { Product } from "@/lib/types";
import { mutateJson, readJson } from "./json-store";
import { SEED_PRODUCTS } from "./seed-products";

/**
 * Product catalogue — the authoritative source of prices.
 *
 * The browser never gets to tell the server what something costs; checkout
 * looks the price up here. Storage is a JSON file for now. Everything else
 * goes through this module, so swapping in Postgres or SQLite later means
 * rewriting this file only.
 */

const FILE = "products.json";

export const MAX_NAME_LENGTH = 80;
export const MAX_DESCRIPTION_LENGTH = 500;
/** 21 million BTC in sats — no honest price is ever larger. */
export const MAX_PRICE_SATS = 2_100_000_000_000_000;

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
  const parsed = await readJson<unknown>(FILE, SEED_PRODUCTS);
  if (!Array.isArray(parsed)) return [];
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

export interface ProductDraft {
  name: string;
  description: string;
  priceSats: number;
  image: string;
}

export class ProductValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductValidationError";
  }
}

/**
 * Validate an untrusted product payload from the admin form. Prices are
 * checked hard: this number is what buyers will be charged, so anything that
 * is not a positive whole number of sats is rejected rather than coerced.
 */
export function parseProductDraft(input: unknown): ProductDraft {
  if (typeof input !== "object" || input === null) {
    throw new ProductValidationError("Expected a product object.");
  }
  const raw = input as Record<string, unknown>;

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) throw new ProductValidationError("Name is required.");
  if (name.length > MAX_NAME_LENGTH) {
    throw new ProductValidationError(
      `Name must be ${MAX_NAME_LENGTH} characters or fewer.`
    );
  }

  const description =
    typeof raw.description === "string" ? raw.description.trim() : "";
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw new ProductValidationError(
      `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`
    );
  }

  const priceSats = raw.priceSats;
  if (
    typeof priceSats !== "number" ||
    !Number.isInteger(priceSats) ||
    priceSats < 1 ||
    priceSats > MAX_PRICE_SATS
  ) {
    throw new ProductValidationError(
      "Price must be a whole number of sats, at least 1."
    );
  }

  const image = typeof raw.image === "string" ? raw.image : "";

  return { name, description, priceSats, image };
}

export async function createProduct(draft: ProductDraft): Promise<Product> {
  const product: Product = {
    id: randomUUID(),
    name: draft.name,
    description: draft.description,
    priceSats: draft.priceSats,
    image: draft.image,
    createdAt: Date.now(),
  };

  await mutateJson<Product[]>(FILE, SEED_PRODUCTS, (current) => [
    product,
    ...current.filter(isProduct),
  ]);

  return product;
}

/** Returns the deleted product, or null when nothing matched that id. */
export async function deleteProduct(id: string): Promise<Product | null> {
  let removed: Product | null = null;

  await mutateJson<Product[]>(FILE, SEED_PRODUCTS, (current) => {
    const products = current.filter(isProduct);
    removed = products.find((p) => p.id === id) ?? null;
    return products.filter((p) => p.id !== id);
  });

  return removed;
}
