import type { NextRequest } from "next/server";
import { getPaymentStatus } from "@/server/nwc";
import { InvalidOrderTokenError, verifyOrderToken } from "@/server/order-token";
import {
  getOrderByPaymentHash,
  recordPaymentState,
  toReceipt,
} from "@/server/orders";
import { apiError, handleUnexpected } from "@/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Once an invoice has expired the buyer may still be waiting on a settlement
 * that landed at the last second, so tokens stay readable for a day afterwards
 * rather than going dark the moment the invoice lapses.
 */
const TOKEN_GRACE_SECONDS = 24 * 60 * 60;

/**
 * Report whether an order has been paid.
 *
 * The answer comes from the merchant wallet, not from the caller, so this is
 * the only statement about payment the storefront should ever trust. The
 * order id is a signed token: it proves the caller was handed this invoice by
 * us, which stops anyone from enumerating the wallet's other payments.
 *
 * The stored order is updated to match what the wallet said — the record
 * follows the wallet, never the other way round.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/orders/[orderId]">
) {
  try {
    const { orderId } = await context.params;

    let claims;
    try {
      claims = verifyOrderToken(orderId);
    } catch (error) {
      if (error instanceof InvalidOrderTokenError) {
        return apiError("NOT_FOUND", "Unknown order.", 404);
      }
      throw error;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (nowSeconds > claims.expiresAt + TOKEN_GRACE_SECONDS) {
      return apiError("NOT_FOUND", "This order is no longer available.", 410);
    }

    const status = await getPaymentStatus(claims.paymentHash);
    if (!status) {
      return apiError("NOT_FOUND", "The wallet has no record of this order.", 404);
    }

    if (status.state === "paid" && status.amountSats < claims.priceSats) {
      console.warn(
        `[GET /api/orders] underpayment on ${claims.paymentHash}: received ${status.amountSats} sats, expected ${claims.priceSats}`
      );
    }

    const order =
      (await recordPaymentState(
        claims.paymentHash,
        status.state,
        status.settledAt
      )) ?? (await getOrderByPaymentHash(claims.paymentHash));

    if (!order) {
      return apiError("NOT_FOUND", "Unknown order.", 404);
    }

    return Response.json({
      orderId,
      state: order.state,
      settledAt: status.settledAt,
      amountSats: status.amountSats,
      productId: claims.productId,
      priceSats: claims.priceSats,
      expiresAt: claims.expiresAt,
      order: toReceipt(order),
    });
  } catch (error) {
    return handleUnexpected(error, "GET /api/orders/[orderId]");
  }
}
