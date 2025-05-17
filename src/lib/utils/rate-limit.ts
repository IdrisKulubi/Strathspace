import { getRedisInstance } from "@/lib/redis";

type RateLimitOptions = {
  limit?: number;        // Max requests in window
  window?: number;       // Time window in seconds
  identifier?: string;   // Additional identifier for more granular rate limiting
  strictMode?: boolean;  
};

type RateLimitResult = {
  limited: boolean;      // Whether the request is rate limited
  remaining: number;     // Remaining allowed requests in current window
  reset: number;         // Timestamp when the rate limit resets (in seconds)
  retryAfter?: number;   // Suggested seconds to wait before retry if limited
};


export async function rateLimit(
  userId: string, 
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const {
    limit = 10,
    window = 60,
    identifier = "default",
    strictMode = false
  } = options;
  
  const now = Math.floor(Date.now() / 1000);
  const key = `system:rate:${userId}:${identifier}`;
  const windowStart = now - window;
  
  try {
    const redis = await getRedisInstance();
    
    if (!redis) {
      console.warn("Redis unavailable for rate limiting");
      return {
        limited: strictMode, // In strict mode, limit when Redis is down
        remaining: strictMode ? 0 : limit,
        reset: now + window,
      };
    }
    
    
    const pipeline = redis.pipeline();
    
    // Remove entries older than our window
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Add current request with score = current timestamp
    pipeline.zadd(key, { score: now, member: `${now}-${Math.random().toString(36).substring(2, 9)}` });
    
    // Count requests in current window
    pipeline.zcard(key);
    
    // Set expiration on the sorted set
    pipeline.expire(key, window * 2); // 2x window for safety
    
    // Execute pipeline
    const results = await pipeline.exec();
    const requestCount = results[2] as number;
    
    // Calculate remaining requests and reset time
    const remaining = Math.max(limit - requestCount, 0);
    const limited = requestCount > limit;
    
    // If limited, calculate retry-after time
    let retryAfter: number | undefined;
    if (limited) {
      // Get oldest request in window to calculate retry time
      const oldestRequest = await redis.zrange(key, 0, 0, { withScores: true });
      if (oldestRequest && oldestRequest.length >= 2) {
        const oldestTimestamp = oldestRequest[1] as number;
        retryAfter = Math.ceil(window - (now - oldestTimestamp));
      } else {
        retryAfter = window;
      }
    }
    
    return {
      limited,
      remaining,
      reset: now + window,
      ...(limited ? { retryAfter } : {})
    };
  } catch (error) {
    console.error("Rate limiting error:", error);
    
    // Fail based on strict mode
    return {
      limited: strictMode,
      remaining: strictMode ? 0 : limit,
      reset: now + window,
    };
  }
}


export async function tieredRateLimit(
  userId: string,
  tier: 'free' | 'premium' | 'admin' = 'free',
  action: string
): Promise<RateLimitResult> {
  // Configure limits based on tier and action
  const limits: Record<string, Record<string, { limit: number, window: number }>> = {
    free: {
      'api:read': { limit: 100, window: 60 },
      'api:write': { limit: 20, window: 60 },
      'message:send': { limit: 50, window: 3600 }, // 50 messages per hour
    },
    premium: {
      'api:read': { limit: 1000, window: 60 },
      'api:write': { limit: 100, window: 60 },
      'message:send': { limit: 250, window: 3600 }, // 250 messages per hour
    },
    admin: {
      'api:read': { limit: 5000, window: 60 },
      'api:write': { limit: 1000, window: 60 },
      'message:send': { limit: 1000, window: 3600 }, // 1000 messages per hour
    }
  };
  
  // Get appropriate limits
  const tierLimits = limits[tier] || limits.free;
  const actionLimits = tierLimits[action] || { limit: 10, window: 60 };
  
  return rateLimit(userId, {
    limit: actionLimits.limit,
    window: actionLimits.window,
    identifier: action,
    strictMode: false
  });
}
