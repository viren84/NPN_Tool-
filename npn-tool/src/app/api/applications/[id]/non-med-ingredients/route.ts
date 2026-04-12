import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/db/audit";
import { sanitizeHtml } from "@/lib/utils/sanitize";

const DOSAGE_FORM_PRESETS: Record<string, Array<{ ingredientName: string; purpose: string }>> = {
  Tablet: [
    { ingredientName: "Microcrystalline cellulose", purpose: "Binder/Filler" },
    { ingredientName: "Croscarmellose sodium", purpose: "Disintegrant" },
    { ingredientName: "Magnesium stearate", purpose: "Lubricant" },
    { ingredientName: "Hypromellose", purpose: "Coating" },
    { ingredientName: "Silicon dioxide", purpose: "Anti-caking" },
  ],
  Capsule: [
    { ingredientName: "Hypromellose capsule shell", purpose: "Capsule shell" },
    { ingredientName: "Silicon dioxide", purpose: "Anti-caking" },
    { ingredientName: "Magnesium stearate", purpose: "Lubricant" },
    { ingredientName: "Microcrystalline cellulose", purpose: "Filler" },
  ],
  Softgel: [
    { ingredientName: "Gelatin", purpose: "Softgel shell" },
    { ingredientName: "Glycerin", purpose: "Plasticizer" },
    { ingredientName: "Purified water", purpose: "Softgel shell" },
    { ingredientName: "Soybean oil", purpose: "Carrier" },
  ],
  Liquid: [
    { ingredientName: "Purified water", purpose: "Vehicle" },
    { ingredientName: "Glycerin", purpose: "Humectant" },
    { ingredientName: "Citric acid", purpose: "pH adjuster" },
    { ingredientName: "Natural flavour", purpose: "Flavouring" },
    { ingredientName: "Potassium sorbate", purpose: "Preservative" },
  ],
  Powder: [
    { ingredientName: "Silicon dioxide", purpose: "Anti-caking" },
    { ingredientName: "Natural flavour", purpose: "Flavouring" },
    { ingredientName: "Stevia rebaudiana leaf extract", purpose: "Sweetener" },
  ],
  "Chewable Tablet": [
    { ingredientName: "Xylitol", purpose: "Sweetener" },
    { ingredientName: "Natural flavour", purpose: "Flavouring" },
    { ingredientName: "Citric acid", purpose: "Flavour enhancer" },
    { ingredientName: "Magnesium stearate", purpose: "Lubricant" },
    { ingredientName: "Stearic acid", purpose: "Lubricant" },
  ],
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const items = await prisma.nonMedicinalIngredient.findMany({
    where: { applicationId: id },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "viewer") return NextResponse.json({ error: "Viewers cannot edit" }, { status: 403 });

  const { id } = await params;
  const data = await req.json();

  // Handle presets
  if (data.loadPreset) {
    const presets = DOSAGE_FORM_PRESETS[data.loadPreset] || [];
    const existing = await prisma.nonMedicinalIngredient.findMany({
      where: { applicationId: id },
      orderBy: { sortOrder: "desc" },
      take: 1,
    });
    let order = existing.length > 0 ? existing[0].sortOrder + 1 : 0;

    const created = [];
    for (const preset of presets) {
      // Skip if already exists
      const dup = await prisma.nonMedicinalIngredient.findFirst({
        where: { applicationId: id, ingredientName: preset.ingredientName },
      });
      if (dup) continue;

      const item = await prisma.nonMedicinalIngredient.create({
        data: {
          applicationId: id,
          sortOrder: order++,
          ingredientName: preset.ingredientName,
          purpose: preset.purpose,
          animalTissueFlag: preset.ingredientName === "Gelatin",
        },
      });
      created.push(item);
    }

    await logAudit(user.id, "created", "non_med_ingredient", id,
      `${user.name} loaded ${data.loadPreset} presets (${created.length} added)`);

    return NextResponse.json(created, { status: 201 });
  }

  // Add single
  const existing = await prisma.nonMedicinalIngredient.findMany({
    where: { applicationId: id },
    orderBy: { sortOrder: "desc" },
    take: 1,
  });
  const nextOrder = existing.length > 0 ? existing[0].sortOrder + 1 : 0;

  const item = await prisma.nonMedicinalIngredient.create({
    data: {
      applicationId: id,
      sortOrder: nextOrder,
      ingredientName: sanitizeHtml(data.ingredientName || ""),
      purpose: data.purpose || "",
      quantity: data.quantity || null,
      unit: data.unit || "",
      animalTissueFlag: data.animalTissueFlag || false,
      nanomaterialFlag: data.nanomaterialFlag || false,
    },
  });

  await logAudit(user.id, "created", "non_med_ingredient", item.id,
    `${user.name} added non-med ingredient "${item.ingredientName}"`);

  return NextResponse.json(item, { status: 201 });
}
