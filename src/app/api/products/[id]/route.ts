import type { NextRequest } from "next/server";
import {
  deleteProduct,
  getListing,
  parseProductDraft,
  ProductValidationError,
  updateProduct,
} from "@/server/products";
import {
  deleteImage,
  isStoredImagePath,
  saveImageDataUrl,
  ImageValidationError,
} from "@/server/images";
import { isAdmin } from "@/server/auth";
import { apiError, handleUnexpected, unauthorized } from "@/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin only: remove a product and the image it owned. */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/products/[id]">
) {
  try {
    if (!(await isAdmin())) return unauthorized();

    const { id } = await context.params;
    const removed = await deleteProduct(id);
    if (!removed) {
      return apiError("NOT_FOUND", "That product does not exist.", 404);
    }

    await deleteImage(removed.image);
    return Response.json({ deleted: removed.id });
  } catch (error) {
    return handleUnexpected(error, "DELETE /api/products/[id]");
  }
}

/** Public: one product, with live availability. */
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/products/[id]">
) {
  try {
    const { id } = await context.params;
    const product = await getListing(id);
    if (!product) {
      return apiError("NOT_FOUND", "That product does not exist.", 404);
    }
    return Response.json({ product });
  } catch (error) {
    return handleUnexpected(error, "GET /api/products/[id]");
  }
}

/** Admin only: edit a product in place. */
export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/products/[id]">
) {
  try {
    if (!(await isAdmin())) return unauthorized();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("BAD_REQUEST", "Request body must be JSON.", 400);
    }

    let draft;
    try {
      draft = parseProductDraft(body);
    } catch (error) {
      if (error instanceof ProductValidationError) {
        return apiError("BAD_REQUEST", error.message, 400);
      }
      throw error;
    }

    const { id } = await context.params;
    const existing = await getListing(id);
    if (!existing) {
      return apiError("NOT_FOUND", "That product does not exist.", 404);
    }

    if (draft.image.startsWith("data:")) {
      try {
        draft = { ...draft, image: await saveImageDataUrl(draft.image) };
      } catch (error) {
        if (error instanceof ImageValidationError) {
          return apiError("BAD_REQUEST", error.message, 400);
        }
        throw error;
      }
    }

    if (draft.image && !isStoredImagePath(draft.image)) {
      return apiError(
        "BAD_REQUEST",
        "Upload an image file rather than linking to one.",
        400
      );
    }

    const product = await updateProduct(id, draft);
    if (!product) {
      return apiError("NOT_FOUND", "That product does not exist.", 404);
    }

    // The old image is only unlinked once the new record is safely stored, and
    // only if it really changed -- losing the picture on a failed edit would
    // be a poor trade for saving a few kilobytes.
    if (existing.image && existing.image !== product.image) {
      await deleteImage(existing.image);
    }

    return Response.json({ product });
  } catch (error) {
    return handleUnexpected(error, "PATCH /api/products/[id]");
  }
}
