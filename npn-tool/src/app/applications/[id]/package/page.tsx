import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import PackageClient from "./PackageClient";

export default async function PackagePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      documents: true,
      medicinalIngredients: true,
      createdBy: { select: { name: true } },
    },
  });

  if (!application) redirect("/dashboard");

  return <PackageClient user={user} application={application as never} />;
}
