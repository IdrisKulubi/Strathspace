"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import { eq, count as countFn, sql, desc, and, gte, lt, or } from "drizzle-orm";
import { 
  users, 
  profiles, 
  profileModes, 
  matches, 
  swipes, 
} from "@/db/schema";
import { revalidatePath } from "next/cache";
import {  redirect } from "next/navigation";
import {  sub, format, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { deleteUploadThingFile } from "@/lib/actions/upload.actions";

async function checkAdmin() {
  const session = await auth();
 
  
  if (!session?.user) {
    redirect("/login");
  }
  
  const allowedAdminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  
  const isEmailAllowed = allowedAdminEmails.includes(session.user.email);
  
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  
 
  
  if (!isEmailAllowed && user?.role !== "admin") {
    redirect("/no-access");
  }
  
  if (isEmailAllowed && user?.role !== "admin") {
    await db.update(users)
      .set({ role: "admin" })
      .where(eq(users.id, session.user.id));
  }
  
  return session.user;
}

export async function getAdminStats() {
  await checkAdmin();
  
  const userCount = await db
    .select({ count: countFn() })
    .from(users)
    .then((res) => res[0]?.count || 0);
    
  const matchCount = await db
    .select({ count: countFn() })
    .from(matches)
    .then((res) => res[0]?.count || 0);

  return {
    totalUsers: userCount,
    totalMatches: matchCount,
  };
}

export async function getUsers() {
  await checkAdmin();
  
  const allUsers = await db.query.users.findMany({
    with: {
      profile: {
        with: {
          modes: true,
        },
      },
    },
    orderBy: [desc(users.createdAt)],
  });
  
  return allUsers.map(user => ({
    ...user,
    photos: user.profile?.photos as string[] || [],
    profileCompleted: !!(user.profile?.modes?.datingProfileCompleted || user.profile?.modes?.friendsProfileCompleted),
    createdAt: format(user.createdAt, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    lastActive: format(user.lastActive, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    updatedAt: format(user.updatedAt, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
  }));
}

// Delete a user
export async function deleteUser(userId: string) {
  await checkAdmin();
  
  try {
    // Start a transaction to ensure data consistency
    return await db.transaction(async (tx) => {
      // Get user's profile first to handle photo deletion
      const userProfile = await tx.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
      });

      // Delete photos if they exist
      if (userProfile?.photos?.length) {
        const photos = userProfile.photos as string[];
        await Promise.all(
          photos.map(async (url) => {
            if (url.includes("utfs.io") || url.includes("uploadthing")) {
              try {
                await deleteUploadThingFile(url);
              } catch (error) {
                console.error("Error deleting photo:", url, error);
              }
            }
          })
        );
      }

      // Delete all related data in order
      await tx.delete(swipes).where(
        or(
          eq(swipes.swiperId, userId),
          eq(swipes.swipedId, userId)
        )
      );

      await tx.delete(matches).where(
        or(
          eq(matches.user1Id, userId),
          eq(matches.user2Id, userId)
        )
      );

      // Delete profile modes
      await tx.delete(profileModes).where(eq(profileModes.userId, userId));

      // Delete profile
      await tx.delete(profiles).where(eq(profiles.userId, userId));
      
      // Finally delete the user
      await tx.delete(users).where(eq(users.id, userId));
      
      revalidatePath("/admin");
      return { success: true };
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete user" 
    };
  }
}

// Update user role
export async function updateUserRole(userId: string, newRole: "user" | "admin") {
  await checkAdmin();
  
  await db.update(users)
    .set({ role: newRole })
    .where(eq(users.id, userId));
  
  revalidatePath("/admin");
  return { success: true };
}

// Delete user image
export async function deleteUserImage(userId: string, imageUrl: string) {
  await checkAdmin();
  
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      profile: true,
    },
  });
  
  if (!user?.profile) return { success: false };
  
  const currentPhotos = user.profile.photos as string[] || [];
  const updatedPhotos = currentPhotos.filter(photo => photo !== imageUrl);
  
  await db.update(profiles)
    .set({ photos: updatedPhotos })
    .where(eq(profiles.userId, userId));
  
  revalidatePath("/admin");
  return { success: true };
}

