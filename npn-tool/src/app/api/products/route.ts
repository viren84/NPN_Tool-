import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/db/audit";
import { sanitizeHtml } from "@/lib/utils/sanitize";

const VALID_STAGES = [
  "research", "formulation", "stability", "filing", "under_review",
  "approved", "production", "launch", "active", "amendment",
  "renewal", "suspended", "cancelled", "archived", "withdrawn",
] as const;

const VALID_PRIORITIES = ["low", "medium", "high", "critical"] as const;

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const stage = url.searchParams.get("stage");
  const priority = url.searchParams.get("priority");
  const companyId = url.searchParams.get("companyId");

  // Build dynamic filter
  const where: Record<string, unknown> = {};

  if (stage) {
    if (!VALID_STAGES.includes(stage as (typeof VALID_STAGES)[number])) {
      return NextResponse.json(
        { error: `Invalid stage. Must be one of: ${VALID_STAGES.join(", ")}` },
        { status: 400 },
      );
    }
    where.stage = stage;
  }

  if (priority) {
    if (!VALID_PRIORITIES.includes(priority as (typeof VALID_PRIORITIES)[number])) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` },
        { status: 400 },
      );
    }
    where.priority = priority;
  }

  if (companyId) {
    where.companyId = companyId;
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "viewer") return NextResponse.json({ error: "Viewers cannot create" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = (body.name as string | undefined)?.trim();
  if (!name) {
    return NextResponse.json({ error: "Product name is required" }, { status: 400 });
  }

  // Validate stage if provided
  const stage = ((body.stage as string) || "research").trim();
  if (!VALID_STAGES.includes(stage as (typeof VALID_STAGES)[number])) {
    return NextResponse.json(
      { error: `Invalid stage. Must be one of: ${VALID_STAGES.join(", ")}` },
      { status: 400 },
    );
  }

  // Validate priority if provided
  const priority = ((body.priority as string) || "medium").trim();
  if (!VALID_PRIORITIES.includes(priority as (typeof VALID_PRIORITIES)[number])) {
    return NextResponse.json(
      { error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` },
      { status: 400 },
    );
  }

  const product = await prisma.product.create({
    data: {
      name: sanitizeHtml(name),
      brandName: sanitizeHtml(((body.brandName as string) || "").trim()),
      stage,
      priority,
      assignedTo: sanitizeHtml(((body.assignedTo as string) || "").trim()),
      companyId: ((body.companyId as string) || "").trim(),
      dosageForm: sanitizeHtml(((body.dosageForm as string) || "").trim()),
      routeOfAdmin: sanitizeHtml(((body.routeOfAdmin as string) || "").trim()),
      productConcept: sanitizeHtml(((body.productConcept as string) || "").trim()),
      targetMarket: sanitizeHtml(((body.targetMarket as string) || "").trim()),
      applicationClass: ((body.applicationClass as string) || "").trim(),
      submissionType: ((body.submissionType as string) || "").trim(),
      notes: sanitizeHtml(((body.notes as string) || "").trim()),
      tags: typeof body.tags === "string" ? body.tags : JSON.stringify(body.tags || []),
      createdById: user.id,
    },
  });

  await logAudit(
    user.id,
    "created",
    "product",
    product.id,
    `${user.name} created product "${product.name}" (stage: ${product.stage})`,
  );

  return NextResponse.json(product, { status: 201 });
}
