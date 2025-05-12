import db from "@/db/drizzle";
import { profileViews, swipes, matches } from "@/db/schema";
import { and, eq, or, sql, gte } from "drizzle-orm";

export interface ProfileAnalytics {
  visitCount: number;
  swipeRightCount: number;
  swipeLeftCount: number;
  matchCount: number;
  matchRatio: number;
  effectivenessScore: number;
  weeklyTrends: {
    visits: number[];
    matches: number[];
    days: string[];
  };
  peakHours: {
    hour: number;
    count: number;
  }[];
  comparisonStats: {
    avgVisits: number;
    avgMatches: number;
    avgEffectivenessScore: number;
    percentileRank: number;
  };
  weeklyGoals: {
    visitGoal: number;
    visitProgress: number;
    matchGoal: number;
    matchProgress: number;
  };
}

export async function getProfileAnalytics(userId: string): Promise<ProfileAnalytics> {
  // Get the date 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Basic stats (existing code)
  const visitCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(profileViews)
    .where(eq(profileViews.viewedId, userId))
    .then(res => res[0]?.count ?? 0);

  const swipeRightCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(swipes)
    .where(and(eq(swipes.swiperId, userId), eq(swipes.isLike, true)))
    .then(res => res[0]?.count ?? 0);

  const swipeLeftCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(swipes)
    .where(and(eq(swipes.swiperId, userId), eq(swipes.isLike, false)))
    .then(res => res[0]?.count ?? 0);

  const matchCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(matches)
    .where(or(eq(matches.user1Id, userId), eq(matches.user2Id, userId)))
    .then(res => res[0]?.count ?? 0);

  // Weekly trends
  const weeklyTrends = await getWeeklyTrends(userId, sevenDaysAgo);

  // Peak activity hours
  const peakHours = await getPeakHours(userId);

  // Comparison with other users
  const comparisonStats = await getComparisonStats(userId);

  // Weekly goals and progress
  const weeklyGoals = calculateWeeklyGoals(visitCount, matchCount);

  const matchRatio = swipeRightCount > 0 ? matchCount / swipeRightCount : 0;
  const effectivenessScore = calculateEffectivenessScore(visitCount, swipeRightCount, matchRatio, matchCount);

  return {
    visitCount,
    swipeRightCount,
    swipeLeftCount,
    matchCount,
    matchRatio,
    effectivenessScore,
    weeklyTrends,
    peakHours,
    comparisonStats,
    weeklyGoals,
  };
}

async function getWeeklyTrends(userId: string, startDate: Date) {
  const days: string[] = [];
  const visits: number[] = [];
  const matchCounts: number[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);

    const dayVisits = await db
      .select({ count: sql<number>`count(*)` })
      .from(profileViews)
      .where(and(
        eq(profileViews.viewedId, userId),
        gte(profileViews.viewedAt, date),
        sql`${profileViews.viewedAt} < ${nextDate}`
      ))
      .then(res => res[0]?.count ?? 0);

    const dayMatches: number = await db
      .select({ count: sql<number>`count(*)` })
      .from(matches)
      .where(and(
        or(eq(matches.user1Id, userId), eq(matches.user2Id, userId)),
        gte(matches.createdAt, date),
        sql`${matches.createdAt} < ${nextDate}`
      ))
      .then(res => res[0]?.count ?? 0);

    days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    visits.push(dayVisits);
    matchCounts.push(dayMatches);
  }

  return { days, visits, matches: matchCounts };
}

async function getPeakHours(userId: string) {
  // Get activity count by hour
  const hourlyActivity = await db
    .select({
      hour: sql<number>`EXTRACT(HOUR FROM ${profileViews.viewedAt})::integer`,
      count: sql<number>`count(*)`
    })
    .from(profileViews)
    .where(eq(profileViews.viewedId, userId))
    .groupBy(sql`EXTRACT(HOUR FROM ${profileViews.viewedAt})`)
    .orderBy(sql<number>`count(*)`)
    .limit(5);

  return hourlyActivity;
}

async function getComparisonStats(userId: string) {
  // Get average stats across all users
  const avgVisits = await db
    .select({ avg: sql<number>`avg(count)` })
    .from(
      db.select({
        count: sql<number>`count(*)`
      })
      .from(profileViews)
      .groupBy(profileViews.viewedId)
      .as('visit_counts')
    )
    .then(res => Math.round(res[0]?.avg ?? 0));

  const avgMatches = await db
    .select({ avg: sql<number>`avg(count)` })
    .from(
      db.select({
        count: sql<number>`count(*)`
      })
      .from(matches)
      .groupBy(matches.user1Id)
      .as('match_counts')
    )
    .then(res => Math.round(res[0]?.avg ?? 0));

  // Calculate user's percentile rank
  const userRank = await calculatePercentileRank(userId);

  return {
    avgVisits,
    avgMatches,
    avgEffectivenessScore: 50, // Baseline score
    percentileRank: userRank
  };
}

async function calculatePercentileRank(userId: string): Promise<number> {
  // Complex calculation simplified for now
  return 75; // Placeholder
}

function calculateWeeklyGoals(visitCount: number, matchCount: number) {
  return {
    visitGoal: Math.max(visitCount + 10, 20), // At least 20 visits
    visitProgress: visitCount,
    matchGoal: Math.max(matchCount + 2, 5), // At least 5 matches
    matchProgress: matchCount
  };
}

function calculateEffectivenessScore(
  visitCount: number,
  swipeRightCount: number,
  matchRatio: number,
  matchCount: number
): number {
  return Math.round(
    (visitCount * 0.2) +
    (swipeRightCount * 0.1) +
    (matchRatio * 100 * 0.5) +
    (matchCount * 0.2)
  );
} 