import "server-only";

import { NWCClient, type Nip47Transaction } from "@getalby/sdk/nwc";
import { merchantNwcUrl } from "./env";
import { satsToMsats } from "@/lib/utils";

/**
 * Server-side merchant wallet access.
 *
 * This is the only place the merchant connection secret is used. Two things
 * happen here and nowhere else:
 *   - minting an invoice for a price the server looked up itself
 *   - asking the wallet whether that invoice was actually settled
 *
 * The wallet is the source of truth for payment. A client claiming "I paid"
 * is not evidence; `lookupInvoice` is.
 */

export const INVOICE_EXPIRY_SECONDS = 600;

/**
 * Connecting to Nostr relays takes a second or so, which is far too slow to
 * repeat on every status poll, so the client is created once per server
 * instance. The SDK's pool reconnects on its own if a relay drops.
 */
let cachedClient: NWCClient | null = null;

function merchantClient(): NWCClient {
  if (!cachedClient) {
    cachedClient = new NWCClient({ nostrWalletConnectUrl: merchantNwcUrl() });
  }
  return cachedClient;
}

export async function createInvoice(options: {
  priceSats: number;
  description: string;
}): Promise<Nip47Transaction> {
  return merchantClient().makeInvoice({
    amount: satsToMsats(options.priceSats),
    description: options.description,
    expiry: INVOICE_EXPIRY_SECONDS,
  });
}

export type PaymentState = "pending" | "paid" | "expired" | "failed";

export interface PaymentStatus {
  state: PaymentState;
  /** Unix seconds the invoice settled, when it did. */
  settledAt: number | null;
  /** Amount the wallet actually received, in sats. */
  amountSats: number;
}

/**
 * Ask the merchant wallet about one invoice. Returns `null` when the wallet
 * has never heard of this payment hash.
 */
export async function getPaymentStatus(
  paymentHash: string
): Promise<PaymentStatus | null> {
  let tx: Nip47Transaction;
  try {
    tx = await merchantClient().lookupInvoice({ payment_hash: paymentHash });
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }

  return {
    state: toPaymentState(tx),
    settledAt: tx.state === "settled" ? tx.settled_at : null,
    amountSats: Math.floor(tx.amount / 1000),
  };
}

function toPaymentState(tx: Nip47Transaction): PaymentState {
  if (tx.state === "settled") return "paid";
  if (tx.state === "failed") return "failed";
  // "pending" and "accepted" are both still in flight — but an unsettled
  // invoice past its expiry can never be paid, so report that plainly.
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (tx.expires_at && tx.expires_at < nowSeconds) return "expired";
  return "pending";
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "NOT_FOUND"
  );
}
