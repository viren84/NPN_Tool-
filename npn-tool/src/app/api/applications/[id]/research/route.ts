import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { researchIngredients } from "@/lib/ai/ingredient-research";
import { logAudit } from "@/lib/db/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const application = await prisma.application.findUnique({ where: { id } });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const result = await researchIngredients(
      application.productConcept,
      application.dosageForm
    );

    // Update application with recommended class
    await prisma.application.update({
      where: { id },
      data: {
        applicationClass: result.recommendedClass,
        classReasoning: result.classReasoning,
        status: "draft",
      },
    });

    await logAudit(
      user.id,
      "created",
      "application",
      id,
      `AI researched ingredients for "${application.productName}" — recommended Class ${result.recommendedClass}`
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Research failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
