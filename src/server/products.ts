import "server-only";

import { randomUUID } from "node:crypto";
import type { Product, ProductListing } from "@/lib/types";
import { mutateJson, readJson } from "./json-store";
import { SEED_PRODUCTS } from "./seed-products";
import { countCommittedByProduct } from "./orders";

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
    typeof p.createdAt === "number" &&
    (p.stock === null ||
      (typeof p.stock === "number" && Number.isInteger(p.stock) && p.stock >= 0))
  );
}

async function readCatalogue(): Promise<Product[]> {
  const parsed = await readJson<unknown>(FILE, SEED_PRODUCTS);
  if (!Array.isArray(parsed)) return [];
  // Records written before stock existed have no such field. Reading them as
  // unlimited keeps an older catalogue working instead of silently dropping
  // every product in it.
  const normalised = parsed.map((value) =>
    typeof value === "object" && value !== null && !("stock" in value)
      ? { ...value, stock: null }
      : value
  );
  return normalised.filter(isProduct);
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
  stock: number | null;
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

  let stock: number | null = null;
  if (raw.stock !== undefined && raw.stock !== null && raw.stock !== "") {
    const value = typeof raw.stock === "number" ? raw.stock : Number(raw.stock);
    if (!Number.isInteger(value) || value < 0 || value > 1_000_000) {
      throw new ProductValidationError(
        "Stock must be a whole number of units, or left blank for unlimited."
      );
    }
    stock = value;
  }

  return { name, description, priceSats, image, stock };
}

export async function createProduct(draft: ProductDraft): Promise<Product> {
  const product: Product = {
    id: randomUUID(),
    name: draft.name,
    description: draft.description,
    priceSats: draft.priceSats,
    image: draft.image,
    stock: draft.stock,
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

/**
 * The catalogue plus live availability.
 *
 * Availability subtracts orders that are paid *or* still have an unexpired
 * invoice, so a checkout in progress holds the item. That is what stops two
 * buyers paying for the same last unit, and an abandoned checkout releases its
 * hold by itself when the invoice lapses.
 */
export async function listListings(): Promise<ProductListing[]> {
  const [products, committed] = await Promise.all([
    listProducts(),
    countCommittedByProduct(),
  ]);

  return products.map((product) => toListing(product, committed.get(product.id) ?? 0));
}

export async function getListing(id: string): Promise<ProductListing | null> {
  const product = await getProduct(id);
  if (!product) return null;
  const committed = await countCommittedByProduct();
  return toListing(product, committed.get(product.id) ?? 0);
}

function toListing(product: Product, committed: number): ProductListing {
  if (product.stock === null) {
    return { ...product, available: null, soldOut: false };
  }
  const available = Math.max(0, product.stock - committed);
  return { ...product, available, soldOut: available === 0 };
}

/** Returns the updated product, or null when nothing matched that id. */
export async function updateProduct(
  id: string,
  draft: ProductDraft
): Promise<Product | null> {
  let updated: Product | null = null;

  await mutateJson<Product[]>(FILE, SEED_PRODUCTS, (current) =>
    current.filter(isProduct).map((product) => {
      if (product.id !== id) return product;
      // id and createdAt are identity, not content: editing must not
      // invalidate links or reshuffle the catalogue.
      updated = {
        ...product,
        name: draft.name,
        description: draft.description,
        priceSats: draft.priceSats,
        image: draft.image,
        stock: draft.stock,
      };
      return updated;
    })
  );

  return updated;
}
