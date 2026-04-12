import { NextResponse } from "next/server";
import { getSession } from "./session";

type UserSession = { id: string; username: string; name: string; role: string; email: string | null };

/**
 * Require authentication. Returns user session or 401 response.
 */
export async function requireAuth(): Promise<UserSession | NextResponse> {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return user;
}

/**
 * Require editor or admin role. Returns user session or 401/403 response.
 */
export async function requireEditor(): Promise<UserSession | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (result.role === "viewer") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  return result;
}

/**
 * Require admin role. Returns user session or 401/403 response.
 */
export async function requireAdmin(): Promise<UserSession | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (result.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  return result;
}

/**
 * Check if result is an error response (for use in guards)
 */
export function isErrorResponse(result: unknown): result is NextResponse {
  return result instanceof NextResponse;
}
