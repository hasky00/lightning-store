import type { NextRequest } from "next/server";
import { deleteProduct } from "@/server/products";
import { deleteImage } from "@/server/images";
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
