import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { orderSigningSecret } from "./env";

/**
 * An order token is a signed, self-contained receipt handed to the buyer when
 * an invoice is created. It lets the client ask "is my order paid yet?"
 * without giving it the ability to ask about *other* people's invoices, and
 * without the server needing an orders table — the wallet itself is the
 * ledger, and this token is just a signed pointer into it.
 */
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

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", orderSigningSecret()).update(payload).digest("base64url");
}

export function createOrderToken(claims: OrderClaims): string {
  const encoded: EncodedClaims = {
    ph: claims.paymentHash,
    pid: claims.productId,
    sats: claims.priceSats,
    exp: claims.expiresAt,
  };
  const payload = b64url(JSON.stringify(encoded));
  return `${payload}.${sign(payload)}`;
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

  const expected = Buffer.from(sign(payload));
  const provided = Buffer.from(signature);
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    throw new InvalidOrderTokenError("Order token signature does not match");
  }

  let decoded: EncodedClaims;
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
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
