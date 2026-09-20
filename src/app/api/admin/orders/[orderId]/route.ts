import type { NextRequest } from "next/server";
import { markFulfilled } from "@/server/orders";
import { isAdmin } from "@/server/auth";
import { apiError, handleUnexpected, unauthorized } from "@/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin only: mark an order sent, or undo that.
 *
 * Note what cannot be set here: payment state. Whether money arrived is the
 * wallet's to say, not the shopkeeper's, so this endpoint only touches
 * fulfilment.
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/admin/orders/[orderId]">
) {
  try {
    if (!(await isAdmin())) return unauthorized();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("BAD_REQUEST", "Request body must be JSON.", 400);
    }

    const fulfilled =
      typeof body === "object" && body !== null
        ? (body as { fulfilled?: unknown }).fulfilled
        : undefined;

    if (typeof fulfilled !== "boolean") {
      return apiError("BAD_REQUEST", "`fulfilled` must be true or false.", 400);
    }

    const { orderId } = await context.params;
    const order = await markFulfilled(orderId, fulfilled);
    if (!order) {
      return apiError("NOT_FOUND", "That order does not exist.", 404);
    }

    return Response.json({ order });
  } catch (error) {
    return handleUnexpected(error, "PATCH /api/admin/orders/[orderId]");
  }
}
