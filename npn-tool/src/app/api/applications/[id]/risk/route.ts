import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { sanitizeHtml } from "@/lib/utils/sanitize";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const risks = await prisma.riskInfo.findMany({
    where: { applicationId: id },
    orderBy: [{ riskType: "asc" }, { sortOrder: "asc" }],
  });
  return NextResponse.json(risks);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await req.json();

  // Handle bulk add
  if (Array.isArray(data)) {
    const created = [];
    let order = await prisma.riskInfo.count({ where: { applicationId: id } });
    for (const risk of data) {
      // Skip duplicates
      const dup = await prisma.riskInfo.findFirst({
        where: { applicationId: id, textEn: risk.textEn, riskType: risk.riskType },
      });
      if (dup) continue;

      const item = await prisma.riskInfo.create({
        data: {
          applicationId: id,
          sortOrder: order++,
          riskType: risk.riskType,
          textEn: sanitizeHtml(risk.textEn),
          textFr: risk.textFr || "",
          fromMonograph: risk.fromMonograph || false,
          monographName: risk.monographName || "",
        },
      });
      created.push(item);
    }
    return NextResponse.json(created, { status: 201 });
  }

  // Single
  const count = await prisma.riskInfo.count({ where: { applicationId: id } });
  const risk = await prisma.riskInfo.create({
    data: {
      applicationId: id,
      sortOrder: count,
      riskType: data.riskType,
      textEn: sanitizeHtml(data.textEn),
      textFr: data.textFr || "",
      fromMonograph: data.fromMonograph || false,
      monographName: data.monographName || "",
    },
  });
  return NextResponse.json(risk, { status: 201 });
}
