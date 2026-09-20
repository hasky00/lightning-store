import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import type { Order, OrderContact, OrderReceipt, OrderState } from "@/lib/types";
import { mutateJson, readJson } from "./json-store";

/**
 * Order records.
 *
 * Worth being precise about why these exist, because the payment design
 * deliberately avoids needing them: the *wallet* remains the source of truth
 * for whether money arrived. An order record cannot make something paid.
 *
 * What it does is answer the questions the wallet cannot: what was bought,
 * at what price, by whom, and has it been sent yet. That is fulfilment, not
 * payment, and it genuinely needs storage.
 */

const FILE = "orders.json";

const MAX_EMAIL_LENGTH = 254;
const MAX_NOTE_LENGTH = 500;

/**
 * Human-quotable reference. Uses an alphabet without vowels (so it cannot
 * spell anything unfortunate) and without 0/O/1/I (so it survives being read
 * aloud or copied by hand).
 */
const REFERENCE_ALPHABET = "23456789BCDFGHJKLMNPQRSTVWXYZ";

function generateReference(): string {
  const bytes = randomBytes(6);
  let code = "";
  for (const byte of bytes) {
    code += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
  }
  return `LS-${code}`;
}

export async function listOrders(): Promise<Order[]> {
  const stored = await readJson<Order[]>(FILE, []);
  if (!Array.isArray(stored)) return [];
  return stored.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getOrderByPaymentHash(
  paymentHash: string
): Promise<Order | null> {
  const orders = await listOrders();
  return orders.find((o) => o.paymentHash === paymentHash) ?? null;
}

export async function createOrder(input: {
  paymentHash: string;
  productId: string;
  productName: string;
  priceSats: number;
  expiresAt: number;
  contact: OrderContact | null;
}): Promise<Order> {
  const order: Order = {
    id: randomUUID(),
    reference: generateReference(),
    paymentHash: input.paymentHash,
    productId: input.productId,
    productName: input.productName,
    priceSats: input.priceSats,
    state: "pending",
    contact: input.contact,
    createdAt: Date.now(),
    expiresAt: input.expiresAt,
    paidAt: null,
    fulfilledAt: null,
  };

  await mutateJson<Order[]>(FILE, [], (current) => [order, ...current]);
  return order;
}

/**
 * Record what the wallet reported. Only ever called with a state that came
 * from the wallet, and never downgrades a paid order: once money has arrived,
 * a later lookup failure must not un-sell the item.
 */
export async function recordPaymentState(
  paymentHash: string,
  state: OrderState,
  paidAt: number | null
): Promise<Order | null> {
  let updated: Order | null = null;

  await mutateJson<Order[]>(FILE, [], (current) =>
    current.map((order) => {
      if (order.paymentHash !== paymentHash) return order;
      if (order.state === "paid") {
        updated = order;
        return order;
      }

      updated = {
        ...order,
        state,
        paidAt: state === "paid" ? paidAt ?? Math.floor(Date.now() / 1000) : null,
      };
      return updated;
    })
  );

  return updated;
}

export async function markFulfilled(
  orderId: string,
  fulfilled: boolean
): Promise<Order | null> {
  let updated: Order | null = null;

  await mutateJson<Order[]>(FILE, [], (current) =>
    current.map((order) => {
      if (order.id !== orderId) return order;
      updated = { ...order, fulfilledAt: fulfilled ? Date.now() : null };
      return updated;
    })
  );

  return updated;
}

/**
 * How many units of a product are spoken for: everything already paid, plus
 * invoices still within their expiry window.
 *
 * Counting live invoices is what stops two buyers paying for the same last
 * item — the in-flight invoice holds it — and because expiry is a timestamp,
 * an abandoned checkout releases its hold on its own, with nothing to clean up.
 */
export async function countCommitted(productId: string): Promise<number> {
  const orders = await listOrders();
  const nowSeconds = Math.floor(Date.now() / 1000);

  return orders.filter((order) => {
    if (order.productId !== productId) return false;
    if (order.state === "paid") return true;
    return order.state === "pending" && order.expiresAt > nowSeconds;
  }).length;
}

/** Committed counts for every product in one pass, for listing pages. */
export async function countCommittedByProduct(): Promise<Map<string, number>> {
  const orders = await listOrders();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const counts = new Map<string, number>();

  for (const order of orders) {
    const counts_as =
      order.state === "paid" ||
      (order.state === "pending" && order.expiresAt > nowSeconds);
    if (!counts_as) continue;
    counts.set(order.productId, (counts.get(order.productId) ?? 0) + 1);
  }

  return counts;
}

export class ContactValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContactValidationError";
  }
}

/** Contact details are optional; when given, they must be sane. */
export function parseContact(input: unknown): OrderContact | null {
  if (input === undefined || input === null) return null;
  if (typeof input !== "object") {
    throw new ContactValidationError("Contact details must be an object.");
  }

  const raw = input as Record<string, unknown>;
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const note = typeof raw.note === "string" ? raw.note.trim() : "";

  if (!email && !note) return null;

  if (email) {
    if (email.length > MAX_EMAIL_LENGTH) {
      throw new ContactValidationError("That email address is too long.");
    }
    // Deliberately loose: the only way to truly validate an address is to send
    // to it, and over-strict patterns reject real addresses.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ContactValidationError("That email address looks wrong.");
    }
  }

  if (note.length > MAX_NOTE_LENGTH) {
    throw new ContactValidationError(
      `Note must be ${MAX_NOTE_LENGTH} characters or fewer.`
    );
  }

  return { email, note };
}

/** Strip the fields a buyer has no business seeing. */
export function toReceipt(order: Order): OrderReceipt {
  return {
    reference: order.reference,
    productId: order.productId,
    productName: order.productName,
    priceSats: order.priceSats,
    state: order.state,
    contact: order.contact,
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
    paidAt: order.paidAt,
    fulfilledAt: order.fulfilledAt,
  };
}
