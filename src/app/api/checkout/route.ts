import type { NextRequest } from "next/server";
import { getListing } from "@/server/products";
import { createInvoice, INVOICE_EXPIRY_SECONDS } from "@/server/nwc";
import { createOrderToken } from "@/server/order-token";
import {
  ContactValidationError,
  createOrder,
  parseContact,
  toReceipt,
} from "@/server/orders";
import { apiError, handleUnexpected } from "@/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Start a purchase.
 *
 * The client sends a product id and, optionally, how to reach them. The price
 * comes from the catalogue on this side of the wire, so a tampered request
 * cannot buy a 15,000 sat tee for 1 sat. The response carries the invoice to
 * pay and an opaque order id to poll — never the merchant's connection secret.
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("BAD_REQUEST", "Request body must be JSON.", 400);
    }

    const raw = (typeof body === "object" && body !== null ? body : {}) as {
      productId?: unknown;
      contact?: unknown;
    };

    if (typeof raw.productId !== "string" || !raw.productId.trim()) {
      return apiError("BAD_REQUEST", "A productId is required.", 400);
    }

    let contact;
    try {
      contact = parseContact(raw.contact);
    } catch (error) {
      if (error instanceof ContactValidationError) {
        return apiError("BAD_REQUEST", error.message, 400);
      }
      throw error;
    }

    const product = await getListing(raw.productId.trim());
    if (!product) {
      return apiError("NOT_FOUND", "That product does not exist.", 404);
    }

    // Checked before minting: an invoice for something that cannot be
    // delivered is worse than a refused checkout.
    if (product.soldOut) {
      return apiError("SOLD_OUT", `${product.name} is sold out.`, 409);
    }

    const tx = await createInvoice({
      priceSats: product.priceSats,
      description: `${product.name} — Lightning Store`,
    });

    const expiresAt =
      tx.expires_at || Math.floor(Date.now() / 1000) + INVOICE_EXPIRY_SECONDS;

    const order = await createOrder({
      paymentHash: tx.payment_hash,
      productId: product.id,
      productName: product.name,
      priceSats: product.priceSats,
      expiresAt,
      contact,
    });

    const orderId = createOrderToken({
      paymentHash: tx.payment_hash,
      productId: product.id,
      priceSats: product.priceSats,
      expiresAt,
    });

    return Response.json({
      orderId,
      invoice: tx.invoice,
      expiresAt,
      product: {
        id: product.id,
        name: product.name,
        priceSats: product.priceSats,
      },
      order: toReceipt(order),
    });
  } catch (error) {
    return handleUnexpected(error, "POST /api/checkout");
  }
}
