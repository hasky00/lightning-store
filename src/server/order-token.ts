import "server-only";

import {
  decodePayload,
  encodePayload,
  signPayload,
  verifySignature,
} from "./signing";

/**
 * An order token is a signed, self-contained receipt handed to the buyer when
 * an invoice is created. It lets the client ask "is my order paid yet?"
 * without giving it the ability to ask about *other* people's invoices, and
 * without the server needing an orders table — the wallet itself is the
 * ledger, and this token is just a signed pointer into it.
 */

const PURPOSE = "order";

export interface OrderClaims {
  /** Payment hash of the invoice, used for `lookup_invoice`. */
  paymentHash: string;
  productId: string;
  priceSats: number;
  /** Unix seconds after which the token is no longer accepted. */
  expiresAt: number;
}

interface EncodedClaims {
  ph: string;
  pid: string;
  sats: number;
  exp: number;
}

export function createOrderToken(claims: OrderClaims): string {
  const payload = encodePayload({
    ph: claims.paymentHash,
    pid: claims.productId,
    sats: claims.priceSats,
    exp: claims.expiresAt,
  } satisfies EncodedClaims);
  return `${payload}.${signPayload(PURPOSE, payload)}`;
}

export class InvalidOrderTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidOrderTokenError";
  }
}

export function verifyOrderToken(token: string): OrderClaims {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    throw new InvalidOrderTokenError("Malformed order token");
  }

  if (!verifySignature(PURPOSE, payload, signature)) {
    throw new InvalidOrderTokenError("Order token signature does not match");
  }

  let decoded: EncodedClaims;
  try {
    decoded = decodePayload<EncodedClaims>(payload);
  } catch {
    throw new InvalidOrderTokenError("Order token payload is not valid JSON");
  }

  if (
    typeof decoded.ph !== "string" ||
    typeof decoded.pid !== "string" ||
    typeof decoded.sats !== "number" ||
    typeof decoded.exp !== "number"
  ) {
    throw new InvalidOrderTokenError("Order token payload is missing fields");
  }

  return {
    paymentHash: decoded.ph,
    productId: decoded.pid,
    priceSats: decoded.sats,
    expiresAt: decoded.exp,
  };
}
