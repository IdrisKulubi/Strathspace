import { setCachedData, getCachedData } from "@/lib/utils/redis-helpers";

// Cache duration in seconds
export const CACHE_DURATION = 14400; // 4 hours

// Cache keys
export const CACHE_KEYS = {
  PROFILE_PHOTO: (userId: string) => `profile:${userId}:photo`,
  PROFILE_PHOTOS: (userId: string) => `profile:${userId}:photos`,
  SWIPABLE_PROFILES: (userId: string): string => `swipable:${userId}`,
  PROFILE: (userId: string) => `profile:${userId}`,
  LIKED_PROFILES: (userId: string): string => `liked:${userId}`,
  LIKED_BY_PROFILES: (userId: string): string => `liked_by:${userId}`,
  MATCHES: (userId: string): string => `matches:${userId}`,
  RATE_LIMIT: (userId: string) => `rate_limit:${userId}`,
  CHAT_MESSAGES: (matchId: string): string => `chat:${matchId}`,
  UNREAD_MESSAGES: (userId: string): string => `unread:${userId}`,
} as const;

// Cache TTL values in seconds
export const CACHE_TTL = {
  PROFILE: 300, // 5 minutes
  SWIPES: 60, // 1 minute
  MATCHES: 120, // 2 minutes
  PHOTOS: 3600, // 1 hour
  RATE_LIMIT: 60, // 1 minute
} as const;

// Cache prefixes for better organization
export const CACHE_PREFIX = {
  PROFILE: "profile",
  SWIPE: "swipe",
  MATCH: "match",
  PHOTO: "photo",
  RATE_LIMIT: "rate_limit",
} as const;

/**
 * Helper function to invalidate cached data
 * @param key The cache key to invalidate
 */
export async function invalidateCachedData(key: string): Promise<void> {
  try {
    // Use Redis directly to delete the key
    const redis = await import("@/lib/redis").then(m => m.getRedisInstance());
    if (redis) {
      await redis.del(key);
    }
  } catch (error) {
    console.error(`Failed to invalidate cache for key: ${key}`, error);
  }
}

/**
 * Helper function to get cached data with type safety
 * @param key The cache key to retrieve
 * @returns The cached data or null if not found
 */
export async function getTypedCachedData<T>(key: string): Promise<T | null> {
  try {
    return await getCachedData<T>(key);
  } catch (error) {
    console.error(`Failed to get cached data for key: ${key}`, error);
    return null;
  }
}

/**
 * Helper function to set cached data with improved error handling
 * @param key The cache key to set
 * @param data The data to cache
 * @param ttl Time to live in seconds
 */
export async function setTypedCachedData<T>(key: string, data: T, ttl = 300): Promise<void> {
  try {
    await setCachedData(key, data, ttl);
  } catch (error) {
    console.error(`Failed to set cached data for key: ${key}`, error);
  }
}
