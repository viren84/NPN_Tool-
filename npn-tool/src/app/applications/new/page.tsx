import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import NewApplicationClient from "./NewApplicationClient";

export default async function NewApplicationPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "viewer") redirect("/dashboard");
  return <NewApplicationClient user={user} />;
}
