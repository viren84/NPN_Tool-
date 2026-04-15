import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { parseJsonBody } from "@/lib/utils/parse-body";
import { whitelistFields, CONDITION_STACK_FIELDS } from "@/lib/utils/whitelist";
import { handlePrismaError } from "@/lib/errors/handle-prisma";
import { validateConditionStack } from "@/lib/ai/condition-research";

/**
 * GET /api/products/[id]/condition-stacks/[stackId]
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; stackId: string }> },
) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const { id, stackId } = await params;

  try {
    const stack = await prisma.conditionStack.findFirst({
      where: { id: stackId, productId: id },
    });

    if (!stack) {
      return NextResponse.json({ error: "Condition stack not found" }, { status: 404 });
    }

    return NextResponse.json(stack);
  } catch (err) {
    return handlePrismaError(err, "get condition stack");
  }
}

/**
 * PUT /api/products/[id]/condition-stacks/[stackId]
 * Update a stack. If body includes { validate: true }, runs AI compliance check.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stackId: string }> },
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id, stackId } = await params;

  const parsed = await parseJsonBody(req);
  if (parsed.error) return parsed.error;
  const raw = parsed.data as Record<string, unknown>;

  try {
    const existing = await prisma.conditionStack.findFirst({
      where: { id: stackId, productId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Condition stack not found" }, { status: 404 });
    }

    // Handle AI validation request
    if (raw.validate === true) {
      const molecules: Array<{ name: string; dose: number; unit: string }> = [];
      try {
        const parsed = JSON.parse(existing.moleculesJson || "[]");
        for (const m of parsed) {
          molecules.push({ name: m.name, dose: m.dose || 0, unit: m.unit || "mg" });
        }
      } catch { /* empty */ }

      if (molecules.length === 0) {
        return NextResponse.json({ error: "No molecules in stack to validate" }, { status: 400 });
      }

      const validation = await validateConditionStack(
        existing.stackName,
        molecules,
        existing.condition,
      );

      // Update stack with validation results
      const updated = await prisma.conditionStack.update({
        where: { id: stackId },
        data: {
          applicationClass: validation.applicationClass,
          availableClaimsJson: JSON.stringify(validation.unlockedClaims || []),
          complianceNotes: validation.classReasoning,
        },
      });

      // Log AI session
      await prisma.aIResearchSession.create({
        data: {
          productId: id,
          researchType: "stack_validation",
          promptSummary: `Validated stack "${existing.stackName}" for ${existing.condition}`,
          responseJson: JSON.stringify(validation),
          status: "completed",
          createdById: user.id,
        },
      });

      return NextResponse.json({ stack: updated, validation });
    }

    // Regular update
    const data = whitelistFields(raw, CONDITION_STACK_FIELDS);

    // Handle JSON array fields
    if (raw.moleculesJson !== undefined) {
      (data as Record<string, unknown>).moleculesJson = typeof raw.moleculesJson === "string"
        ? raw.moleculesJson : JSON.stringify(raw.moleculesJson);
    }
    if (raw.availableClaimsJson !== undefined) {
      (data as Record<string, unknown>).availableClaimsJson = typeof raw.availableClaimsJson === "string"
        ? raw.availableClaimsJson : JSON.stringify(raw.availableClaimsJson);
    }
    if (raw.consumerPainPoints !== undefined) {
      (data as Record<string, unknown>).consumerPainPoints = typeof raw.consumerPainPoints === "string"
        ? raw.consumerPainPoints : JSON.stringify(raw.consumerPainPoints);
    }

    const updated = await prisma.conditionStack.update({
      where: { id: stackId },
      data: data as Record<string, unknown>,
    });

    await logAudit(
      user.id,
      "updated",
      "condition_stack",
      stackId,
      `${user.name} updated stack "${updated.stackName}"`,
      data as Record<string, unknown>,
    );

    return NextResponse.json(updated);
  } catch (err) {
    return handlePrismaError(err, "update condition stack");
  }
}

/**
 * DELETE /api/products/[id]/condition-stacks/[stackId]
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; stackId: string }> },
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id, stackId } = await params;

  try {
    const stack = await prisma.conditionStack.findFirst({
      where: { id: stackId, productId: id },
    });

    if (!stack) {
      return NextResponse.json({ error: "Condition stack not found" }, { status: 404 });
    }

    await prisma.conditionStack.delete({ where: { id: stackId } });

    await logAudit(
      user.id,
      "deleted",
      "condition_stack",
      stackId,
      `${user.name} deleted stack "${stack.stackName}" from condition "${stack.condition}"`,
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return handlePrismaError(err, "delete condition stack");
  }
}
