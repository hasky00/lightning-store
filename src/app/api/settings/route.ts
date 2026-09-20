import type { NextRequest } from "next/server";
import {
  getSettings,
  SettingsValidationError,
  updateSettings,
} from "@/server/settings";
import { isAdmin } from "@/server/auth";
import { apiError, handleUnexpected, unauthorized } from "@/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public: the shop name, shown to every visitor. */
export async function GET() {
  try {
    return Response.json({ settings: await getSettings() });
  } catch (error) {
    return handleUnexpected(error, "GET /api/settings");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await isAdmin())) return unauthorized();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("BAD_REQUEST", "Request body must be JSON.", 400);
    }

    try {
      return Response.json({ settings: await updateSettings(body) });
    } catch (error) {
      if (error instanceof SettingsValidationError) {
        return apiError("BAD_REQUEST", error.message, 400);
      }
      throw error;
    }
  } catch (error) {
    return handleUnexpected(error, "PATCH /api/settings");
  }
}
