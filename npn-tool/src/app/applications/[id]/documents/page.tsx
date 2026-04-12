import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import DocumentsClient from "./DocumentsClient";

export default async function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      medicinalIngredients: true,
      documents: { orderBy: { documentType: "asc" } },
    },
  });

  if (!application) redirect("/dashboard");

  return <DocumentsClient user={user} application={application as never} />;
}
