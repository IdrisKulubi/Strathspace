import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  getSwipableProfiles,
  getLikedProfiles,
  getLikedByProfiles,
  getAnonymousSwipableProfiles,
} from "@/lib/actions/explore.actions";
import { type Profile } from "@/db/schema";
import { getProfile } from "@/lib/actions/profile.actions";
import { ExploreMobileV2 } from "@/components/explore/mobile/explore-mobile-v2";
import { ExploreDesktop } from "@/components/explore/desktop/explore-desktop";
import { checkProfileCompletion } from "@/lib/checks";
import { prefetchProfileBatch } from "@/lib/actions/image-prefetch";
import { Suspense } from "react";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function markAsRead(matchId: string) {
  "use server";
}

async function ProfilePrefetcher({ profiles }: { profiles: Profile[] }) {
  if (profiles.length > 0) {
    const batchToPreload = profiles.slice(0, 5);
    await prefetchProfileBatch(batchToPreload);
  }
  return null;
}

export default async function MatchesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { hasProfile } = await checkProfileCompletion();
  if (!hasProfile) {
    redirect("/profile/setup");
  }

  const currentUserProfile = await getProfile();

  let profiles;
  if (currentUserProfile?.anonymous) {
    profiles = await getAnonymousSwipableProfiles();
  } else {
    profiles = await getSwipableProfiles();
  }

  const { profiles: likedProfiles } = await getLikedProfiles();
  const { profiles: likedByProfiles } = await getLikedByProfiles();

  return (
    <div className="h-screen w-full overflow-hidden">
      <Suspense fallback={null}>
        <ProfilePrefetcher profiles={profiles as Profile[]} />
      </Suspense>

      {/* Mobile View */}
      <div className="md:hidden h-full">
        <ExploreMobileV2
          currentUser={
            session!.user as {
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

      {/* Desktop View */}
      <div className="hidden md:block h-screen">
        <ExploreDesktop
          initialProfiles={profiles as Profile[]}
          currentUserProfile={currentUserProfile as Profile}
          likedByProfiles={likedByProfiles}
          likedProfiles={likedProfiles}
          currentUser={session!.user as {
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
