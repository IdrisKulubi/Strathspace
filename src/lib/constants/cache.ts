// Cache duration in seconds - adjust based on data volatility
export const CACHE_DURATION = {
  SHORT: 60,         // 1 minute - for highly volatile data
  MEDIUM: 300,       // 5 minutes - for moderately volatile data
  STANDARD: 900,     // 15 minutes - default for most data
  LONG: 3600,        // 1 hour - for relatively stable data
  EXTENDED: 14400,   // 4 hours - for very stable data
  DAY: 86400,        // 1 day - for static data that rarely changes
};

// Cache keys with namespacing for better organization
export const CACHE_KEYS = {
  // Profile related
  PROFILE: {
    DETAILS: (userId: string) => `profile:${userId}:details`,
    PHOTOS: (userId: string) => `profile:${userId}:photos`,
    PREFERENCES: (userId: string) => `profile:${userId}:prefs`,
  },
  
  // Matching related
  MATCHING: {
    SWIPABLE: (userId: string): string => `swipable:${userId}`,
    LIKED: (userId: string): string => `liked:${userId}`,
    LIKED_BY: (userId: string): string => `liked_by:${userId}`,
    MATCHES: (userId: string): string => `matches:${userId}`,
    SUGGESTIONS: (userId: string): string => `suggestions:${userId}`,
  },
  
  // Chat related
  CHAT: {
    MESSAGES: (matchId: string): string => `chat:${matchId}:msgs`,
    UNREAD: (userId: string): string => `chat:${userId}:unread`,
    TYPING: (matchId: string, userId: string): string => `chat:${matchId}:typing:${userId}`,
    LAST_SEEN: (matchId: string, userId: string): string => `chat:${matchId}:seen:${userId}`,
  },
  
  // System related
  SYSTEM: {
    RATE_LIMIT: (userId: string) => `system:rate:${userId}`,
    HEALTH_CHECK: () => `system:health:ping`,
    ANALYTICS: (metric: string) => `system:analytics:${metric}`,
  },
} as const;

// Cache TTL values in seconds - optimized based on data type and access patterns
export const CACHE_TTL = {
  // Profile data - balance between freshness and performance
  PROFILE: {
    DETAILS: CACHE_DURATION.MEDIUM,  // 5 min
    PHOTOS: CACHE_DURATION.LONG,     // 1 hour (changes infrequently)
    PREFERENCES: CACHE_DURATION.STANDARD, // 15 min
  },
  
  // Matching data - needs to be relatively fresh
  MATCHING: {
    SWIPES: CACHE_DURATION.SHORT,        // 1 min (high volatility)
    MATCHES: CACHE_DURATION.MEDIUM,      // 5 min
    SUGGESTIONS: CACHE_DURATION.MEDIUM,  // 5 min
  },
  
  // Chat data - needs to be very fresh for real-time feel
  CHAT: {
    MESSAGES: CACHE_DURATION.SHORT,     // 1 min
    UNREAD: CACHE_DURATION.SHORT,       // 1 min
    TYPING: 10,                         // 10 seconds (extremely volatile)
    LAST_SEEN: CACHE_DURATION.MEDIUM,   // 5 min
  },
  
  // System data
  SYSTEM: {
    RATE_LIMIT: CACHE_DURATION.SHORT,   // 1 min
    HEALTH: 30,                         // 30 seconds
    ANALYTICS: CACHE_DURATION.STANDARD, // 15 min
  },
} as const;

// Cache prefixes for better organization and key scanning
export const CACHE_PREFIX = {
  PROFILE: "profile",
  MATCHING: "matching",
  CHAT: "chat",
  SYSTEM: "system",
} as const;
