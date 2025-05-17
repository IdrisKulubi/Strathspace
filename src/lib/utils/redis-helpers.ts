"use server";

import { getRedisInstance } from "@/lib/redis";
import { compress, decompress } from "lz-string";

const COMPRESSION_THRESHOLD = 1024;

export async function setCachedData<T>(
  key: string,
  data: T,
  expirationSeconds = 60,
  options: { compress?: boolean } = {}
): Promise<boolean> {
  try {
    const redis = await getRedisInstance();
    if (!redis) return false;

    const serializedData = JSON.stringify(data, (_, value) => {
      if (value instanceof Date) {
        return { __type: "Date", value: value.toISOString() };
      }
      return value;
    });

    const shouldCompress = options.compress !== false && 
                           serializedData.length > COMPRESSION_THRESHOLD;
    
    const finalData = shouldCompress 
      ? `___COMPRESSED___${compress(serializedData)}`
      : serializedData;

    await redis.set(key, finalData, { ex: expirationSeconds });
    return true;
  } catch (error) {
    console.error(`Error setting cache for key ${key}:`, error);
    return false;
  }
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const redis = await getRedisInstance();
    if (!redis) return null;

    const cached = await redis.get(key);
    if (!cached) return null;

    if (typeof cached !== "string") {
      await redis.del(key);
      return null;
    }

    const dataToProcess = cached.startsWith("___COMPRESSED___")
      ? decompress(cached.replace("___COMPRESSED___", ""))
      : cached;
    
    try {
      const parsed = JSON.parse(dataToProcess, (_, value) => {
        if (value?.__type === "Date") {
          return new Date(value.value);
        }
        return value;
      });

      if (!parsed || typeof parsed !== "object") {
        await redis.del(key);
        return null;
      }

      return parsed as T;
    } catch (parseError) {
      console.error(`Error parsing cached data for key ${key}:`, parseError);
      await redis.del(key); 
      return null;
    }
  } catch (error) {
    console.error(`Error getting cache for key ${key}:`, error);
    return null;
  }
}

export async function setBatchCachedData<T>(
  items: Array<{ key: string; data: T; expirationSeconds?: number }>
): Promise<boolean> {
  try {
    const redis = await getRedisInstance();
    if (!redis) return false;

    const pipeline = redis.pipeline();
    
    // Add all items to pipeline
    for (const { key, data, expirationSeconds = 60 } of items) {
      const serializedData = JSON.stringify(data, (_, value) => {
        if (value instanceof Date) {
          return { __type: "Date", value: value.toISOString() };
        }
        return value;
      });
      
      const shouldCompress = serializedData.length > COMPRESSION_THRESHOLD;
      const finalData = shouldCompress 
        ? `___COMPRESSED___${compress(serializedData)}`
        : serializedData;
        
      pipeline.set(key, finalData, { ex: expirationSeconds });
    }
    
    await pipeline.exec();
    return true;
  } catch (error) {
    console.error("Error setting batch cache:", error);
    return false;
  }
}

export async function clearUserCache(userId: string) {
  try {
    const keys = [
      `swipable:${userId}`,
      `liked:${userId}`,
      `liked_by:${userId}`,
      `profile:${userId}`,
      `matches:${userId}`,
      `unread:${userId}`,
    ];

    const redis = await getRedisInstance();
    if (!redis) return false;

    await Promise.all(keys.map((key) => redis.unlink(key)));
    return true;
  } catch (error) {
    console.error(`Error clearing cache for user ${userId}:`, error);
    return false;
  }
}

export async function warmCache<T>(
  key: string, 
  dataProvider: () => Promise<T>,
  expirationSeconds = 60
): Promise<T | null> {
  const cached = await getCachedData<T>(key);
  if (cached) return cached;
  
  try {
    const freshData = await dataProvider();
    if (freshData) {
      setCachedData(key, freshData, expirationSeconds)
        .catch(err => console.error(`Failed to warm cache for ${key}:`, err));
    }
    return freshData;
  } catch (error) {
    console.error(`Error warming cache for ${key}:`, error);
    return null;
  }
}

// Cache stats for monitoring
export async function getCacheStats() {
  try {
    const redis = await getRedisInstance();
    if (!redis) return null;
    
    //@ts-expect-error redis info returns a string but I will fix it later
    const info = await redis.info() as string;
    
    const memoryMatch = info.match(/used_memory:(\d+)/);
    const keysMatch = info.match(/keys=(\d+)/);
    
    return {
      memoryUsed: memoryMatch ? parseInt(memoryMatch[1]) : null,
      keyCount: keysMatch ? parseInt(keysMatch[1]) : null,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Error getting cache stats:", error);
    return null;
  }
}
