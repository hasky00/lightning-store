import type { NextRequest } from "next/server";
import {
  endAdminSession,
  isAdmin,
  passwordMatches,
  startAdminSession,
} from "@/server/auth";
import { apiError, handleUnexpected } from "@/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Whether the caller currently holds an admin session. */
export async function GET() {
  try {
    return Response.json({ signedIn: await isAdmin() });
  } catch (error) {
    return handleUnexpected(error, "GET /api/admin/session");
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("BAD_REQUEST", "Request body must be JSON.", 400);
    }

    const password =
      typeof body === "object" && body !== null
        ? (body as { password?: unknown }).password
        : undefined;

    if (typeof password !== "string" || !password) {
      return apiError("BAD_REQUEST", "A password is required.", 400);
    }

    if (!passwordMatches(password)) {
      // Deliberately vague, and identical for every wrong password: nothing
      // here should help someone narrow down the real one.
      return apiError("UNAUTHORIZED", "Incorrect password.", 401);
    }

    await startAdminSession();
    return Response.json({ signedIn: true });
  } catch (error) {
    return handleUnexpected(error, "POST /api/admin/session");
  }
}

export async function DELETE() {
  try {
    await endAdminSession();
    return Response.json({ signedIn: false });
  } catch (error) {
    return handleUnexpected(error, "DELETE /api/admin/session");
  }
}
