import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const VISIBLE_STAGES = ["approved", "active", "production", "launch"];

/**
 * GET /api/v2/products — List products visible to external systems (Tool 2)
 * Returns products with stage in: approved, active, production, launch
 * Requires X-API-Key header matching AppSettings.claudeApiKey
 */
export async function GET(req: NextRequest) {
  // API key authentication
  const apiKey = req.headers.get("X-API-Key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing X-API-Key header" }, { status: 401 });
  }

  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  if (!settings || !settings.claudeApiKey || apiKey !== settings.claudeApiKey) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    where: { stage: { in: VISIBLE_STAGES } },
    select: {
      id: true,
      name: true,
      brandName: true,
      npnNumber: true,
      dosageForm: true,
      routeOfAdmin: true,
      applicationClass: true,
      stage: true,
      ingredientCount: true,
      claimCount: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ products, count: products.length });
}
