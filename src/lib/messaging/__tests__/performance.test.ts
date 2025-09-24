/**
 * Performance monitoring and optimization tests
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  performanceMonitor,
  QueryOptimizer,
  PerformanceTester,
  MemoryMonitor,
  measurePerformance
} from '../performance';

describe('Performance Monitoring', () => {
  beforeEach(() => {
    performanceMonitor.reset();
  });

  describe('PerformanceMonitor', () => {
    it('should record query metrics', () => {
      const metrics = {
        operation: 'test-query',
        duration: 150,
        timestamp: Date.now(),
        success: true
      };

      performanceMonitor.recordQuery(metrics);
      
      const stats = performanceMonitor.getStats();
      expect(stats.totalQueries).toBe(1);
      expect(stats.averageQueryTime).toBe(150);
      expect(stats.successRate).toBe(100);
    });

    it('should calculate correct statistics', () => {
      const queries = [
        { operation: 'query1', duration: 100, timestamp: Date.now(), success: true },
        { operation: 'query2', duration: 200, timestamp: Date.now(), success: true },
        { operation: 'query3', duration: 300, timestamp: Date.now(), success: false, error: 'Test error' }
      ];

      queries.forEach(query => performanceMonitor.recordQuery(query));
      
      const stats = performanceMonitor.getStats();
      expect(stats.totalQueries).toBe(3);
      expect(stats.averageQueryTime).toBe(150); // Average of successful queries
      expect(stats.successRate).toBe(66.67); // 2/3 * 100
      expect(stats.errorRate).toBe(33.33); // 1/3 * 100
    });

    it('should identify slow queries', () => {
      const slowQuery = {
        operation: 'slow-query',
        duration: 2000, // 2 seconds
        timestamp: Date.now(),
        success: true
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      performanceMonitor.recordQuery(slowQuery);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow query detected'),
        expect.any(Object)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('measurePerformance decorator', () => {
    it('should measure function execution time', async () => {
      const testFunction = async (delay: number) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        return 'success';
      };

      const measuredFunction = measurePerformance('test-operation', testFunction);
      
      const result = await measuredFunction(100);
      
      expect(result).toBe('success');
      
      const stats = performanceMonitor.getStats();
      expect(stats.totalQueries).toBe(1);
      expect(stats.averageQueryTime).toBeGreaterThan(90); // Should be around 100ms
    });

    it('should handle function errors correctly', async () => {
      const errorFunction = async () => {
        throw new Error('Test error');
      };

      const measuredFunction = measurePerformance('error-operation', errorFunction);
      
      await expect(measuredFunction()).rejects.toThrow('Test error');
      
      const stats = performanceMonitor.getStats();
      expect(stats.totalQueries).toBe(1);
      expect(stats.successRate).toBe(0);
      expect(stats.errorRate).toBe(100);
    });
  });
});