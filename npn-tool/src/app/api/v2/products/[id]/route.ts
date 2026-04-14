import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/v2/products/[id] — Single product detail for external systems (Tool 2)
 * Returns all fields for the product.
 * Requires X-API-Key header matching AppSettings.claudeApiKey
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // API key authentication
  const apiKey = req.headers.get("X-API-Key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing X-API-Key header" }, { status: 401 });
  }

  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  if (!settings || !settings.claudeApiKey || apiKey !== settings.claudeApiKey) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const { id } = await params;

  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}
