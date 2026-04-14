import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { whitelistFields, VAULT_FIELDS } from "@/lib/utils/whitelist";
import { parseJsonBody } from "@/lib/utils/parse-body";
import { handlePrismaError } from "@/lib/errors/handle-prisma";
import { unlink } from "fs/promises";

const VALID_CATEGORIES = [
  "formula", "recipe", "trade_secret", "contract", "financial", "other",
] as const;

const VALID_ACCESS_LEVELS = ["owner_only", "shared", "team"] as const;

/**
 * Check if the current user has access to a vault item.
 * Access is granted if the user is the owner or their ID appears in sharedWith.
 */
function hasAccess(item: { ownerId: string; sharedWith: string }, userId: string): boolean {
  if (item.ownerId === userId) return true;
  try {
    const shared: string[] = JSON.parse(item.sharedWith);
    return Array.isArray(shared) && shared.includes(userId);
  } catch {
    return false;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  try {
    const item = await prisma.secureVaultItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Vault item not found" }, { status: 404 });
    }

    // Access check: owner or sharedWith only
    if (!hasAccess(item, user.id)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Increment access count and record who accessed it
    const updated = await prisma.secureVaultItem.update({
      where: { id },
      data: {
        accessCount: { increment: 1 },
        lastAccessedAt: new Date().toISOString(),
        lastAccessedBy: user.id,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return handlePrismaError(err, "get vault item");
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  const parsed = await parseJsonBody(req);
  if (parsed.error) return parsed.error;
  const raw = parsed.data as Record<string, unknown>;

  // Whitelist allowed fields
  const data = whitelistFields(raw, VAULT_FIELDS);

  // Validate category if provided
  if (data.category !== undefined) {
    if (!VALID_CATEGORIES.includes(data.category as (typeof VALID_CATEGORIES)[number])) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 },
      );
    }
  }

  // Validate accessLevel if provided
  if (data.accessLevel !== undefined) {
    if (!VALID_ACCESS_LEVELS.includes(data.accessLevel as (typeof VALID_ACCESS_LEVELS)[number])) {
      return NextResponse.json(
        { error: `Invalid accessLevel. Must be one of: ${VALID_ACCESS_LEVELS.join(", ")}` },
        { status: 400 },
      );
    }
  }

  // Validate sharedWith if provided
  if (data.sharedWith !== undefined) {
    if (typeof data.sharedWith === "string") {
      try {
        const arr = JSON.parse(data.sharedWith as string);
        if (!Array.isArray(arr) || !arr.every((s: unknown) => typeof s === "string")) {
          return NextResponse.json(
            { error: "sharedWith must be a JSON array of user ID strings" },
            { status: 400 },
          );
        }
      } catch {
        return NextResponse.json(
          { error: "sharedWith must be valid JSON" },
          { status: 400 },
        );
      }
    } else if (Array.isArray(data.sharedWith)) {
      // Accept array directly, serialize for storage
      data.sharedWith = JSON.stringify(data.sharedWith);
    } else {
      return NextResponse.json(
        { error: "sharedWith must be a JSON array of user ID strings" },
        { status: 400 },
      );
    }
  }

  try {
    const existing = await prisma.secureVaultItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Vault item not found" }, { status: 404 });
    }

    // Only the owner can update
    if (existing.ownerId !== user.id) {
      return NextResponse.json({ error: "Only the owner can update this vault item" }, { status: 403 });
    }

    const updated = await prisma.secureVaultItem.update({
      where: { id },
      data: data as Record<string, unknown>,
    });

    await logAudit(
      user.id,
      "updated",
      "vault_item",
      id,
      `${user.name} updated vault item "${updated.title}"`,
      data as Record<string, unknown>,
    );

    return NextResponse.json(updated);
  } catch (err) {
    return handlePrismaError(err, "update vault item");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  try {
    const item = await prisma.secureVaultItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Vault item not found" }, { status: 404 });
    }

    // Only the owner can delete
    if (item.ownerId !== user.id) {
      return NextResponse.json({ error: "Only the owner can delete this vault item" }, { status: 403 });
    }

    // Delete associated file from disk if it exists
    if (item.filePath) {
      try {
        await unlink(item.filePath);
      } catch (fsErr) {
        // Log but don't fail the delete — file may already be missing
        console.error(`[vault/delete] Failed to delete file at ${item.filePath}:`, fsErr);
      }
    }

    await prisma.secureVaultItem.delete({ where: { id } });

    await logAudit(
      user.id,
      "deleted",
      "vault_item",
      id,
      `${user.name} deleted vault item "${item.title}" (category: ${item.category})`,
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return handlePrismaError(err, "delete vault item");
  }
}
