import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { parseJsonBody } from "@/lib/utils/parse-body";
import { sanitizeHtml } from "@/lib/utils/sanitize";
import { handlePrismaError } from "@/lib/errors/handle-prisma";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const url = req.nextUrl;
  const stage = url.searchParams.get("stage") || undefined;
  const priority = url.searchParams.get("priority") || undefined;

  try {
    const where: Record<string, string> = {};
    if (stage) where.stage = stage;
    if (priority) where.priority = priority;

    const products = await prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(products);
  } catch (err) {
    return handlePrismaError(err, "list products");
  }
}

export async function POST(req: NextRequest) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const parsed = await parseJsonBody(req);
  if (parsed.error) return parsed.error;
  const body = parsed.data as Record<string, unknown>;

  const name = sanitizeHtml(((body.name as string) || "").trim());
  if (!name) return NextResponse.json({ error: "Product name is required" }, { status: 400 });

  try {
    const product = await prisma.product.create({
      data: {
        name,
        brandName: sanitizeHtml(((body.brandName as string) || "").trim()),
        stage: body.stage === "string" ? (body.stage as string) : "research",
        priority: body.priority === "string" ? (body.priority as string) : "medium",
        dosageForm: sanitizeHtml(((body.dosageForm as string) || "").trim()),
        routeOfAdmin: sanitizeHtml(((body.routeOfAdmin as string) || "").trim()),
        productConcept: sanitizeHtml(((body.productConcept as string) || "").trim()),
        targetCondition: sanitizeHtml(((body.targetCondition as string) || "").trim()),
        targetConditionDetail: sanitizeHtml(((body.targetConditionDetail as string) || "").trim()),
        createdById: user.id,
      },
    });

    await logAudit(user.id, "created", "product", product.id, `${user.name} created product "${product.name}"`);
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    return handlePrismaError(err, "create product");
  }
}
