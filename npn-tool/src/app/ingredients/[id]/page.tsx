import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import IngredientDetailClient from "./IngredientDetailClient";

export default async function IngredientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;
  const ingredient = await prisma.ingredient.findUnique({ where: { id } });
  if (!ingredient) redirect("/ingredients");

  return (
    <IngredientDetailClient
      user={{ id: user.id, name: user.name, role: user.role, username: user.username }}
      ingredient={JSON.parse(JSON.stringify(ingredient))}
    />
  );
}