export async function getAnalyticsData() {
  await checkAdmin();
  
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = sub(new Date(), { months: 11 - i });
    return {
      date: format(date, "MMM yyyy"),
      timestamp: date,
    };
  });
  
  const weeks = Array.from({ length: 7 }, (_, i) => {
    const date = sub(new Date(), { weeks: 6 - i });
    return {
      date: format(date, "MMM d"),
      timestamp: date,
    };
  });
  
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = sub(new Date(), { days: 29 - i });
    return {
      date: format(date, "MMM d"),
      timestamp: date,
    };
  });
  
  const usersByMonth = await Promise.all(
    months.map(async ({ date, timestamp }) => {
      const startDate = startOfMonth(timestamp);
      const endDate = endOfMonth(timestamp);
      
      const count = await db
        .select({ count: countFn() })
        .from(users)
        .where(
          and(
            gte(users.createdAt, startDate),
            lt(users.createdAt, endDate)
          )
        )
        .then((res) => res[0]?.count || 0);
        
      return { date, users: count };
    })
  );
  
  const usersByWeek = await Promise.all(
    weeks.map(async ({ date, timestamp }) => {
      const startDate = sub(timestamp, { days: 3 });
      const endDate = sub(timestamp, { days: -3 });
      
      const count = await db
        .select({ count: countFn() })
        .from(users)
        .where(
          and(
            gte(users.createdAt, startDate),
            lt(users.createdAt, endDate)
          )
        )
        .then((res) => res[0]?.count || 0);
        
      return { date, users: count };
    })
  );
  
  const usersByDay = await Promise.all(
    days.map(async ({ date, timestamp }) => {
      const startDate = startOfDay(timestamp);
      const endDate = endOfDay(timestamp);
      
      const count = await db
        .select({ count: countFn() })
        .from(users)
        .where(
          and(
            gte(users.createdAt, startDate),
            lt(users.createdAt, endDate)
          )
        )
        .then((res) => res[0]?.count || 0);
        
      return { date, users: count };
    })
  );
  
  const now = new Date();
  const oneDayAgo = sub(now, { days: 1 });
  const oneWeekAgo = sub(now, { weeks: 1 });
  const oneMonthAgo = sub(now, { months: 1 });
  
  const dailyActiveUsers = await db
    .select({ count: countFn() })
    .from(users)
    .where(gte(users.lastActive, oneDayAgo))
    .then((res) => res[0]?.count || 0);
    
  const weeklyActiveUsers = await db
    .select({ count: countFn() })
    .from(users)
    .where(gte(users.lastActive, oneWeekAgo))
    .then((res) => res[0]?.count || 0);
    
  const monthlyActiveUsers = await db
    .select({ count: countFn() })
    .from(users)
    .where(gte(users.lastActive, oneMonthAgo))
    .then((res) => res[0]?.count || 0);
    
  const totalUsers = await db
    .select({ count: countFn() })
    .from(users)
    .then((res) => res[0]?.count || 0);
  
  // Get match statistics
  const totalMatches = await db
    .select({ count: countFn() })
    .from(matches)
    .then((res) => res[0]?.count || 0);
    
  const todayMatches = await db
    .select({ count: countFn() })
    .from(matches)
    .where(gte(matches.createdAt, startOfDay(now)))
    .then((res) => res[0]?.count || 0);
  
  const totalSwipes = await db
    .select({ count: countFn() })
    .from(swipes)
    .then((res) => res[0]?.count || 0);
    
  const matchConversion = totalSwipes > 0 
    ? Math.round((totalMatches / totalSwipes) * 100) 
    : 0;
  
  // Get user demographics
  const genderDistribution = await db
    .select({
      gender: profiles.gender,
      count: countFn(),
    })
    .from(profiles)
    .where(sql`${profiles.gender} IS NOT NULL`)
    .groupBy(profiles.gender)
    .execute();
    
  const genderData = genderDistribution.map(item => ({
    name: item.gender || "Unknown",
    value: Number(item.count),
  }));
  
  const profileCompletion = await db
    .select({
      status: sql<boolean>`CASE WHEN "dating_profile_completed" OR "friends_profile_completed" THEN true ELSE false END`,
      count: countFn(),
    })
    .from(profileModes)
    .groupBy(sql`CASE WHEN "dating_profile_completed" OR "friends_profile_completed" THEN true ELSE false END`)
    .execute();
    
  const completionData = profileCompletion.map(item => ({
    name: item.status ? "Complete" : "Incomplete",
    value: Number(item.count),
  }));
  
  //  hourly activity data (based on last active timestamp)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const hourlyActivity = await Promise.all(
    hours.map(async (hour) => {
      const date = new Date();
      date.setHours(hour, 0, 0, 0);
      
      const hourEnd = new Date(date);
      hourEnd.setHours(hour + 1);
      
      //last active within the hour for the past 7 days
      const sevenDaysAgo = sub(now, { days: 7 });
      
      const uniqueActiveUsers = await db
        .select({ count: countFn() })
        .from(users)
        .where(
          and(
            gte(users.lastActive, sevenDaysAgo),
            sql`EXTRACT(HOUR FROM ${users.lastActive}) = ${hour}`
          )
        )
        .then((res) => res[0]?.count || 0);
        
      return {
        hour: `${hour}:00`,
        users: Number(uniqueActiveUsers),
      };
    })
  );
  
  return {
    userGrowth: {
      daily: usersByDay,
      weekly: usersByWeek,
      monthly: usersByMonth,
    },
    activeUsers: {
      daily: dailyActiveUsers,
      weekly: weeklyActiveUsers,
      monthly: monthlyActiveUsers,
      total: totalUsers,
    },
    matchStats: {
      total: totalMatches,
      today: todayMatches,
      conversion: matchConversion,
    },
    userStats: {
      gender: genderData,
      completion: completionData,
      activity: hourlyActivity,
    },
  };
} 