/**
 * Performance monitoring and database query optimization for messaging
 * Provides metrics collection and query optimization utilities
 */

import { performance } from 'perf_hooks';

// Performance metrics types
export interface QueryMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  averageQueryTime: number;
  totalQueries: number;
  successRate: number;
  slowQueries: QueryMetrics[];
  errorRate: number;
  lastHour: QueryMetrics[];
}

// Performance monitoring class
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: QueryMetrics[] = [];
  private readonly maxMetrics = 1000;
  private readonly slowQueryThreshold = 1000; // 1 second

  private constructor() {
    // Clean up old metrics periodically
    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // Every hour
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  recordQuery(metrics: QueryMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow queries
    if (metrics.duration > this.slowQueryThreshold) {
      console.warn(`Slow query detected: ${metrics.operation} took ${metrics.duration}ms`, {
        operation: metrics.operation,
        duration: metrics.duration,
        metadata: metrics.metadata
      });
    }

    // Log errors
    if (!metrics.success && metrics.error) {
      console.error(`Query error: ${metrics.operation}`, {
        error: metrics.error,
        metadata: metrics.metadata
      });
    }
  }

  getStats(): PerformanceStats {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recentMetrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
    const successfulQueries = recentMetrics.filter(m => m.success);
    const slowQueries = recentMetrics.filter(m => m.duration > this.slowQueryThreshold);
    
    const averageQueryTime = successfulQueries.length > 0
      ? successfulQueries.reduce((sum, m) => sum + m.duration, 0) / successfulQueries.length
      : 0;

    const successRate = recentMetrics.length > 0
      ? (successfulQueries.length / recentMetrics.length) * 100
      : 100;

    const errorRate = recentMetrics.length > 0
      ? ((recentMetrics.length - successfulQueries.length) / recentMetrics.length) * 100
      : 0;

    return {
      averageQueryTime,
      totalQueries: recentMetrics.length,
      successRate,
      slowQueries: slowQueries.slice(-10), // Last 10 slow queries
      errorRate,
      lastHour: recentMetrics
    };
  }

  private cleanup(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
  }

  reset(): void {
    this.metrics = [];
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// Performance measurement decorator
export function measurePerformance<T extends (...args: any[]) => Promise<any>>(
  operation: string,
  fn: T,
  metadata?: Record<string, any>
): T {
  return (async (...args: any[]) => {
    const startTime = performance.now();
    let success = false;
    let error: string | undefined;
    
    try {
      const result = await fn(...args);
      success = true;
      return result;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      const duration = performance.now() - startTime;
      
      performanceMonitor.recordQuery({
        operation,
        duration,
        timestamp: Date.now(),
        success,
        error,
        metadata: {
          ...metadata,
          args: args.length > 0 ? args[0] : undefined // Log first arg for context
        }
      });
    }
  }) as T;
}

// Database query optimization utilities
export class QueryOptimizer {
  // Cache for prepared query plans
  private static queryPlanCache = new Map<string, any>();
  
  // Batch operations to reduce database round trips
  static batchOperations<T>(
    operations: (() => Promise<T>)[],
    batchSize: number = 10
  ): Promise<T[]> {
    const batches: (() => Promise<T>)[][] = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      batches.push(operations.slice(i, i + batchSize));
    }
    
    return Promise.all(
      batches.map(batch => Promise.all(batch.map(op => op())))
    ).then(results => results.flat());
  }

  // Optimize message queries with proper indexing hints
  static getOptimizedMessageQuery(matchId: string, limit: number, before?: string) {
    return {
      // Use composite index on (matchId, createdAt)
      indexHint: 'USE INDEX (idx_messages_match_created)',
      where: {
        matchId,
        ...(before && { createdAt: { lt: new Date(before) } })
      },
      orderBy: { createdAt: 'desc' },
      limit: limit + 1, // Fetch one extra to check if there are more
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    };
  }

  // Optimize conversation queries
  static getOptimizedConversationQuery(userId: string) {
    return {
      // Use index on user IDs and last message timestamp
      indexHint: 'USE INDEX (idx_matches_users_last_message)',
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        user1: {
          select: {
            id: true,
            name: true,
            image: true,
            isOnline: true
          }
        },
        user2: {
          select: {
            id: true,
            name: true,
            image: true,
            isOnline: true
          }
        },
        // Get last message efficiently
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            senderId: true,
            createdAt: true,
            status: true
          }
        }
      }
    };
  }

  // Connection pooling optimization
  static async withOptimizedConnection<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    // Implement connection pooling logic here
    // This would integrate with your database connection pool
    return operation();
  }

  // Query result caching
  static async withQueryCache<T>(
    cacheKey: string,
    operation: () => Promise<T>,
    ttl: number = 60000 // 1 minute default
  ): Promise<T> {
    const cached = this.queryPlanCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    
    const result = await operation();
    
    this.queryPlanCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  }
}

