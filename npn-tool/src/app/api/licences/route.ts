import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/db/audit";
import { parseJsonBody, rejectNonStrings } from "@/lib/utils/parse-body";
import { handlePrismaError } from "@/lib/errors/handle-prisma";

/** Strip HTML angle brackets from a string (defense-in-depth XSS prevention) */
function sanitize(value: string): string {
  return value.replace(/[<>]/g, "");
}

/** Sanitize all string text fields on a licence data object */
function sanitiseLicenceInput<T extends Record<string, unknown>>(data: T): T {
  const textFields = [
    "licenceNumber", "productName", "productNameFr", "notes",
    "companyName", "companyCode", "dosageForm", "routeOfAdmin",
    "applicationClass", "submissionType",
  ];
  const out = { ...data };
  for (const key of textFields) {
    if (typeof out[key] === "string") {
      (out as Record<string, unknown>)[key] = sanitize(out[key] as string);
    }
  }
  return out;
}

/** Validate NPN / licenceNumber format — 8 digits (if provided) */
function validateLicenceNumber(val: unknown): string | null {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val !== "string") return "licenceNumber must be a string";
  // Reject negative/non-numeric formats (allow digits only; LNHPD uses 8-digit NPNs)
  if (!/^\d+$/.test(val)) return "licenceNumber must be digits only";
  return null;
}

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") || "";
  const status = req.nextUrl.searchParams.get("status") || "";

  const where: Record<string, unknown> = {};
  if (status) where.productStatus = status;
  if (q) {
    where.OR = [
      { productName: { contains: q } },
      { licenceNumber: { contains: q } },
    ];
  }

  const licences = await prisma.productLicence.findMany({
    where,
    orderBy: [{ productStatus: "asc" }, { productName: "asc" }],
    include: { amendments: { orderBy: { createdAt: "desc" }, take: 3 } },
  });

  return NextResponse.json(licences);
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = await parseJsonBodyOrArray(req);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  // Bulk import (array payload)
  if (Array.isArray(body)) {
    let created = 0, skipped = 0;
    for (const rawItem of body) {
      if (!rawItem || typeof rawItem !== "object") { skipped++; continue; }
      const item = sanitiseLicenceInput(rawItem as Record<string, unknown>);
      if (!item.productName || typeof item.productName !== "string" || !item.productName.trim()) { skipped++; continue; }
      const lnErr = validateLicenceNumber(item.licenceNumber);
      if (lnErr) { skipped++; continue; }
      try {
        await prisma.productLicence.create({
          data: {
            lnhpdId: (item.lnhpdId as string | null) || null,
            licenceNumber: String(item.licenceNumber || ""),
            productName: String(item.productName),
            productNameFr: String(item.productNameFr || ""),
            dosageForm: String(item.dosageForm || ""),
            routeOfAdmin: String(item.routeOfAdmin || ""),
            companyCode: String(item.companyCode || ""),
            companyName: String(item.companyName || ""),
            applicationClass: String(item.applicationClass || ""),
            submissionType: String(item.submissionType || ""),
            licenceDate: String(item.licenceDate || ""),
            productStatus: String(item.productStatus || "active"),
            medicinalIngredientsJson: typeof item.medicinalIngredientsJson === "string" ? item.medicinalIngredientsJson : JSON.stringify(item.medicinalIngredients || []),
            nonMedIngredientsJson: typeof item.nonMedIngredientsJson === "string" ? item.nonMedIngredientsJson : JSON.stringify(item.nonMedIngredients || []),
            claimsJson: typeof item.claimsJson === "string" ? item.claimsJson : JSON.stringify(item.claims || []),
            risksJson: typeof item.risksJson === "string" ? item.risksJson : JSON.stringify(item.risks || []),
            dosesJson: typeof item.dosesJson === "string" ? item.dosesJson : JSON.stringify(item.doses || []),
            importedFrom: String(item.importedFrom || "manual"),
            notes: String(item.notes || ""),
          },
        });
        created++;
      } catch {
        skipped++;
      }
    }
    await logAudit(user.id, "created", "licence", "bulk", `${user.name} imported ${created} licences`);
    return NextResponse.json({ created, skipped }, { status: 201 });
  }

  // Single create
  const data = body as Record<string, unknown>;

  // Reject wrong types for string fields early
  const typeErr = rejectNonStrings(data, [
    "productName", "productNameFr", "licenceNumber", "notes",
    "companyName", "companyCode", "dosageForm", "routeOfAdmin",
    "applicationClass", "submissionType", "licenceDate", "productStatus",
  ]);
  if (typeErr) return typeErr;

  // Required field
  if (!data.productName || !String(data.productName).trim()) {
    return NextResponse.json({ error: "productName is required" }, { status: 400 });
  }

  // licenceNumber format
  const lnErr = validateLicenceNumber(data.licenceNumber);
  if (lnErr) return NextResponse.json({ error: lnErr }, { status: 400 });

  const clean = sanitiseLicenceInput(data);

  try {
    const licence = await prisma.productLicence.create({
      data: {
        licenceNumber: String(clean.licenceNumber || ""),
        productName: String(clean.productName),
        productNameFr: String(clean.productNameFr || ""),
        dosageForm: String(clean.dosageForm || ""),
        routeOfAdmin: String(clean.routeOfAdmin || ""),
        companyCode: String(clean.companyCode || ""),
        applicationClass: String(clean.applicationClass || ""),
        licenceDate: String(clean.licenceDate || ""),
        productStatus: String(clean.productStatus || "active"),
        licencePdfPath: String(clean.licencePdfPath || ""),
        importedFrom: String(clean.importedFrom || "manual"),
        notes: String(clean.notes || ""),
      },
    });
    await logAudit(user.id, "created", "licence", licence.id, `${user.name} added licence NPN ${licence.licenceNumber}`);
    return NextResponse.json(licence, { status: 201 });
  } catch (err) {
    return handlePrismaError(err, "create licence");
  }
}

/**
 * Parse body allowing either object OR array payloads (bulk import uses arrays).
 */
async function parseJsonBodyOrArray(
  req: NextRequest
): Promise<{ data: Record<string, unknown> | unknown[] } | { error: NextResponse }> {
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
  if (parsed === null || (typeof parsed !== "object")) {
    return { error: NextResponse.json({ error: "Request body must be a JSON object or array" }, { status: 400 }) };
  }
  return { data: parsed as Record<string, unknown> | unknown[] };
}
