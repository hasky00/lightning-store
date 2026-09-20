import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { orderSigningSecret } from "./env";

/**
 * HMAC signing shared by everything that hands a token to a browser.
 *
 * Every signature is bound to a `purpose`. That domain separation means a
 * token minted for one job can never be replayed as another — an order token
 * cannot be presented as an admin session, even though both are signed with
 * the same key.
 */

export function signPayload(purpose: string, payload: string): string {
  return createHmac("sha256", orderSigningSecret())
    .update(`${purpose}.${payload}`)
    .digest("base64url");
}

/** Constant-time comparison, so a wrong signature leaks nothing by timing. */
export function verifySignature(
  purpose: string,
  payload: string,
  signature: string
): boolean {
  const expected = Buffer.from(signPayload(purpose, payload));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

export function encodePayload(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function decodePayload<T>(payload: string): T {
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
}
