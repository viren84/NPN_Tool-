import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import ApplicationEditor from "./ApplicationEditor";

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      medicinalIngredients: { orderBy: { sortOrder: "asc" } },
      nonMedicinalIngredients: { orderBy: { sortOrder: "asc" } },
      claims: { orderBy: { sortOrder: "asc" } },
      dosageGroups: { orderBy: { sortOrder: "asc" } },
      riskInfos: { orderBy: [{ riskType: "asc" }, { sortOrder: "asc" }] },
      documents: { orderBy: { documentType: "asc" } },
      createdBy: { select: { name: true } },
    },
  });

  if (!application) redirect("/dashboard");

  const company = await prisma.companyProfile.findFirst();

  return (
    <ApplicationEditor
      user={user}
      application={JSON.parse(JSON.stringify(application))}
      company={company ? JSON.parse(JSON.stringify(company)) : null}
    />
  );
}
