import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { Nip47Transaction } from "@getalby/sdk/nwc";

/**
 * A pretend Lightning wallet, for development and tests.
 *
 * Without this, nothing about checkout can be exercised — or automatically
 * tested — without real credentials and real money. With it, the entire flow
 * from "Buy" to "paid" runs locally, exactly as it will in production, with
 * only this one component swapped out.
 *
 * It is deliberately impossible to enable in production. See `mockWalletMode`.
 */

interface MockInvoice {
  invoice: string;
  paymentHash: string;
  amountMsats: number;
  description: string;
  createdAt: number;
  expiresAt: number;
  settledAt: number | null;
  /** When set, the invoice reports itself settled once this time passes. */
  autoSettleAt: number | null;
}

const invoices = new Map<string, MockInvoice>();

export type MockMode = { enabled: false } | { enabled: true; autoSettleMs: number };

/**
 * Mock mode requires MOCK_WALLET=1 *and* a non-production build. A shop that
 * marks orders paid without being paid is worse than a shop that is down, so
 * this refuses rather than trusting the operator to have meant it.
 */
export function mockWalletMode(): MockMode {
  if (process.env.MOCK_WALLET !== "1") return { enabled: false };

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "MOCK_WALLET must never be enabled in production: it would mark orders paid without payment."
    );
  }

  const seconds = Number.parseFloat(process.env.MOCK_SETTLE_SECONDS ?? "4");
  return {
    enabled: true,
    autoSettleMs: Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : 4000,
  };
}

export function isMockWallet(): boolean {
  return mockWalletMode().enabled;
}

/**
 * Produces something invoice-shaped. It is not a valid BOLT11 and no real
 * wallet will pay it — that is the point: a mock invoice must never be
 * mistakable for a real payment request.
 */
export function mockMakeInvoice(options: {
  amountMsats: number;
  description: string;
  expirySeconds: number;
}): Nip47Transaction {
  const mode = mockWalletMode();
  if (!mode.enabled) throw new Error("Mock wallet is not enabled");

  const preimage = randomBytes(32).toString("hex");
  const paymentHash = createHash("sha256").update(preimage, "hex").digest("hex");
  const now = Math.floor(Date.now() / 1000);

  const record: MockInvoice = {
    invoice: `lnbcmock1${paymentHash}`,
    paymentHash,
    amountMsats: options.amountMsats,
    description: options.description,
    createdAt: now,
    expiresAt: now + options.expirySeconds,
    settledAt: null,
    autoSettleAt: mode.autoSettleMs > 0 ? Date.now() + mode.autoSettleMs : null,
  };

  invoices.set(paymentHash, record);
  return toTransaction(record, preimage);
}

export function mockLookupInvoice(paymentHash: string): Nip47Transaction | null {
  const record = invoices.get(paymentHash);
  if (!record) return null;

  // Auto-settle on read rather than on a timer, so behaviour does not depend
  // on anything still running between requests.
  if (
    record.settledAt === null &&
    record.autoSettleAt !== null &&
    Date.now() >= record.autoSettleAt &&
    Math.floor(Date.now() / 1000) <= record.expiresAt
  ) {
    record.settledAt = Math.floor(Date.now() / 1000);
  }

  return toTransaction(record, "");
}

/** Settle immediately, so tests do not have to wait on a clock. */
export function mockSettleInvoice(paymentHash: string): boolean {
  const record = invoices.get(paymentHash);
  if (!record || record.settledAt !== null) return false;
  record.settledAt = Math.floor(Date.now() / 1000);
  return true;
}

/** Expire immediately, so the expiry path is testable too. */
export function mockExpireInvoice(paymentHash: string): boolean {
  const record = invoices.get(paymentHash);
  if (!record || record.settledAt !== null) return false;
  record.expiresAt = Math.floor(Date.now() / 1000) - 1;
  record.autoSettleAt = null;
  return true;
}

function toTransaction(record: MockInvoice, preimage: string): Nip47Transaction {
  return {
    type: "incoming",
    state: record.settledAt !== null ? "settled" : "pending",
    invoice: record.invoice,
    description: record.description,
    description_hash: "",
    preimage,
    payment_hash: record.paymentHash,
    amount: record.amountMsats,
    fees_paid: 0,
    settled_at: record.settledAt ?? 0,
    created_at: record.createdAt,
    expires_at: record.expiresAt,
  };
}
