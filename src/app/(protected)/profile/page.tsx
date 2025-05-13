import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/actions/profile.actions";
import { ProfileClientPage } from "./profile-client-page";
import { getProfileModes } from "@/lib/actions/profile-modes";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: { section?: string };
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [profile, modes] = await Promise.all([
    getProfile(session.user.id),
    getProfileModes(session.user.id),
  ]);

  if (!profile) {
    redirect("/mode-select");
  }

  return (
    <ProfileClientPage 
      profile={profile} 
      initialActiveSection={searchParams?.section} 
      initialModes={modes || {
        datingEnabled: true,
        friendsEnabled: false,
        datingProfileCompleted: true,
        friendsProfileCompleted: false,
      }}
    />
  );
}
