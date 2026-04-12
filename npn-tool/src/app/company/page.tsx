import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import CompanyProfileClient from "./CompanyProfileClient";

export default async function CompanyPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  let profile = await prisma.companyProfile.findFirst();
  if (!profile) {
    profile = await prisma.companyProfile.create({ data: {} });
  }

  const facilities = await prisma.facility.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  const team = await prisma.teamMember.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });

  return <CompanyProfileClient
    user={user}
    profile={JSON.parse(JSON.stringify(profile))}
    facilities={JSON.parse(JSON.stringify(facilities))}
    team={JSON.parse(JSON.stringify(team))}
  />;
}
