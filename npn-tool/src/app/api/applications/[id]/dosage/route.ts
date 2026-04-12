import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const groups = await prisma.dosageGroup.findMany({
    where: { applicationId: id },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await req.json();
  const count = await prisma.dosageGroup.count({ where: { applicationId: id } });

  const group = await prisma.dosageGroup.create({
    data: {
      applicationId: id,
      sortOrder: count,
      population: data.population || "adults",
      ageRangeMin: data.ageRangeMin || null,
      ageRangeMax: data.ageRangeMax || null,
      minDose: data.minDose || null,
      maxDose: data.maxDose || null,
      doseUnit: data.doseUnit || "",
      frequency: data.frequency || "",
      directions: data.directions || "",
      withFood: data.withFood || false,
    },
  });
  return NextResponse.json(group, { status: 201 });
}
