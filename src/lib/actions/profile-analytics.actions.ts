import db from "@/db/drizzle";
import { profileViews, swipes, matches } from "@/db/schema";
import { and, eq, or, sql, gte, desc } from "drizzle-orm";

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

  // Get total profile visits with proper join
  const visitCount = await db.query.profileViews.findMany({
    where: eq(profileViews.viewedId, userId),
    columns: {
      id: true
    }
  }).then(res => res.length);

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

  // Weekly trends with proper date handling
  const weeklyTrends = await getWeeklyTrends(userId, sevenDaysAgo);

  // Peak hours using viewedAt
  const peakHours = await getPeakHours(userId);

  // Comparison stats using proper joins
  const comparisonStats = await getComparisonStats(userId);

  // Weekly goals based on actual data
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

    // Get daily visits using proper query
    const dayVisits = await db.query.profileViews.findMany({
      where: and(
        eq(profileViews.viewedId, userId),
        gte(profileViews.viewedAt, date),
        sql`${profileViews.viewedAt} < ${nextDate}`
      ),
      columns: {
        id: true
      }
    }).then(res => res.length);

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
  // Get activity count by hour using proper date field
  const result = await db
    .select({
      hour: sql<number>`EXTRACT(HOUR FROM ${profileViews.viewedAt})::integer`,
      count: sql<number>`count(*)`
    })
    .from(profileViews)
    .where(eq(profileViews.viewedId, userId))
    .groupBy(sql`EXTRACT(HOUR FROM ${profileViews.viewedAt})`)
    .orderBy(desc(sql<number>`count(*)`))
    .limit(5);

  return result.map(r => ({ hour: r.hour, count: Number(r.count) }));
}

async function getComparisonStats(userId: string) {
  // Get average visits across all users
  const avgVisitsResult = await db
    .select({
      avg: sql<number>`avg(count)::integer`
    })
    .from(
      db.select({
        count: sql<number>`count(*)`
      })
      .from(profileViews)
      .groupBy(profileViews.viewedId)
      .as('visit_counts')
    );

  const avgVisits = avgVisitsResult[0]?.avg ?? 0;

  // Get average matches
  const avgMatchesResult = await db
    .select({
      avg: sql<number>`avg(count)::integer`
    })
    .from(
      db.select({
        count: sql<number>`count(*)`
      })
      .from(matches)
      .groupBy(matches.user1Id)
      .as('match_counts')
    );

  const avgMatches = avgMatchesResult[0]?.avg ?? 0;

  // Calculate user's percentile rank
  const userRank = await calculatePercentileRank(userId);

  return {
    avgVisits,
    avgMatches,
    avgEffectivenessScore: 50,
    percentileRank: userRank
  };
}

async function calculatePercentileRank(userId: string): Promise<number> {
  const allVisits = await db.query.profileViews.findMany({
    columns: {
      viewedId: true
    }
  });

  const visitCounts = new Map<string, number>();
  allVisits.forEach(visit => {
    visitCounts.set(visit.viewedId, (visitCounts.get(visit.viewedId) || 0) + 1);
  });

  const counts = Array.from(visitCounts.values()).sort((a, b) => a - b);
  const userCount = visitCounts.get(userId) || 0;
  
  const position = counts.findIndex(count => count >= userCount);
  return Math.round((position / counts.length) * 100);
}

function calculateWeeklyGoals(visitCount: number, matchCount: number) {
  return {
    visitGoal: Math.max(visitCount + 10, 20),
    visitProgress: visitCount,
    matchGoal: Math.max(matchCount + 2, 5),
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