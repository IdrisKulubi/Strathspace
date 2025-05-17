"use server";

import { swipes, matches } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/auth";
import db from "@/db/drizzle";
import { recordSwipe } from "./explore.actions";
import { CACHE_KEYS, invalidateCachedData } from "@/lib/constants/cache";

/**
 * Handle liking a profile (swiping right)
 */
export async function handleLike(targetUserId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const result = await recordSwipe(targetUserId, "like");

    // Revalidate both path and tag-based caches
    revalidatePath("/explore");
    revalidatePath("/matches");
    revalidateTag("likes-by-profiles");

    // Invalidate specific cache keys
    if (session?.user?.id) {
      await invalidateCachedData(CACHE_KEYS.MATCHING.LIKED_BY(session.user.id));
      await invalidateCachedData(CACHE_KEYS.MATCHING.LIKED(session.user.id));
    }

    return {
      success: true,
      isMatch: result.isMatch,
      matchedProfile: result.matchedProfile,
    };
  } catch (error) {
    console.error("Error in handleLike:", error);
    throw new Error("Failed to like profile");
  }
}

/**
 * Handle unliking a profile (removing the swipe)
 */
export async function handleUnlike(targetUserId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    // Delete the swipe record
    await db
      .delete(swipes)
      .where(
        and(
          eq(swipes.swiperId, session.user.id),
          eq(swipes.swipedId, targetUserId)
        )
      );

    // Delete any potential match
    await db
      .delete(matches)
      .where(
        or(
          and(
            eq(matches.user1Id, session.user.id),
            eq(matches.user2Id, targetUserId)
          ),
          and(
            eq(matches.user2Id, session.user.id),
            eq(matches.user1Id, targetUserId)
          )
        )
      );

    // Revalidate both path and tag-based caches
    revalidatePath("/explore");
    revalidatePath("/matches");
    revalidateTag("likes-by-profiles");

    // Invalidate specific cache keys
    if (session?.user?.id) {
      await invalidateCachedData(CACHE_KEYS.MATCHING.LIKED_BY(session.user.id));
      await invalidateCachedData(CACHE_KEYS.MATCHING.LIKED(session.user.id));
    }

    return { success: true };
  } catch (error) {
    console.error("Error in handleUnlike:", error);
    throw new Error("Failed to unlike profile");
  }
}

/**
 * Check if current user has liked a profile
 */
export async function hasLiked(targetUserId: string) {
  const session = await auth();
  if (!session?.user?.id) return false;

  try {
    const existingSwipe = await db.query.swipes.findFirst({
      where: and(
        eq(swipes.swiperId, session.user.id),
        eq(swipes.swipedId, targetUserId),
        eq(swipes.isLike, true)
      ),
    });

    return !!existingSwipe;
  } catch (error) {
    console.error("Error in hasLiked:", error);
    return false;
  }
}
