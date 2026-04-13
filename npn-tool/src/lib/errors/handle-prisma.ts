import { NextResponse } from "next/server";

/**
 * Known Prisma error codes we want to map to clean HTTP responses.
 * https://www.prisma.io/docs/orm/reference/error-reference
 */
const PRISMA_ERROR_MAP: Record<string, { status: number; message: string }> = {
  P2025: { status: 404, message: "Record not found" },
  P2002: { status: 409, message: "Duplicate value violates unique constraint" },
  P2003: { status: 409, message: "Foreign key constraint failed" },
  P2014: { status: 409, message: "Relation constraint violation" },
  P2000: { status: 400, message: "Value too long for field" },
};

type PrismaLikeError = {
  code?: string;
  message?: string;
  meta?: Record<string, unknown>;
};

/**
 * Convert any thrown error (especially Prisma's) into a clean NextResponse.
 * Never leaks stack traces or absolute file paths to the client.
 */
export function handlePrismaError(err: unknown, context?: string): NextResponse {
  const e = err as PrismaLikeError;
  const code = typeof e?.code === "string" ? e.code : undefined;

  if (code && PRISMA_ERROR_MAP[code]) {
    const { status, message } = PRISMA_ERROR_MAP[code];
    const detail = context ? `${message} (${context})` : message;
    return NextResponse.json({ error: detail, code }, { status });
  }

  // Unknown error — log server-side, return generic 500 without stack
  const safeMessage = context ? `Internal error (${context})` : "Internal error";
  console.error("[handlePrismaError]", context || "unknown", err);
  return NextResponse.json({ error: safeMessage }, { status: 500 });
}

/**
 * Wrap a route handler to auto-convert thrown errors into clean responses.
 * Usage:
 *   return withPrismaErrors(async () => {
 *     const row = await prisma.productLicence.delete({ where: { id } });
 *     return NextResponse.json(row);
 *   }, "delete licence");
 */
export async function withPrismaErrors<T>(
  fn: () => Promise<T> | T,
  context?: string
): Promise<T | NextResponse> {
  try {
    return await fn();
  } catch (err) {
    return handlePrismaError(err, context);
  }
}
