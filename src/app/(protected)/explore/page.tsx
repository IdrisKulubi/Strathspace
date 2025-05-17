import {
  getSwipableProfiles,
  getLikedProfiles,
  getLikedByProfiles,
  getAnonymousSwipableProfiles,
} from "@/lib/actions/explore.actions";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { type Profile } from "@/db/schema";
import { getProfile } from "@/lib/actions/profile.actions";
import { ExploreMobileV2 } from "@/components/explore/mobile/explore-mobile-v2";
import { ExploreDesktop } from "@/components/explore/desktop/explore-desktop";
import { checkProfileCompletion } from "@/lib/checks";
import { prefetchProfileBatch } from "@/lib/actions/image-prefetch";
import { Suspense } from "react";

// Add this server action
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function markAsRead(matchId: string) {
  'use server';
  // Implementation if needed
  // matchId is used by the client components
}

// Prefetch component to optimize loading
async function ProfilePrefetcher({ profiles }: { profiles: Profile[] }) {
  // Prefetch the first batch of profiles (up to 5)
  if (profiles.length > 0) {
    const batchToPreload = profiles.slice(0, 5);
    await prefetchProfileBatch(batchToPreload);
  }
  return null;
}

export default async function ExplorePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Only check if profile exists
  const { hasProfile } = await checkProfileCompletion();

  // Redirect to setup only if no profile exists
  if (!hasProfile) {
    redirect("/profile/setup");
  }

  // Current user's profile
  const currentUserProfile = await getProfile();
  
  // Determine which profile fetching function to use based on anonymous mode
  let profiles;
  if (currentUserProfile?.anonymous) {
    // Use the specialized anonymous filtering logic
    profiles = await getAnonymousSwipableProfiles();
  } else {
    // Use the standard filtering logic for non-anonymous users
    profiles = await getSwipableProfiles();
  }
  
  const { profiles: likedProfiles } = await getLikedProfiles();
  const { profiles: likedByProfiles } = await getLikedByProfiles();

  return (
    <div className="h-screen w-full overflow-hidden">
      {/* Prefetch the first batch of profiles */}
      <Suspense fallback={null}>
        <ProfilePrefetcher profiles={profiles as Profile[]} />
      </Suspense>

      {/* Mobile View - with navbar */}
      <div className="md:hidden h-full">
        <ExploreMobileV2
          currentUser={
            session.user as {
              id: string;
              image: string;
              name: string;
              email: string;
            }
          }
          currentUserProfile={currentUserProfile as Profile}
          initialProfiles={profiles as Profile[]}
          likedByProfiles={likedByProfiles}
          likedProfiles={likedProfiles}
          markAsRead={markAsRead}
        />
      </div>
      
      {/* Desktop View - full height without navbar */}
      <div className="hidden md:block h-screen">
        <ExploreDesktop
          initialProfiles={profiles as Profile[]}
          currentUserProfile={currentUserProfile as Profile}
          likedByProfiles={likedByProfiles}
          likedProfiles={likedProfiles}
          currentUser={session.user as {
            id: string;
            image: string;
            name: string;
            email: string;
          }}
          markAsRead={markAsRead}
        />
      </div>
    </div>
  );
}
