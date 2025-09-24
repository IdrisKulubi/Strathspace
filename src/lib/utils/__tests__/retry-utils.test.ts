/**
 * Comprehensive tests for retry utilities
 * Tests cover exponential backoff, circuit breaker, retry queue, and error scenarios
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  retryWithBackoff,
  RetryQueue,
  CircuitBreaker,
  batchRetry,
  DEFAULT_RETRY_CONFIG,
  AGGRESSIVE_RETRY_CONFIG,
  CONSERVATIVE_RETRY_CONFIG,
  isRetryableError,
  sleep
} from '../retry-utils';
import { 
  MessagingError, 
  MessagingErrorType, 
  createMessagingError 
} from '../messaging-errors.utils';

// Mock console methods to avoid noise in tests
const originalConsole = console;
beforeEach(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

describe('Retry Utils', () => {
  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await retryWithBackoff(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('database error'))
        .mockResolvedValue('success');
      
      const result = await retryWithBackoff(operation, {
        ...DEFAULT_RETRY_CONFIG,
        baseDelay: 10 // Speed up test
      });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('persistent error'));
      
      await expect(retryWithBackoff(operation, {
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 2,
        baseDelay: 10
      })).rejects.toThrow('persistent error');
      
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry non-retryable errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('authentication required'));
      
      await expect(retryWithBackoff(operation, {
        ...DEFAULT_RETRY_CONFIG,
        retryableErrors: [MessagingErrorType.NETWORK_ERROR] // Auth error not included
      })).rejects.toThrow('authentication required');
      
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should apply exponential backoff', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success');
      
      const startTime = Date.now();
      
      await retryWithBackoff(operation, {
        ...DEFAULT_RETRY_CONFIG,
        baseDelay: 100,
        backoffFactor: 2,
        jitterFactor: 0 // Remove jitter for predictable timing
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should have waited at least 100ms + 200ms = 300ms
      expect(duration).toBeGreaterThanOrEqual(250); // Allow some tolerance
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should respect max delay', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success');
      
      const startTime = Date.now();
      
      await retryWithBackoff(operation, {
        ...DEFAULT_RETRY_CONFIG,
        baseDelay: 1000,
        maxDelay: 500, // Max delay less than calculated delay
        backoffFactor: 2,
        jitterFactor: 0
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should not exceed max delay significantly
      expect(duration).toBeLessThan(1200); // 500ms + 500ms + tolerance
    });

    it('should handle different retry configurations', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success');
      
      // Test aggressive config
      await retryWithBackoff(operation, AGGRESSIVE_RETRY_CONFIG);
      expect(operation).toHaveBeenCalledTimes(2);
      
      operation.mockClear();
      operation
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success');
      
      // Test conservative config
      await retryWithBackoff(operation, CONSERVATIVE_RETRY_CONFIG);
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('RetryQueue', () => {
    let retryQueue: RetryQueue;

    beforeEach(() => {
      retryQueue = new RetryQueue({
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 2,
        baseDelay: 50
      }, 100); // Process every 100ms
    });

    afterEach(() => {
      retryQueue.destroy();
    });

    it('should enqueue and process operations', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const onSuccess = jest.fn();
      
      retryQueue.enqueue('test-op', operation, onSuccess);
      
      // Wait for processing
      await sleep(200);
      
      expect(operation).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith('success');
    });

    it('should retry failed operations', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success');
      const onSuccess = jest.fn();
      
      retryQueue.enqueue('test-op', operation, onSuccess);
      
      // Wait for initial attempt and retry
      await sleep(400);
      
      expect(operation).toHaveBeenCalledTimes(2);
      expect(onSuccess).toHaveBeenCalledWith('success');
    });

    it('should call failure callback after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('persistent error'));
      const onFailure = jest.fn();
      
      retryQueue.enqueue('test-op', operation, undefined, onFailure);
      
      // Wait for all retry attempts
      await sleep(600);
      
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(onFailure).toHaveBeenCalled();
    });

    it('should process operations by priority', async () => {
      const lowPriorityOp = jest.fn().mockResolvedValue('low');
      const highPriorityOp = jest.fn().mockResolvedValue('high');
      const results: string[] = [];
      
      retryQueue.enqueue('low', lowPriorityOp, (result) => results.push(result), undefined, 1);
      retryQueue.enqueue('high', highPriorityOp, (result) => results.push(result), undefined, 5);
      
      await sleep(200);
      
      expect(results).toEqual(['high', 'low']);
    });

    it('should provide queue status', () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      retryQueue.enqueue('test-op', operation);
      
      const status = retryQueue.getStatus();
      expect(status.size).toBe(1);
      expect(status.isProcessing).toBe(true);
      expect(status.operations).toHaveLength(1);
      expect(status.operations[0].id).toBe('test-op');
    });

    it('should clear queue', () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      retryQueue.enqueue('test-op-1', operation);
      retryQueue.enqueue('test-op-2', operation);
      
      expect(retryQueue.getStatus().size).toBe(2);
      
      retryQueue.clear();
      
      expect(retryQueue.getStatus().size).toBe(0);
    });
  });

  describe('CircuitBreaker', () => {
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker(2, 100, 1); // 2 failures, 100ms recovery, 1 success to close
    });

    it('should allow operations when closed', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(operation);
      
      expect(result).toBe('success');
      expect(circuitBreaker.getState().state).toBe('CLOSED');
    });

    it('should open after failure threshold', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('failure'));
      
      // First failure
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('failure');
      expect(circuitBreaker.getState().state).toBe('CLOSED');
      
      // Second failure - should open circuit
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('failure');
      expect(circuitBreaker.getState().state).toBe('OPEN');
    });

    it('should reject operations when open', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('failure'));
      
      // Trigger circuit to open
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('failure');
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('failure');
      
      expect(circuitBreaker.getState().state).toBe('OPEN');
      
      // Should reject without calling operation
      const newOperation = jest.fn().mockResolvedValue('success');
      await expect(circuitBreaker.execute(newOperation)).rejects.toThrow('Circuit breaker is OPEN');
      expect(newOperation).not.toHaveBeenCalled();
    });

    it('should transition to half-open after recovery timeout', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('failure'));
      
      // Open the circuit
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('failure');
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('failure');
      
      expect(circuitBreaker.getState().state).toBe('OPEN');
      
      // Wait for recovery timeout
      await sleep(150);
      
      // Next operation should transition to half-open
      const successOperation = jest.fn().mockResolvedValue('success');
      const result = await circuitBreaker.execute(successOperation);
      
      expect(result).toBe('success');
      expect(circuitBreaker.getState().state).toBe('CLOSED');
    });

    it('should reset circuit breaker', () => {
      const operation = jest.fn().mockRejectedValue(new Error('failure'));
      
      // Open the circuit
      circuitBreaker.execute(operation).catch(() => {});
      circuitBreaker.execute(operation).catch(() => {});
      
      expect(circuitBreaker.getState().state).toBe('OPEN');
      
      circuitBreaker.reset();
      
      expect(circuitBreaker.getState().state).toBe('CLOSED');
      expect(circuitBreaker.getState().failures).toBe(0);
    });
  });

  describe('batchRetry', () => {
    it('should process operations in batches', async () => {
      const operations = Array.from({ length: 7 }, (_, i) => 
        jest.fn().mockResolvedValue(`result-${i}`)
      );
      
      const results = await batchRetry(operations, DEFAULT_RETRY_CONFIG, 3);
      
      expect(results).toHaveLength(7);
      results.forEach((result, i) => {
        expect(result.success).toBe(true);
        expect(result.result).toBe(`result-${i}`);
      });
    });

    it('should handle mixed success and failure', async () => {
      const operations = [
        jest.fn().mockResolvedValue('success-1'),
        jest.fn().mockRejectedValue(new Error('failure-1')),
        jest.fn().mockResolvedValue('success-2'),
        jest.fn().mockRejectedValue(new Error('failure-2'))
      ];
      
      const results = await batchRetry(operations, {
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 1,
        baseDelay: 10
      });
      
      expect(results).toHaveLength(4);
      expect(results[0].success).toBe(true);
      expect(results[0].result).toBe('success-1');
      expect(results[1].success).toBe(false);
      expect(results[1].error?.message).toBe('failure-1');
      expect(results[2].success).toBe(true);
      expect(results[2].result).toBe('success-2');
      expect(results[3].success).toBe(false);
      expect(results[3].error?.message).toBe('failure-2');
    });

    it('should retry failed operations in batch', async () => {
      const operations = [
        jest.fn()
          .mockRejectedValueOnce(new Error('network error'))
          .mockResolvedValue('success-after-retry'),
        jest.fn().mockResolvedValue('immediate-success')
      ];
      
      const results = await batchRetry(operations, {
        ...DEFAULT_RETRY_CONFIG,
        baseDelay: 10
      });
      
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].result).toBe('success-after-retry');
      expect(results[1].success).toBe(true);
      expect(results[1].result).toBe('immediate-success');
      
      expect(operations[0]).toHaveBeenCalledTimes(2); // Initial + 1 retry
      expect(operations[1]).toHaveBeenCalledTimes(1); // No retry needed
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable errors correctly', () => {
      const networkError = createMessagingError(MessagingErrorType.NETWORK_ERROR);
      const authError = createMessagingError(MessagingErrorType.AUTH_ERROR);
      
      const config = {
        ...DEFAULT_RETRY_CONFIG,
        retryableErrors: [MessagingErrorType.NETWORK_ERROR]
      };
      
      expect(isRetryableError(networkError, config)).toBe(true);
      expect(isRetryableError(authError, config)).toBe(false);
    });

    it('should fall back to error.retryable when no specific config', () => {
      const retryableError = createMessagingError(MessagingErrorType.NETWORK_ERROR);
      const nonRetryableError = createMessagingError(MessagingErrorType.AUTH_ERROR);
      
      const config = { ...DEFAULT_RETRY_CONFIG };
      delete config.retryableErrors;
      
      expect(isRetryableError(retryableError, config)).toBe(true);
      expect(isRetryableError(nonRetryableError, config)).toBe(false);
    });
  });

  describe('sleep', () => {
    it('should wait for specified duration', async () => {
      const startTime = Date.now();
      
      await sleep(100);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeGreaterThanOrEqual(90); // Allow some tolerance
      expect(duration).toBeLessThan(150);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle operation that throws non-Error objects', async () => {
      const operation = jest.fn().mockRejectedValue('string error');
      
      await expect(retryWithBackoff(operation, {
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 1,
        baseDelay: 10
      })).rejects.toBe('string error');
    });

    it('should handle operation that throws null/undefined', async () => {
      const operation = jest.fn().mockRejectedValue(null);
      
      await expect(retryWithBackoff(operation, {
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 1,
        baseDelay: 10
      })).rejects.toBeNull();
    });

    it('should handle very large retry counts gracefully', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await retryWithBackoff(operation, {
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 1000000 // Very large number
      });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1); // Should succeed immediately
    });

    it('should handle zero retry configuration', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('failure'));
      
      await expect(retryWithBackoff(operation, {
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 0
      })).rejects.toThrow('failure');
      
      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent retry operations', async () => {
      const operations = Array.from({ length: 10 }, (_, i) => 
        () => retryWithBackoff(
          jest.fn().mockResolvedValue(`result-${i}`),
          { ...DEFAULT_RETRY_CONFIG, baseDelay: 10 }
        )
      );
      
      const startTime = Date.now();
      const results = await Promise.all(operations.map(op => op()));
      const endTime = Date.now();
      
      expect(results).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(500); // Should be fast for successful operations
    });

    it('should handle retry queue with many operations', async () => {
      const retryQueue = new RetryQueue({
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 1,
        baseDelay: 10
      }, 50);
      
      const results: string[] = [];
      
      // Enqueue many operations
      for (let i = 0; i < 20; i++) {
        retryQueue.enqueue(
          `op-${i}`,
          jest.fn().mockResolvedValue(`result-${i}`),
          (result) => results.push(result)
        );
      }
      
      // Wait for processing
      await sleep(500);
      
      expect(results).toHaveLength(20);
      
      retryQueue.destroy();
    });
  });
});