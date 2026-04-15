import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { handlePrismaError } from "@/lib/errors/handle-prisma";
import { sanitizeHtml } from "@/lib/utils/sanitize";
import path from "path";
import { writeFile, mkdir } from "fs/promises";

const VALID_CATEGORIES = [
  "formula", "recipe", "trade_secret", "contract", "financial", "other",
] as const;

const VALID_ACCESS_LEVELS = ["owner_only", "shared", "team"] as const;

/** Directory where vault files are stored on disk */
const VAULT_DIR = path.join(process.cwd(), "uploads", "vault");

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const url = req.nextUrl;
  const category = url.searchParams.get("category");

  try {
    // Fetch all items where user is owner OR is in sharedWith.
    // Because sharedWith is stored as a JSON string in SQLite, we first
    // query broadly and then filter in application code to guarantee
    // correctness (SQLite has no native JSON array containment operator).
    const allItems = await prisma.secureVaultItem.findMany({
      orderBy: { updatedAt: "desc" },
      ...(category ? { where: { category } } : {}),
    });

    const visible = allItems.filter((item) => {
      if (item.ownerId === user.id) return true;
      try {
        const shared: string[] = JSON.parse(item.sharedWith);
        return Array.isArray(shared) && shared.includes(user.id);
      } catch {
        return false;
      }
    });

    return NextResponse.json(visible);
  } catch (err) {
    return handlePrismaError(err, "list vault items");
  }
}

export async function POST(req: NextRequest) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  try {
    const formData = await req.formData();

    const title = formData.get("title");
    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const category = (formData.get("category") as string) || "formula";
    if (!VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 },
      );
    }

    const accessLevel = (formData.get("accessLevel") as string) || "owner_only";
    if (!VALID_ACCESS_LEVELS.includes(accessLevel as (typeof VALID_ACCESS_LEVELS)[number])) {
      return NextResponse.json(
        { error: `Invalid accessLevel. Must be one of: ${VALID_ACCESS_LEVELS.join(", ")}` },
        { status: 400 },
      );
    }

    const description = (formData.get("description") as string) || "";
    const companyId = (formData.get("companyId") as string) || "";
    const sharedWithRaw = (formData.get("sharedWith") as string) || "[]";

    // Validate sharedWith is a valid JSON array of strings
    let sharedWith: string[];
    try {
      sharedWith = JSON.parse(sharedWithRaw);
      if (!Array.isArray(sharedWith) || !sharedWith.every((s) => typeof s === "string")) {
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

    // Handle file upload (optional)
    let filePath = "";
    let fileName = "";
    let fileSize = 0;

    const file = formData.get("file");
    if (file && file instanceof File && file.size > 0) {
      // Validate file size (50 MB max)
      const MAX_FILE_SIZE = 50 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "File size exceeds 50 MB limit" },
          { status: 400 },
        );
      }

      fileName = file.name;
      fileSize = file.size;

      // Ensure vault directory exists
      await mkdir(VAULT_DIR, { recursive: true });

      // Generate unique file name to avoid collisions
      const uniquePrefix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storedName = `${uniquePrefix}_${safeName}`;
      filePath = path.join(VAULT_DIR, storedName);

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);
    }

    const vaultItem = await prisma.secureVaultItem.create({
      data: {
        title: sanitizeHtml(title.trim()),
        category,
        description: sanitizeHtml(description.trim()),
        companyId: companyId.trim(),
        filePath,
        fileName,
        fileSize,
        encrypted: false,
        ownerId: user.id,
        sharedWith: JSON.stringify(sharedWith),
        accessLevel,
      },
    });

    await logAudit(
      user.id,
      "created",
      "vault_item",
      vaultItem.id,
      `${user.name} created vault item "${vaultItem.title}" (${category})`,
    );

    return NextResponse.json(vaultItem, { status: 201 });
  } catch (err) {
    return handlePrismaError(err, "create vault item");
  }
}
