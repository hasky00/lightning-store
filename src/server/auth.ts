import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { adminPassword } from "./env";
import {
  decodePayload,
  encodePayload,
  signPayload,
  verifySignature,
} from "./signing";

/**
 * Admin sessions.
 *
 * The session is a signed token in an httpOnly cookie: JavaScript on the page
 * cannot read it, and it cannot be forged without the signing key. There is no
 * session table — the signature is the proof — so signing out is a matter of
 * dropping the cookie.
 */

const PURPOSE = "admin-session";
const COOKIE_NAME = "lightning_store_admin";
const SESSION_SECONDS = 8 * 60 * 60;

interface SessionClaims {
  exp: number;
}

/**
 * Compare the submitted password against the configured one in constant time.
 * Both sides are hashed first so the comparison is over equal-length buffers
 * and the check never reveals the real password's length.
 */
export function passwordMatches(candidate: string): boolean {
  const digest = (value: string) =>
    createHash("sha256").update(value, "utf8").digest();
  return timingSafeEqual(digest(candidate), digest(adminPassword()));
}

function createSessionToken(): string {
  const payload = encodePayload({
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  } satisfies SessionClaims);
  return `${payload}.${signPayload(PURPOSE, payload)}`;
}

function sessionTokenIsValid(token: string): boolean {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!verifySignature(PURPOSE, payload, signature)) return false;

  try {
    const claims = decodePayload<SessionClaims>(payload);
    return (
      typeof claims.exp === "number" && claims.exp > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

export async function startAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    // Plain HTTP is normal in local development, so only demand HTTPS where
    // the app is actually deployed.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function endAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return Boolean(token && sessionTokenIsValid(token));
}
