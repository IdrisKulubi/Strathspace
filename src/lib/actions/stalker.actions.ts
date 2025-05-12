"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import { profileViews, users } from "@/db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { safeAction } from "@/lib/safe-action";
import { z } from "zod";

export interface StalkerWithProfile {
  id: string;
  name: string;
  image: string | null;
  profile: {
    firstName: string;
    lastName: string;
    profilePhoto: string | null;
  };
  viewCount: number;
  lastViewed: Date;
}

// Schema for tracking profile views
const profileViewSchema = z.object({
  viewedUserId: z.string(),
  source: z.enum(['VIEW_MORE', 'PROFILE_CARD', 'SEARCH', 'MATCHES']).default('VIEW_MORE'),
  duration: z.number().optional(), // Time spent viewing in seconds
});

export const trackProfileView = safeAction(
  profileViewSchema,
  async ({ viewedUserId, source, duration }) => {
    try {
      const session = await auth();
      if (!session?.user || session.user.id === viewedUserId) {
        return { success: true, alreadyViewed: true } as const;
      }

      // Check if user has viewed this profile in the last hour
      const lastHour = new Date();
      lastHour.setHours(lastHour.getHours() - 1);

      const recentView = await db.query.profileViews.findFirst({
        where: and(
          eq(profileViews.viewerId, session.user.id),
          eq(profileViews.viewedId, viewedUserId),
          gte(profileViews.viewedAt, lastHour)
        ),
      });

      if (recentView) {
        return { success: true, alreadyViewed: true } as const;
      }

      // Insert new view with type-safe values
      await db.insert(profileViews).values({
        viewerId: session.user.id,
        viewedId: viewedUserId,
        source: source as "VIEW_MORE" | "PROFILE_CARD" | "SEARCH" | "MATCHES",
        viewDuration: duration || null,
      });

      return { success: true, alreadyViewed: false } as const;
    } catch (error) {
      console.error("[TRACK_PROFILE_VIEW_ERROR]", error);
      return { success: false, error: "Failed to track profile view" } as const;
    }
  }
);

export async function getStalkers(limit?: number) {
  const session = await auth();
  if (!session?.user) return [];

  // Get unique stalkers with their latest view time and view count
  const stalkers = await db
    .select({
      viewerId: profileViews.viewerId,
      lastViewed: sql<Date>`MAX(${profileViews.viewedAt})`,
      viewCount: sql<number>`COUNT(*)`,
    })
    .from(profileViews)
    .where(eq(profileViews.viewedId, session.user.id))
    .groupBy(profileViews.viewerId)
    .orderBy(desc(sql`MAX(${profileViews.viewedAt})`))
    .limit(limit || 50);

  // Get detailed user info for each stalker
  const stalkerDetails = await Promise.all(
    stalkers.map(async (stalker) => {
      const userInfo = await db.query.users.findFirst({
        where: eq(users.id, stalker.viewerId),
        columns: {
          id: true,
          name: true,
          image: true,
        },
        with: {
          profile: {
            columns: {
              firstName: true,
              lastName: true,
              profilePhoto: true,
            }
          }
        }
      });

      if (!userInfo?.name || !userInfo.profile) return null;

      return {
        id: userInfo.id,
        name: userInfo.name,
        image: userInfo.image,
        profile: {
          firstName: userInfo.profile.firstName,
          lastName: userInfo.profile.lastName,
          profilePhoto: userInfo.profile.profilePhoto,
        },
        viewCount: stalker.viewCount,
        lastViewed: stalker.lastViewed,
      } satisfies StalkerWithProfile;
    })
  );

  return stalkerDetails.filter((stalker): stalker is StalkerWithProfile => stalker !== null);
}

export async function getStalkerStats() {
  const session = await auth();
  if (!session?.user) return null;

  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  // Get total, weekly, and unique view counts
  const [totalViews, weeklyViews, uniqueViewers] = await Promise.all([
    db.select({ count: sql<number>`count(*)` })
      .from(profileViews)
      .where(eq(profileViews.viewedId, session.user.id))
      .then(res => res[0]?.count || 0),

    db.select({ count: sql<number>`count(*)` })
      .from(profileViews)
      .where(and(
        eq(profileViews.viewedId, session.user.id),
        gte(profileViews.viewedAt, lastWeek)
      ))
      .then(res => res[0]?.count || 0),

    db.select({ count: sql<number>`count(distinct ${profileViews.viewerId})` })
      .from(profileViews)
      .where(eq(profileViews.viewedId, session.user.id))
      .then(res => res[0]?.count || 0)
  ]);

  return {
    totalViews,
    weeklyViews,
    uniqueViewers,
    averageViewsPerDay: Math.round(weeklyViews / 7),
  };
}

// Get most active hours for profile views
export async function getPeakViewingHours() {
  const session = await auth();
  if (!session?.user) return [];

  return db
    .select({
      hour: sql<number>`EXTRACT(HOUR FROM ${profileViews.viewedAt})::integer`,
      count: sql<number>`count(*)`
    })
    .from(profileViews)
    .where(eq(profileViews.viewedId, session.user.id))
    .groupBy(sql`EXTRACT(HOUR FROM ${profileViews.viewedAt})`)
    .orderBy(desc(sql<number>`count(*)`))
    .limit(5);
} 