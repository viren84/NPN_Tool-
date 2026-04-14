import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import ProductPipelineClient from "./ProductPipelineClient";

export default async function ProductsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const products = await prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <ProductPipelineClient
      user={{ name: user.name, role: user.role }}
      initialProducts={JSON.parse(JSON.stringify(products))}
    />
  );
}
