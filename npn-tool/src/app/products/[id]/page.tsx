import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import ProductDetailClient from "./ProductDetailClient";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) redirect("/products");

  return (
    <ProductDetailClient
      user={{ id: user.id, name: user.name, role: user.role, username: user.username }}
      product={JSON.parse(JSON.stringify(product))}
    />
  );
}
