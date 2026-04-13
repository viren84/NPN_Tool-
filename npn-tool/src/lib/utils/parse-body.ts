import { NextRequest, NextResponse } from "next/server";

/**
 * Result of parsing a request body. Either a successful parse OR a response error.
 */
export type ParseResult<T> = { data: T; error?: never } | { data?: never; error: NextResponse };

/**
 * Safely parse a JSON request body. Returns:
 * - { data } on success
 * - { error } as a 400 NextResponse if JSON is invalid, empty, or not an object
 *
 * Usage:
 *   const parsed = await parseJsonBody<{ name: string }>(req);
 *   if (parsed.error) return parsed.error;
 *   const { name } = parsed.data;
 */
export async function parseJsonBody<T = Record<string, unknown>>(
  req: NextRequest
): Promise<ParseResult<T>> {
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return { error: NextResponse.json({ error: "Unable to read request body" }, { status: 400 }) };
  }

  if (!raw || !raw.trim()) {
    return { error: NextResponse.json({ error: "Request body is empty" }, { status: 400 }) };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 }) };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { error: NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 }) };
  }

  return { data: parsed as T };
}

/**
 * Validate that specified fields are non-empty strings.
 * Returns null if all are valid, or a 400 NextResponse describing the first failure.
 */
export function requireStringFields(
  body: Record<string, unknown>,
  fields: string[]
): NextResponse | null {
  for (const field of fields) {
    const val = body[field];
    if (val === undefined || val === null) {
      return NextResponse.json({ error: `${field} is required` }, { status: 400 });
    }
    if (typeof val !== "string") {
      return NextResponse.json({ error: `${field} must be a string` }, { status: 400 });
    }
    if (val.trim() === "") {
      return NextResponse.json({ error: `${field} must not be empty` }, { status: 400 });
    }
  }
  return null;
}

/**
 * Coerce all string-typed body fields to strings (if present). Used to defend against
 * clients sending booleans/numbers/arrays where strings are expected.
 * Non-string values for listed fields → 400 error.
 */
export function rejectNonStrings(
  body: Record<string, unknown>,
  fields: string[]
): NextResponse | null {
  for (const field of fields) {
    if (field in body) {
      const val = body[field];
      if (val !== null && val !== undefined && typeof val !== "string") {
        return NextResponse.json(
          { error: `${field} must be a string, got ${Array.isArray(val) ? "array" : typeof val}` },
          { status: 400 }
        );
      }
    }
  }
  return null;
}
