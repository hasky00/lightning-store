import { listOrders } from "@/server/orders";
import { isAdmin } from "@/server/auth";
import { handleUnexpected, unauthorized } from "@/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin only: every order, newest first. Includes buyer contact details. */
export async function GET() {
  try {
    if (!(await isAdmin())) return unauthorized();
    return Response.json({ orders: await listOrders() });
  } catch (error) {
    return handleUnexpected(error, "GET /api/admin/orders");
  }
}
