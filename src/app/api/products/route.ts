import { listProducts } from "@/server/products";
import { handleUnexpected } from "@/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ products: await listProducts() });
  } catch (error) {
    return handleUnexpected(error, "GET /api/products");
  }
}
