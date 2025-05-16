"use server";

import db from "@/db/drizzle";
import { eq, and, not, isNull, or, sql, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { Profile } from "@/db/schema";
import { profiles } from "@/db/schema";
import { matches, swipes, users } from "@/db/schema";
import { setCachedData, getCachedData } from "@/lib/utils/redis-helpers";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type SwipeResult =
  | {
      success: boolean;
      error: string;
      isMatch?: undefined;
      matchedProfile?: undefined;
    }
  | {
      success: boolean;
      isMatch: boolean;
      error?: undefined;
      matchedProfile?: Profile;
    };

const CACHE_KEYS = {
  SWIPABLE_PROFILES: (userId: string): string => `swipable:${userId}`,
  LIKED_PROFILES: (userId: string): string => `liked:${userId}`,
  LIKED_BY_PROFILES: (userId: string): string => `liked_by:${userId}`,
};

export async function getSwipableProfiles() {
  const session = await auth();
  if (!session?.user?.id) return [];

  try {
    // Check cache with proper handling
    const cached = await getCachedData<Profile[]>(
      CACHE_KEYS.SWIPABLE_PROFILES(session.user.id)
    );
    if (cached) return cached;

    // First, get the current user's profile to know their gender
    const currentUserProfile = await db
      .select({
        gender: profiles.gender,
      })
      .from(profiles)
      .where(eq(profiles.userId, session.user.id))
      .limit(1);

    if (!currentUserProfile.length || !currentUserProfile[0].gender) {
      return []; // Return empty if user hasn't set their gender
    }

    const userGender = currentUserProfile[0].gender;
    // Determine gender filter conditions based on user's gender
    const whereConditions = [
      not(eq(profiles.userId, session.user.id)),
      eq(profiles.isVisible, true),
      eq(profiles.profileCompleted, true),
      not(isNull(profiles.firstName)),
      not(isNull(profiles.lastName)),
    ];

    // Only apply gender filter for binary genders (male/female)
    if (userGender === "male") {
      whereConditions.push(eq(profiles.gender, "female"));
    } else if (userGender === "female") {
      whereConditions.push(eq(profiles.gender, "male"));
    }
    // For non-binary and other genders, show all profiles (no gender filter)

    const results = await db
      .select({
        id: profiles.id,
        userId: profiles.userId,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        bio: profiles.bio,
        age: profiles.age,
        gender: profiles.gender,
        interests: profiles.interests,
        photos: profiles.photos,
        course: profiles.course,
        yearOfStudy: profiles.yearOfStudy,
        profilePhoto: profiles.profilePhoto,
        phoneNumber: profiles.phoneNumber,
        lastActive: profiles.lastActive,
        isMatch: matches.id,
        isVisible: profiles.isVisible,
        isComplete: profiles.isComplete,
        profileCompleted: profiles.profileCompleted,
        lookingFor: profiles.lookingFor,
      })
      .from(profiles)
      .leftJoin(
        matches,
        and(
          or(
            and(
              eq(matches.user1Id, session.user.id),
              eq(matches.user2Id, profiles.userId)
            ),
            and(
              eq(matches.user2Id, session.user.id),
              eq(matches.user1Id, profiles.userId)
            )
          )
        )
      )
      .where(and(...whereConditions))
      .orderBy(sql`RANDOM()`)
      .limit(200);


    // Format the profiles before caching
    const formattedProfiles = results.map((profile) => ({
      ...profile,
      isMatch: !!profile.isMatch,
    }));

    // Cache with proper serialization - increased TTL to 5 minutes for better performance
    await setCachedData(
      CACHE_KEYS.SWIPABLE_PROFILES(session.user.id),
      formattedProfiles,
      300 // 5 minute TTL
    );

    // Trigger prefetching of profile images for the first few profiles
    try {
      const { prefetchProfileBatch } = await import("@/lib/actions/image-prefetch");
      // Prefetch the first 5 profiles
      const batchToPreload = formattedProfiles.slice(0, 5);
      prefetchProfileBatch(batchToPreload).catch(error => 
        console.error("Failed to prefetch initial profile batch:", error)
      );
    } catch (error) {
      // Non-critical error, just log it
      console.error("Failed to import prefetch module:", error);
    }

    return formattedProfiles;
  } catch (error) {
    console.error("Error fetching swipable profiles:", error);
    return [];
  }
}

export async function recordSwipe(
  profileId: string,
  type: "like" | "pass"
): Promise<{
  success: boolean;
  error?: string;
  isMatch?: boolean;
  matchedProfile?: Profile;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Insert the current user's swipe record first
    await db.insert(swipes).values({
      swiperId: session.user.id,
      swipedId: profileId,
      isLike: type === "like",
      createdAt: new Date(),
    });

    // If it's a like, check for a mutual like (i.e. the other user liked you already)
    if (type === "like") {
      const mutualLike = await db
        .select()
        .from(swipes)
        .where(
          and(
            eq(swipes.swiperId, profileId), // other user's swipe record
            eq(swipes.swipedId, session.user.id),
            eq(swipes.isLike, true)
          )
        )
        .limit(1);

      if (mutualLike.length > 0) {
        // Create a match only if a mutual like exists.
        const matchId = crypto.randomUUID();
        await db.insert(matches).values({
          id: matchId,
          user1Id: session.user.id,
          user2Id: profileId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const matchedProfile = await db
          .select()
          .from(profiles)
          .where(eq(profiles.userId, profileId));

        return {
          success: true,
          isMatch: true,
          matchedProfile: matchedProfile[0],
        };
      }
    }

    return { success: true, isMatch: false };
  } catch (error) {
    console.error("Error recording swipe:", error);
    return { success: false, error: "Failed to record swipe" };
  }
}

export async function undoLastSwipe(swipedId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    // Delete the swipe directly
    await db
      .delete(swipes)
      .where(
        and(
          eq(swipes.swiperId, session.user.id),
          eq(swipes.swipedId, swipedId),
          eq(swipes.isLike, true)
        )
      );

    // Delete any potential match
    await db
      .delete(matches)
      .where(
        or(
          and(
            eq(matches.user1Id, session.user.id),
            eq(matches.user2Id, swipedId)
          ),
          and(
            eq(matches.user2Id, session.user.id),
            eq(matches.user1Id, swipedId)
          )
        )
      );

    return { success: true };
  } catch (error) {
    console.error("Error in undoLastSwipe:", error);
    return { error: "Failed to undo last swipe" };
  }
}

export async function getLikedProfiles() {
  const session = await auth();
  if (!session?.user?.id) return { profiles: [], error: "Unauthorized" };

  try {
    // Use helper for cache retrieval
    const cached = await getCachedData<Profile[]>(
      CACHE_KEYS.LIKED_PROFILES(session.user.id)
    );
    if (cached) return { profiles: cached, error: null };

    // Optimized query to get profiles liked by the user with match status
    const results = await db
      .select({
        profile: profiles,
        swipeId: swipes.id,
        swipedAt: swipes.createdAt,
        matchId: matches.id,
      })
      .from(swipes)
      .innerJoin(
        profiles,
        and(eq(profiles.userId, swipes.swipedId), eq(profiles.isVisible, true))
      )
      .leftJoin(
        matches,
        or(
          and(
            eq(matches.user1Id, session.user.id),
            eq(matches.user2Id, profiles.userId)
          ),
          and(
            eq(matches.user2Id, session.user.id),
            eq(matches.user1Id, profiles.userId)
          )
        )
      )
      .where(and(eq(swipes.swiperId, session.user.id), eq(swipes.isLike, true)))
      .orderBy(desc(swipes.createdAt));

    // Use helper for cache storage
    await setCachedData(
      CACHE_KEYS.LIKED_PROFILES(session.user.id),
      results.map((r) => ({
        ...r.profile,
        swipedAt: r.swipedAt,
        isMatch: !!r.matchId,
      })),
      60
    );

    return {
      profiles: results.map((r) => ({
        ...r.profile,
        swipedAt: r.swipedAt,
        isMatch: !!r.matchId,
      })),
      error: null,
    };
  } catch (error) {
    console.error("Error fetching liked profiles:", error);
    return { profiles: [], error: "Failed to fetch profiles" };
  }
}

export async function getLikedByProfiles() {
  const session = await auth();
  if (!session?.user?.id) {
    return { profiles: [], error: "Unauthorized" };
  }

  try {
    // Check cache with proper handling and longer TTL
    const cached = await getCachedData<Profile[]>(
      CACHE_KEYS.LIKED_BY_PROFILES(session.user.id)
    );
    if (cached) {
      return { profiles: cached, error: null };
    }

    // Get profiles that have liked the current user with match status
    const results = await db
      .select({
        profile: profiles,
        swipeId: swipes.id,
        swipedAt: swipes.createdAt,
        matchId: matches.id,
      })
      .from(swipes)
      .innerJoin(profiles, eq(profiles.userId, swipes.swiperId))
      .leftJoin(
        matches,
        or(
          and(
            eq(matches.user1Id, session.user.id),
            eq(matches.user2Id, swipes.swiperId)
          ),
          and(
            eq(matches.user2Id, session.user.id),
            eq(matches.user1Id, swipes.swiperId)
          )
        )
      )
      .where(
        and(
          eq(swipes.swipedId, session.user.id),
          eq(swipes.isLike, true),
          eq(profiles.isVisible, true)
        )
      )
      .orderBy(desc(swipes.createdAt));

    const formattedProfiles = results.map((r) => ({
      ...r.profile,
      swipedAt: r.swipedAt,
      isMatch: !!r.matchId,
    }));

    // Cache with longer TTL (300 seconds = 5 minutes) for better performance
    await setCachedData(
      CACHE_KEYS.LIKED_BY_PROFILES(session.user.id),
      formattedProfiles,
      300 // 5 minute TTL
    );

    return {
      profiles: formattedProfiles,
      error: null,
    };
  } catch (error) {
    console.error("Error fetching liked by profiles:", error);
    return { profiles: [], error: "Failed to fetch profiles" };
  }
}

export async function getTotalSwipes() {
  try {
    const result = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(swipes);

    return { success: true, count: result[0].count };
  } catch (error) {
    console.error("Error getting total swipes:", error);
    return { success: false, count: 0 };
  }
}

export async function getMatches() {
  const session = await auth();
  if (!session?.user?.id) return { matches: [], error: "Unauthorized" };

  try {
    // Combine the best of both approaches with proper distinct selection
    const matches = await db.query.matches.findMany({
      where: (matches, { or, eq }) => or(
        eq(matches.user1Id, session.user.id),
        eq(matches.user2Id, session.user.id)
      ),
      with: {
        user1: {
          columns: { id: true },
          with: {
            profile: {
              columns: {
                userId: true,
                firstName: true,
                lastName: true,
                course: true,
                yearOfStudy: true,
                bio: true,
                interests: true,
                profilePhoto: true
              }
            }
          }
        },
        user2: {
          columns: { id: true },
          with: {
            profile: {
              columns: {
                userId: true,
                firstName: true,
                lastName: true,
                course: true,
                yearOfStudy: true,
                bio: true,
                interests: true,
                profilePhoto: true
              }
            }
          }
        }
      },
      orderBy: (matches, { desc }) => [desc(matches.createdAt)]
    });

    // Deduplicate logic using Map
    const uniqueMatches = new Map<string, typeof matches[number]>();
    for (const match of matches) {
      const partnerId = match.user1.id === session.user.id ? match.user2.profile.userId : match.user1.profile.userId;
      if (!uniqueMatches.has(partnerId)) {
        uniqueMatches.set(partnerId, match);
      }
    }

    return {
      matches: Array.from(uniqueMatches.values()).map(match => {
        const partner = match.user1.id === session.user.id ? match.user2 : match.user1;
        return {
          ...partner.profile,
          userId: partner.id,
          matchId: match.id,
          matchedAt: match.createdAt
        };
      }),
      error: null
    };
  } catch (error) {
    console.error("Error fetching matches:", error);
    return { matches: [], error: "Failed to fetch matches" };
  }
}

export async function getLikesForProfile(profileName: string) {
  console.log("Starting getLikesForProfile for:", profileName);

  try {
    const profile = await db
      .select()
      .from(profiles)
      .where(
        and(eq(profiles.firstName, "Imani"), eq(profiles.lastName, "Wachira"))
      )
      .limit(1);

    if (!profile.length) {
      return { error: "Profile not found", likes: [] };
    }

    const likes = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        likedAt: swipes.createdAt,
      })
      .from(swipes)
      .innerJoin(users, eq(users.id, swipes.swiperId))
      .where(
        and(eq(swipes.swipedId, profile[0].userId), eq(swipes.isLike, true))
      )
      .orderBy(desc(swipes.createdAt));

    return {
      success: true,
      likes,
      profile: profile[0],
    };
  } catch (error) {
    console.error("Error in getLikesForProfile:", error);
    return { error: "Failed to fetch likes", likes: [] };
  }
}
