import { setCachedData, getCachedData, setBatchCachedData } from "@/lib/utils/redis-helpers";
import { CACHE_DURATION } from "@/lib/constants/cache";

/**
 * Helper function to invalidate cached data
 * @param key The cache key to invalidate
 */
export async function invalidateCachedData(key: string): Promise<void> {
  try {
    // Use Redis directly to delete the key
    const redis = await import("@/lib/redis").then(m => m.getRedisInstance());
    if (redis) {
      // Use unlink for non-blocking deletion
      await redis.unlink(key);
    }
  } catch (error) {
    console.error(`Failed to invalidate cache for key: ${key}`, error);
  }
}

/**
 * Helper function to invalidate all keys matching a pattern
 * @param pattern The pattern to match keys against
 */
export async function invalidateByPattern(pattern: string): Promise<void> {
  try {
    const redis = await import("@/lib/redis").then(m => m.getRedisInstance());
    if (!redis) return;
    
    // Get all keys matching pattern
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return;
    
    // Unlink all matched keys (non-blocking)
    await redis.unlink(...keys);
  } catch (error) {
    console.error(`Failed to invalidate keys by pattern: ${pattern}`, error);
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
export async function setTypedCachedData<T>(
  key: string, 
  data: T, 
  ttl = CACHE_DURATION.STANDARD
): Promise<void> {
  try {
    const shouldCompress = JSON.stringify(data).length > 1024;
    await setCachedData(key, data, ttl, { compress: shouldCompress });
  } catch (error) {
    console.error(`Failed to set cached data for key: ${key}`, error);
  }
}

/**
 * Set multiple cache entries efficiently in a single batch operation
 */
export async function batchSetCache<T>(
  items: Array<{ key: string; data: T; ttl?: number }>
): Promise<boolean> {
  try {
    return await setBatchCachedData(
      items.map(item => ({
        key: item.key,
        data: item.data,
        expirationSeconds: item.ttl || CACHE_DURATION.STANDARD
      }))
    );
  } catch (error) {
    console.error("Failed to set batch cached data", error);
    return false;
  }
} 