import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { checkProfileCompletion } from "@/lib/checks";
import { getProfile, ProfileFormData } from "@/lib/actions/profile.actions";
import { ProfileClientPage } from "./profile-client-page"; // Import the new client component
import { Suspense } from "react";

// Loading component for Suspense fallback
function ProfileLoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="animate-spin text-4xl mb-4">💫</div>
        <p className="text-muted-foreground">Loading your profile...</p>
      </div>
    </div>
  );
}

interface ProfilePageProps {
  searchParams: { section?: string };
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const profileCheck = await checkProfileCompletion();
  if (!profileCheck.hasProfile) {
    redirect("/profile/setup");
  }

  // In Next.js 15, we must await searchParams before accessing its properties
  const currentSearchParams = await searchParams;
  const activeSection = currentSearchParams?.section || null;

  const profile = await getProfile();
  if (!profile) {
    console.error("ProfilePage: Profile data is null after checks passed.");
    redirect("/profile/setup"); // Or show a dedicated error page
  }

  return (
    <Suspense fallback={<ProfileLoadingSkeleton />}>
      <ProfileClientPage 
        profile={profile as ProfileFormData} 
        initialActiveSection={activeSection}
      />
    </Suspense>
  );
}
