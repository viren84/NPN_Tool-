import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/db/audit";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = req.nextUrl;
    const stage = url.searchParams.get("stage") || undefined;
    const priority = url.searchParams.get("priority") || undefined;

    const where: Record<string, string> = {};
    if (stage) where.stage = stage;
    if (priority) where.priority = priority;

    const products = await prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(products);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to list products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const name = (body.name as string)?.trim();
    if (!name) return NextResponse.json({ error: "Product name is required" }, { status: 400 });

    const product = await prisma.product.create({
      data: {
        name,
        brandName: (body.brandName as string || "").trim(),
        stage: body.stage || "research",
        priority: body.priority || "medium",
        dosageForm: (body.dosageForm as string || "").trim(),
        routeOfAdmin: (body.routeOfAdmin as string || "").trim(),
        productConcept: (body.productConcept as string || "").trim(),
        createdById: user.id,
      },
    });

    await logAudit(user.id, "created", "product", product.id, `${user.name} created product "${product.name}"`);
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to create product" }, { status: 500 });
  }
}
