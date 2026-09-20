import "server-only";

/**
 * Server-side configuration.
 *
 * Every value here is read lazily inside a function rather than at module
 * scope, so importing this file during `next build` never fails on a machine
 * that has no secrets configured. The error surfaces on the first request
 * that actually needs the value.
 */

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new ConfigError(
      `Missing required environment variable ${name}. See .env.example.`
    );
  }
  return value;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * The merchant wallet connection string. This is a *secret* — it can spend and
 * receive. It must never be sent to the browser.
 */
export function merchantNwcUrl(): string {
  const url = required("MERCHANT_NWC_URL");
  if (!url.startsWith("nostr+walletconnect://")) {
    throw new ConfigError(
      "MERCHANT_NWC_URL must be a nostr+walletconnect:// connection string."
    );
  }
  return url;
}

/** Secret used to sign order tokens so clients cannot forge or probe them. */
export function orderSigningSecret(): string {
  const secret = required("ORDER_SIGNING_SECRET");
  if (secret.length < 32) {
    throw new ConfigError(
      "ORDER_SIGNING_SECRET must be at least 32 characters. Generate one with: openssl rand -hex 32"
    );
  }
  return secret;
}
