import "server-only";

import { ConfigError } from "./env";

/**
 * Shared shape for API failures, so the frontend can branch on `code` rather
 * than pattern-matching English error messages.
 */
export interface ApiError {
  error: string;
  code: ApiErrorCode;
}

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "MERCHANT_NOT_CONFIGURED"
  | "WALLET_ERROR"
  | "INTERNAL";

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number
): Response {
  return Response.json({ error: message, code } satisfies ApiError, { status });
}

/**
 * Turns an unexpected throw into a safe response. Configuration problems are
 * reported distinctly so the storefront can say "this shop isn't set up yet"
 * instead of "something went wrong"; everything else is logged server-side and
 * summarised generically, so internals never reach the browser.
 */
export function handleUnexpected(error: unknown, context: string): Response {
  if (error instanceof ConfigError) {
    console.error(`[${context}] configuration error:`, error.message);
    return apiError(
      "MERCHANT_NOT_CONFIGURED",
      "This store has no merchant wallet configured yet.",
      503
    );
  }

  console.error(`[${context}]`, error);
  return apiError("INTERNAL", "Something went wrong. Please try again.", 500);
}
