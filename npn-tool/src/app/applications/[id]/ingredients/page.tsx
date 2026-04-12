import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import IngredientsClient from "./IngredientsClient";

export default async function IngredientsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;
  const application = await prisma.application.findUnique({
    where: { id },
    include: { medicinalIngredients: true, nonMedicinalIngredients: true },
  });

  if (!application) redirect("/dashboard");

  return <IngredientsClient user={user} application={application as never} />;
}
