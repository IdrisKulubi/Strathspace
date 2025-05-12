import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ModeSelectClient } from "@/components/friends/mode-select-client";

export default async function ModeSelectPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return <ModeSelectClient />;
} 