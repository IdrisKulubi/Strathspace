import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getProfileModes } from "@/lib/actions/profile-modes";

export default async function FriendsSetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Check if user has already completed friends profile
  const modes = await getProfileModes(session.user.id);
  if (modes?.friendsProfileCompleted) {
    redirect("/explore");
  }

  return <>{children}</>;
} 