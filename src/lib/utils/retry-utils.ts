/**
 * Enhanced retry utilities for messaging system with exponential backoff
 * and comprehensive error handling
 */

import { MessagingError, MessagingErrorType, normalizeError } from './messaging-errors.utils';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitterFactor: number;
  retryableErrors?: MessagingErrorType[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2,
  jitterFactor: 0.1, // 10% jitter
  retryableErrors: [
    MessagingErrorType.NETWORK_ERROR,
    MessagingErrorType.DATABASE_ERROR,
    MessagingErrorType.UNKNOWN_ERROR
  ]
};

export const AGGRESSIVE_RETRY_CONFIG: RetryConfig = {
  ...DEFAULT_RETRY_CONFIG,
  maxRetries: 5,
  baseDelay: 500,
  backoffFactor: 1.5
};

export const CONSERVATIVE_RETRY_CONFIG: RetryConfig = {
  ...DEFAULT_RETRY_CONFIG,
  maxRetries: 2,
  baseDelay: 2000,
  backoffFactor: 3
};

/**
 * Retry an operation with exponential backoff and jitter
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context?: string
): Promise<T> {
  let lastError: Error;
  const startTime = Date.now();
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await operation();
      
      // Log successful retry if it wasn't the first attempt
      if (attempt > 0) {
        console.log(`${context || 'Operation'} succeeded after ${attempt} retries (${Date.now() - startTime}ms)`);
      }
      
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on the last attempt
      if (attempt === config.maxRetries) {
        break;
      }

      // Check if error is retryable
      const messagingError = normalizeError(error);
      if (!isRetryableError(messagingError, config)) {
        console.warn(`${context || 'Operation'} failed with non-retryable error:`, messagingError);
        throw lastError;
      }

      // Calculate delay with exponential backoff and jitter
      const baseDelay = config.baseDelay * Math.pow(config.backoffFactor, attempt);
      const jitter = baseDelay * config.jitterFactor * (Math.random() * 2 - 1);
      const delay = Math.min(baseDelay + jitter, config.maxDelay);

      console.warn(`${context || 'Operation'} attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms:`, error);
      
      await sleep(delay);
    }
  }

  console.error(`${context || 'Operation'} failed after ${config.maxRetries} retries (${Date.now() - startTime}ms)`);
  throw lastError!;
}

/**
 * Check if an error is retryable based on configuration
 */
export function isRetryableError(error: MessagingError, config: RetryConfig): boolean {
  if (config.retryableErrors) {
    return config.retryableErrors.includes(error.type);
  }
  return error.retryable;
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry queue for managing failed operations
 */
export class RetryQueue {
  private queue: Map<string, QueuedOperation> = new Map();
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(
    private config: RetryConfig = DEFAULT_RETRY_CONFIG,
    private processInterval: number = 5000 // Process queue every 5 seconds
  ) {}

  /**
   * Add an operation to the retry queue
   */
  enqueue<T>(
    id: string,
    operation: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onFailure?: (error: Error) => void,
    priority: number = 0
  ): void {
    const queuedOp: QueuedOperation = {
      id,
      operation,
      onSuccess,
      onFailure,
      priority,
      attempts: 0,
      lastAttempt: null,
      createdAt: new Date()
    };

    this.queue.set(id, queuedOp);
    this.startProcessing();
  }

  /**
   * Remove an operation from the queue
   */
  dequeue(id: string): boolean {
    return this.queue.delete(id);
  }

  /**
   * Get queue status
   */
  getStatus(): {
    size: number;
    isProcessing: boolean;
    operations: Array<{
      id: string;
      attempts: number;
      lastAttempt: Date | null;
      createdAt: Date;
    }>;
  } {
    return {
      size: this.queue.size,
      isProcessing: this.isProcessing,
      operations: Array.from(this.queue.values()).map(op => ({
        id: op.id,
        attempts: op.attempts,
        lastAttempt: op.lastAttempt,
        createdAt: op.createdAt
      }))
    };
  }

  /**
   * Clear all operations from the queue
   */
  clear(): void {
    this.queue.clear();
    this.stopProcessing();
  }

  /**
   * Start processing the queue
   */
  private startProcessing(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, this.processInterval);
  }

  /**
   * Stop processing the queue
   */
  private stopProcessing(): void {
    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Process queued operations
   */
  private async processQueue(): Promise<void> {
    if (this.queue.size === 0) {
      this.stopProcessing();
      return;
    }

    // Sort operations by priority (higher first) and creation time
    const operations = Array.from(this.queue.values()).sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    for (const op of operations) {
      // Check if operation should be retried
      if (op.attempts >= this.config.maxRetries) {
        // Max retries reached, remove from queue and call failure callback
        this.queue.delete(op.id);
        if (op.onFailure) {
          op.onFailure(new Error(`Max retries (${this.config.maxRetries}) reached for operation ${op.id}`));
        }
        continue;
      }

      // Check if enough time has passed since last attempt
      if (op.lastAttempt) {
        const timeSinceLastAttempt = Date.now() - op.lastAttempt.getTime();
        const requiredDelay = this.config.baseDelay * Math.pow(this.config.backoffFactor, op.attempts);
        
        if (timeSinceLastAttempt < requiredDelay) {
          continue; // Not ready to retry yet
        }
      }

      // Attempt the operation
      try {
        op.attempts++;
        op.lastAttempt = new Date();
        
        const result = await op.operation();
        
        // Success - remove from queue and call success callback
        this.queue.delete(op.id);
        if (op.onSuccess) {
          op.onSuccess(result);
        }
        
      } catch (error) {
        console.warn(`Retry queue operation ${op.id} failed (attempt ${op.attempts}):`, error);
        
        // Check if error is retryable
        const messagingError = normalizeError(error);
        if (!isRetryableError(messagingError, this.config)) {
          // Non-retryable error - remove from queue and call failure callback
          this.queue.delete(op.id);
          if (op.onFailure) {
            op.onFailure(error instanceof Error ? error : new Error(String(error)));
          }
        }
        // If retryable, leave in queue for next attempt
      }
    }
  }

  /**
   * Destroy the retry queue and clean up resources
   */
  destroy(): void {
    this.clear();
    this.stopProcessing();
  }
}

interface QueuedOperation {
  id: string;
  operation: () => Promise<any>;
  onSuccess?: (result: any) => void;
  onFailure?: (error: Error) => void;
  priority: number;
  attempts: number;
  lastAttempt: Date | null;
  createdAt: Date;
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: number | null = null;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000, // 1 minute
    private successThreshold: number = 2
  ) {}

  /**
   * Execute an operation through the circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failures: number;
    lastFailureTime: number | null;
  } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED';
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  private shouldAttemptReset(): boolean {
    return this.lastFailureTime !== null && 
           (Date.now() - this.lastFailureTime) >= this.recoveryTimeout;
  }
}

/**
 * Batch retry utility for processing multiple operations
 */
export async function batchRetry<T>(
  operations: Array<() => Promise<T>>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  batchSize: number = 5
): Promise<Array<{ success: boolean; result?: T; error?: Error }>> {
  const results: Array<{ success: boolean; result?: T; error?: Error }> = [];
  
  // Process operations in batches
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (operation, index) => {
      try {
        const result = await retryWithBackoff(operation, config, `Batch operation ${i + index}`);
        return { success: true, result };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}