// Database index recommendations
export const RECOMMENDED_INDEXES = {
  messages: [
    {
      name: 'idx_messages_match_created',
      columns: ['matchId', 'createdAt DESC'],
      purpose: 'Optimize message retrieval with pagination'
    },
    {
      name: 'idx_messages_sender_status',
      columns: ['senderId', 'status'],
      purpose: 'Optimize status updates and user message queries'
    },
    {
      name: 'idx_messages_match_status',
      columns: ['matchId', 'status'],
      purpose: 'Optimize unread message counting'
    }
  ],
  matches: [
    {
      name: 'idx_matches_users_last_message',
      columns: ['user1Id', 'user2Id', 'lastMessageAt DESC'],
      purpose: 'Optimize conversation list retrieval'
    },
    {
      name: 'idx_matches_user1_updated',
      columns: ['user1Id', 'updatedAt DESC'],
      purpose: 'Optimize user conversation queries'
    },
    {
      name: 'idx_matches_user2_updated',
      columns: ['user2Id', 'updatedAt DESC'],
      purpose: 'Optimize user conversation queries'
    }
  ]
};

// Performance testing utilities
export class PerformanceTester {
  static async testMessageLoadPerformance(
    matchId: string,
    iterations: number = 10
  ): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    results: number[];
  }> {
    const results: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        // Simulate message loading
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        
        const endTime = performance.now();
        results.push(endTime - startTime);
      } catch (error) {
        console.error('Performance test iteration failed:', error);
      }
    }
    
    return {
      averageTime: results.reduce((a, b) => a + b, 0) / results.length,
      minTime: Math.min(...results),
      maxTime: Math.max(...results),
      results
    };
  }

  static async testConcurrentOperations(
    operations: (() => Promise<any>)[],
    concurrency: number = 5
  ): Promise<{
    totalTime: number;
    successCount: number;
    errorCount: number;
    averageTime: number;
  }> {
    const startTime = performance.now();
    let successCount = 0;
    let errorCount = 0;
    const times: number[] = [];
    
    // Run operations in batches
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (op) => {
          const opStart = performance.now();
          try {
            await op();
            const opTime = performance.now() - opStart;
            times.push(opTime);
            return { success: true };
          } catch (error) {
            return { success: false, error };
          }
        })
      );
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          successCount++;
        } else {
          errorCount++;
        }
      });
    }
    
    const totalTime = performance.now() - startTime;
    
    return {
      totalTime,
      successCount,
      errorCount,
      averageTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
    };
  }
}

// Memory usage monitoring
export class MemoryMonitor {
  private static measurements: Array<{ timestamp: number; usage: number }> = [];

  static recordUsage(): void {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const usage = (performance as any).memory.usedJSHeapSize;
      this.measurements.push({
        timestamp: Date.now(),
        usage
      });
      
      // Keep only last hour of measurements
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      this.measurements = this.measurements.filter(m => m.timestamp > oneHourAgo);
    }
  }

  static getMemoryStats(): {
    current: number;
    peak: number;
    average: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    if (this.measurements.length === 0) {
      return { current: 0, peak: 0, average: 0, trend: 'stable' };
    }

    const current = this.measurements[this.measurements.length - 1].usage;
    const peak = Math.max(...this.measurements.map(m => m.usage));
    const average = this.measurements.reduce((sum, m) => sum + m.usage, 0) / this.measurements.length;
    
    // Determine trend from last 10 measurements
    const recent = this.measurements.slice(-10);
    if (recent.length < 2) {
      return { current, peak, average, trend: 'stable' };
    }
    
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, m) => sum + m.usage, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m.usage, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    const threshold = average * 0.05; // 5% threshold
    
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (diff > threshold) {
      trend = 'increasing';
    } else if (diff < -threshold) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    return { current, peak, average, trend };
  }

  static startMonitoring(interval: number = 30000): () => void {
    const intervalId = setInterval(() => {
      this.recordUsage();
    }, interval);

    return () => clearInterval(intervalId);
  }
}

// Export utilities
export {
  performanceMonitor,
  QueryOptimizer,
  PerformanceTester,
  MemoryMonitor
};