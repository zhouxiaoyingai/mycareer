import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/cloudbase/auth";

export default async function Home() {
  const session = await getCurrentUser();
  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
