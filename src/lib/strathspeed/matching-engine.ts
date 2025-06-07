import { redis } from '@/lib/redis';
import db from '@/db/drizzle';
import { speedDatingProfiles, users, speedSessions, icebreakerPrompts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { pusher } from '@/lib/pusher/server';
import { nanoid } from 'nanoid';
import { createDailyRoom, generateDailyToken } from '@/lib/actions/strathspeed.actions';

export interface QueueUser {
  userId: string;
  socketId?: string;
  joinedAt: number;
  preferences: {
    anonymousMode: boolean;
    ageRange?: [number, number];
    genderPreference?: string;
    interests?: string[];
  };
  userInfo: {
    name?: string;
    profilePhoto?: string;
  };
}

export interface MatchResult {
  sessionId: string;
  roomId: string;
  roomUrl: string;
  user1Token: string;
  user2Token: string;
  icebreaker: any;
  user1: QueueUser;
  user2: QueueUser;
}

const REDIS_KEYS = {
  ACTIVE_QUEUE: 'strathspeed:queue:active',
  USER_SESSION: 'strathspeed:session:',
  ROOM_DATA: 'strathspeed:room:',
  RECENT_MATCHES: 'strathspeed:recent:',
  USER_DATA: 'strathspeed:user:',
  MATCHING_LOCK: 'strathspeed:matching:lock',
} as const;

// Cache durations in seconds
const CACHE_DURATIONS = {
  USER_SESSION: 600, // 10 minutes
  RECENT_MATCHES: 1800, // 30 minutes
  USER_DATA: 300, // 5 minutes
  MATCHING_LOCK: 30, // 30 seconds
} as const;

export class StrathSpeedMatchingEngine {
  private static instance: StrathSpeedMatchingEngine;

  private constructor() {}

  public static getInstance(): StrathSpeedMatchingEngine {
    if (!StrathSpeedMatchingEngine.instance) {
      StrathSpeedMatchingEngine.instance = new StrathSpeedMatchingEngine();
    }
    return StrathSpeedMatchingEngine.instance;
  }

  /**
   * Add user to the matching queue
   */
  async addToQueue(queueUser: QueueUser): Promise<{ position: number; success: boolean }> {
    try {
      const { userId } = queueUser;

      // Check if user is already in queue
      const existingScore = await redis.zscore(REDIS_KEYS.ACTIVE_QUEUE, userId);
      if (existingScore !== null) {
        const position = await redis.zrank(REDIS_KEYS.ACTIVE_QUEUE, userId);
        return { position: (position || 0) + 1, success: true };
      }

      // Check if user is currently in a session
      const currentSession = await redis.get(`${REDIS_KEYS.USER_SESSION}${userId}`);
      if (currentSession) {
        throw new Error('User is currently in a session');
      }

      // Add to queue with timestamp as score (FIFO)
      const timestamp = Date.now();
      await redis.zadd(REDIS_KEYS.ACTIVE_QUEUE, timestamp, userId);

      // Store user data
      await redis.setex(
        `${REDIS_KEYS.USER_DATA}${userId}`,
        CACHE_DURATIONS.USER_DATA,
        JSON.stringify(queueUser)
      );

      // Set user session status
      await redis.setex(
        `${REDIS_KEYS.USER_SESSION}${userId}`,
        CACHE_DURATIONS.USER_SESSION,
        JSON.stringify({ status: 'queued', joinedAt: timestamp })
      );

      // Get position in queue
      const position = await redis.zrank(REDIS_KEYS.ACTIVE_QUEUE, userId);

      // Trigger immediate matching attempt
      setImmediate(() => this.attemptMatching());

      return { position: (position || 0) + 1, success: true };
    } catch (error) {
      console.error('Error adding user to queue:', error);
      throw error;
    }
  }

  /**
   * Remove user from queue
   */
  async removeFromQueue(userId: string): Promise<boolean> {
    try {
      // Remove from active queue
      await redis.zrem(REDIS_KEYS.ACTIVE_QUEUE, userId);

      // Clean up user data
      await redis.del(`${REDIS_KEYS.USER_DATA}${userId}`);
      await redis.del(`${REDIS_KEYS.USER_SESSION}${userId}`);

      return true;
    } catch (error) {
      console.error('Error removing user from queue:', error);
      return false;
    }
  }

  /**
   * Get user's current position in queue
   */
  async getQueuePosition(userId: string): Promise<number | null> {
    try {
      const position = await redis.zrank(REDIS_KEYS.ACTIVE_QUEUE, userId);
      return position !== null ? position + 1 : null;
    } catch (error) {
      console.error('Error getting queue position:', error);
      return null;
    }
  }

  /**
   * Get current queue size
   */
  async getQueueSize(): Promise<number> {
    try {
      return await redis.zcard(REDIS_KEYS.ACTIVE_QUEUE);
    } catch (error) {
      console.error('Error getting queue size:', error);
      return 0;
    }
  }

  /**
   * Main matching algorithm - attempts to match users in queue
   */
  async attemptMatching(): Promise<MatchResult | null> {
    // Use distributed lock to prevent concurrent matching
    const lockKey = REDIS_KEYS.MATCHING_LOCK;
    const lockValue = nanoid();
    
    try {
      // Acquire lock with expiration
      const acquired = await redis.set(lockKey, lockValue, {
        ex: CACHE_DURATIONS.MATCHING_LOCK,
        nx: true,
      });

      if (!acquired) {
        // Another process is already matching
        return null;
      }

      // Get users from queue (oldest first)
      const queuedUsers = await redis.zrange(REDIS_KEYS.ACTIVE_QUEUE, 0, 9, {
        withScores: true,
      });

      if (queuedUsers.length < 4) { // Need at least 2 users (each has userId and score)
        return null;
      }

      // Try to find compatible matches
      for (let i = 0; i < queuedUsers.length - 2; i += 2) {
        const user1Id = queuedUsers[i] as string;
        const user1Score = queuedUsers[i + 1] as number;

        for (let j = i + 2; j < queuedUsers.length; j += 2) {
          const user2Id = queuedUsers[j] as string;
          const user2Score = queuedUsers[j + 1] as number;

          // Check if these users can be matched
          const canMatch = await this.canUsersMatch(user1Id, user2Id);
          if (canMatch) {
            return await this.createMatch(user1Id, user2Id);
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error in matching algorithm:', error);
      return null;
    } finally {
      // Release lock
      const currentLock = await redis.get(lockKey);
      if (currentLock === lockValue) {
        await redis.del(lockKey);
      }
    }
  }

  /**
   * Check if two users can be matched together
   */
  private async canUsersMatch(user1Id: string, user2Id: string): Promise<boolean> {
    try {
      // Check if they've matched recently
      const [recentMatch1, recentMatch2] = await Promise.all([
        redis.sismember(`${REDIS_KEYS.RECENT_MATCHES}${user1Id}`, user2Id),
        redis.sismember(`${REDIS_KEYS.RECENT_MATCHES}${user2Id}`, user1Id),
      ]);

      if (recentMatch1 || recentMatch2) {
        return false;
      }

      // Get user data and preferences
      const [user1Data, user2Data] = await Promise.all([
        redis.get(`${REDIS_KEYS.USER_DATA}${user1Id}`),
        redis.get(`${REDIS_KEYS.USER_DATA}${user2Id}`),
      ]);

      if (!user1Data || !user2Data) {
        return false;
      }

      const user1: QueueUser = JSON.parse(user1Data);
      const user2: QueueUser = JSON.parse(user2Data);

      // Basic compatibility check
      return this.checkCompatibility(user1, user2);
    } catch (error) {
      console.error('Error checking user compatibility:', error);
      return false;
    }
  }

  /**
   * Check user compatibility based on preferences
   */
  private checkCompatibility(user1: QueueUser, user2: QueueUser): boolean {
    // For now, basic checks - can be enhanced with more sophisticated matching
    
    // Age range compatibility (if specified)
    if (user1.preferences.ageRange && user2.preferences.ageRange) {
      const [min1, max1] = user1.preferences.ageRange;
      const [min2, max2] = user2.preferences.ageRange;
      
      // Check if ranges overlap
      if (max1 < min2 || max2 < min1) {
        return false;
      }
    }

    // Interest overlap (if specified)
    if (user1.preferences.interests && user2.preferences.interests) {
      const interests1 = new Set(user1.preferences.interests);
      const interests2 = new Set(user2.preferences.interests);
      const commonInterests = [...interests1].filter(x => interests2.has(x));
      
      // Require at least one common interest
      if (commonInterests.length === 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Create a match between two users
   */
  private async createMatch(user1Id: string, user2Id: string): Promise<MatchResult> {
    try {
      // Remove both users from queue first
      await redis.zrem(REDIS_KEYS.ACTIVE_QUEUE, user1Id, user2Id);

      // Get user data
      const [user1Data, user2Data] = await Promise.all([
        redis.get(`${REDIS_KEYS.USER_DATA}${user1Id}`),
        redis.get(`${REDIS_KEYS.USER_DATA}${user2Id}`),
      ]);

      const user1: QueueUser = JSON.parse(user1Data!);
      const user2: QueueUser = JSON.parse(user2Data!);

      // Generate unique session ID
      const sessionId = nanoid();
      
      // Create Daily.co room
      const dailyRoom = await createDailyRoom(sessionId);
      
      // Generate tokens for both users
      const [user1Token, user2Token] = await Promise.all([
        generateDailyToken(
          dailyRoom.name,
          user1Id,
          user1.preferences.anonymousMode ? undefined : user1.userInfo.name
        ),
        generateDailyToken(
          dailyRoom.name,
          user2Id,
          user2.preferences.anonymousMode ? undefined : user2.userInfo.name
        ),
      ]);

      // Get random icebreaker
      const icebreaker = await this.getRandomIcebreaker();

      // Create session in database
      await db.insert(speedSessions).values({
        id: sessionId,
        user1Id,
        user2Id,
        roomId: dailyRoom.name,
        dailyRoomUrl: dailyRoom.url,
        status: 'active',
        icebreakerId: icebreaker?.id,
        user1Anonymous: user1.preferences.anonymousMode,
        user2Anonymous: user2.preferences.anonymousMode,
      });

      // Update user sessions in Redis
      const sessionData = {
        status: 'matched',
        sessionId,
        roomId: dailyRoom.name,
        roomUrl: dailyRoom.url,
        matchedWith: null, // Don't store sensitive info in Redis
      };

      await Promise.all([
        redis.setex(
          `${REDIS_KEYS.USER_SESSION}${user1Id}`,
          CACHE_DURATIONS.USER_SESSION,
          JSON.stringify(sessionData)
        ),
        redis.setex(
          `${REDIS_KEYS.USER_SESSION}${user2Id}`,
          CACHE_DURATIONS.USER_SESSION,
          JSON.stringify(sessionData)
        ),
      ]);

      // Store room data
      await redis.setex(
        `${REDIS_KEYS.ROOM_DATA}${dailyRoom.name}`,
        CACHE_DURATIONS.USER_SESSION,
        JSON.stringify({
          sessionId,
          user1Id,
          user2Id,
          createdAt: Date.now(),
        })
      );

      // Add to recent matches to prevent immediate re-matching
      await Promise.all([
        redis.sadd(`${REDIS_KEYS.RECENT_MATCHES}${user1Id}`, user2Id),
        redis.sadd(`${REDIS_KEYS.RECENT_MATCHES}${user2Id}`, user1Id),
        redis.expire(`${REDIS_KEYS.RECENT_MATCHES}${user1Id}`, CACHE_DURATIONS.RECENT_MATCHES),
        redis.expire(`${REDIS_KEYS.RECENT_MATCHES}${user2Id}`, CACHE_DURATIONS.RECENT_MATCHES),
      ]);

      const matchResult: MatchResult = {
        sessionId,
        roomId: dailyRoom.name,
        roomUrl: dailyRoom.url,
        user1Token: user1Token.token,
        user2Token: user2Token.token,
        icebreaker,
        user1,
        user2,
      };

      // Send real-time notifications to both users
      await this.notifyMatchFound(matchResult);

      return matchResult;
    } catch (error) {
      console.error('Error creating match:', error);
      
      // Re-add users to queue if match creation failed
      const timestamp = Date.now();
      await Promise.all([
        redis.zadd(REDIS_KEYS.ACTIVE_QUEUE, timestamp, user1Id),
        redis.zadd(REDIS_KEYS.ACTIVE_QUEUE, timestamp + 1, user2Id),
      ]);
      
      throw error;
    }
  }

  /**
   * Get a random icebreaker prompt
   */
  private async getRandomIcebreaker() {
    try {
      const icebreakers = await db.query.icebreakerPrompts.findMany({
        where: eq(icebreakerPrompts.isActive, true),
        limit: 50,
      });

      if (icebreakers.length === 0) {
        return null;
      }

      const randomIndex = Math.floor(Math.random() * icebreakers.length);
      return icebreakers[randomIndex];
    } catch (error) {
      console.error('Error getting icebreaker:', error);
      return null;
    }
  }

  /**
   * Send real-time match notifications via Pusher
   */
  private async notifyMatchFound(match: MatchResult): Promise<void> {
    try {
      const baseNotification = {
        type: 'match_found',
        sessionId: match.sessionId,
        roomUrl: match.roomUrl,
        icebreaker: match.icebreaker,
        timestamp: Date.now(),
      };

      // Send personalized notifications to each user
      await Promise.all([
        pusher.trigger(`user-${match.user1.userId}`, 'strathspeed-match', {
          ...baseNotification,
          token: match.user1Token,
          isAnonymous: match.user1.preferences.anonymousMode,
          matchedUser: {
            id: match.user2.userId,
            name: match.user2.preferences.anonymousMode ? undefined : match.user2.userInfo.name,
            profilePhoto: match.user2.preferences.anonymousMode ? undefined : match.user2.userInfo.profilePhoto,
          },
        }),
        pusher.trigger(`user-${match.user2.userId}`, 'strathspeed-match', {
          ...baseNotification,
          token: match.user2Token,
          isAnonymous: match.user2.preferences.anonymousMode,
          matchedUser: {
            id: match.user1.userId,
            name: match.user1.preferences.anonymousMode ? undefined : match.user1.userInfo.name,
            profilePhoto: match.user1.preferences.anonymousMode ? undefined : match.user1.userInfo.profilePhoto,
          },
        }),
      ]);
    } catch (error) {
      console.error('Error sending match notifications:', error);
      // Don't throw - match creation succeeded, notification failure is non-critical
    }
  }

  /**
   * Clean up expired queue entries and sessions
   */
  async cleanupExpiredEntries(): Promise<void> {
    try {
      const now = Date.now();
      const maxWaitTime = 10 * 60 * 1000; // 10 minutes

      // Remove users who have been waiting too long
      const expiredThreshold = now - maxWaitTime;
      const expiredUsers = await redis.zrangebyscore(
        REDIS_KEYS.ACTIVE_QUEUE,
        '-inf',
        expiredThreshold
      );

      if (expiredUsers.length > 0) {
        // Remove expired users
        await redis.zremrangebyscore(
          REDIS_KEYS.ACTIVE_QUEUE,
          '-inf',
          expiredThreshold
        );

        // Clean up their data
        const deletePromises = expiredUsers.map(userId => [
          redis.del(`${REDIS_KEYS.USER_DATA}${userId}`),
          redis.del(`${REDIS_KEYS.USER_SESSION}${userId}`),
        ]).flat();

        await Promise.all(deletePromises);

        console.log(`Cleaned up ${expiredUsers.length} expired queue entries`);
      }
    } catch (error) {
      console.error('Error cleaning up expired entries:', error);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    totalInQueue: number;
    avgWaitTime: number;
    oldestWaitTime: number;
  }> {
    try {
      const now = Date.now();
      const queueData = await redis.zrange(REDIS_KEYS.ACTIVE_QUEUE, 0, -1, {
        withScores: true,
      });

      if (queueData.length === 0) {
        return { totalInQueue: 0, avgWaitTime: 0, oldestWaitTime: 0 };
      }

      const waitTimes: number[] = [];
      for (let i = 1; i < queueData.length; i += 2) {
        const timestamp = queueData[i] as number;
        waitTimes.push(now - timestamp);
      }

      const totalInQueue = waitTimes.length;
      const avgWaitTime = waitTimes.reduce((sum, time) => sum + time, 0) / totalInQueue;
      const oldestWaitTime = Math.max(...waitTimes);

      return {
        totalInQueue,
        avgWaitTime: Math.round(avgWaitTime / 1000), // Convert to seconds
        oldestWaitTime: Math.round(oldestWaitTime / 1000),
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      return { totalInQueue: 0, avgWaitTime: 0, oldestWaitTime: 0 };
    }
  }
}

// Export singleton instance
export default StrathSpeedMatchingEngine.getInstance(); 