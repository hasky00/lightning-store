import type { NextRequest } from "next/server";
import {
  createProduct,
  listListings,
  parseProductDraft,
  ProductValidationError,
} from "@/server/products";
import {
  saveImageDataUrl,
  isStoredImagePath,
  ImageValidationError,
} from "@/server/images";
import { isAdmin } from "@/server/auth";
import { apiError, handleUnexpected, unauthorized } from "@/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public: the catalogue every visitor sees, with live availability. */
export async function GET() {
  try {
    return Response.json({ products: await listListings() });
  } catch (error) {
    return handleUnexpected(error, "GET /api/products");
  }
}

/** Admin only: add a product. */
export async function POST(request: NextRequest) {
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

    // An inline data URL becomes a real file, so the catalogue stays small.
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

    // After that conversion an image is either empty or a path we wrote
    // ourselves. Anything else -- a remote URL, a crafted path -- is refused,
    // so a stored image can never point somewhere this store does not own.
    if (draft.image && !isStoredImagePath(draft.image)) {
      return apiError(
        "BAD_REQUEST",
        "Upload an image file rather than linking to one.",
        400
      );
    }

    const product = await createProduct(draft);
    return Response.json({ product }, { status: 201 });
  } catch (error) {
    return handleUnexpected(error, "POST /api/products");
  }
}
