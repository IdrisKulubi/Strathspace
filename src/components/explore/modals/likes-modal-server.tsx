import { getLikedByProfiles } from "@/lib/actions/explore.actions";
import { LikesModal } from "./likes-modal";
import { handleUnlike } from "@/lib/actions/like.actions";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";

// Cache the getLikedByProfiles function with a 60 second revalidation period
const getCachedLikes = unstable_cache(
  async () => {
    const { profiles, error } = await getLikedByProfiles();
    
    if (error) {
      console.error("Error fetching likes:", error);
      return [];
    }
    
    return profiles;
  },
  ["likes-by-profiles"],
  { revalidate: 60 } // 60 seconds cache
);

interface LikesModalServerProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default async function LikesModalServer({
  isOpen,
  onClose,
  onUpdate,
}: LikesModalServerProps) {
  // Only fetch likes data if the modal is open (optimization)
  const likes = isOpen ? await getCachedLikes() : [];

  return (
    <Suspense fallback={<LikesModalSkeleton isOpen={isOpen} onClose={onClose} />}>
      <LikesModal
        isOpen={isOpen}
        onClose={onClose}
        likes={likes}
        onUpdate={onUpdate}
        onUnlike={handleUnlike}
      />
    </Suspense>
  );
}

// Skeleton loader when likes are being fetched
function LikesModalSkeleton({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <LikesModal
      isOpen={isOpen}
      onClose={onClose}
      likes={[]}
      onUpdate={() => {}}
      onUnlike={async () => ({ success: false })}
    />
  );
} 