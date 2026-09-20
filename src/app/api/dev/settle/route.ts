import type { NextRequest } from "next/server";
import {
  isMockWallet,
  mockExpireInvoice,
  mockSettleInvoice,
} from "@/server/mock-wallet";
import { apiError, handleUnexpected } from "@/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Settle or expire a mock invoice on demand.
 *
 * This exists so tests do not have to sleep on a clock. It only functions
 * when the mock wallet is active — which itself refuses to run in production —
 * so there is no configuration in which this can affect a real payment.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isMockWallet()) {
      return apiError("NOT_FOUND", "Not found.", 404);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("BAD_REQUEST", "Request body must be JSON.", 400);
    }

    const raw = (typeof body === "object" && body !== null ? body : {}) as {
      paymentHash?: unknown;
      action?: unknown;
    };

    if (typeof raw.paymentHash !== "string" || !raw.paymentHash) {
      return apiError("BAD_REQUEST", "A paymentHash is required.", 400);
    }

    const action = raw.action === "expire" ? "expire" : "settle";
    const changed =
      action === "expire"
        ? mockExpireInvoice(raw.paymentHash)
        : mockSettleInvoice(raw.paymentHash);

    return Response.json({ action, changed });
  } catch (error) {
    return handleUnexpected(error, "POST /api/dev/settle");
  }
}
