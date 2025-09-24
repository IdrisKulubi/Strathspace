/**
 * Offline message queue for handling network disconnections
 * Stores messages locally and syncs when connection is restored
 */

import { MessagingError, MessagingErrorType, createMessagingError } from './messaging-errors.utils';
import { RetryQueue, DEFAULT_RETRY_CONFIG, type RetryConfig } from './retry-utils';
import { sendMessageAction } from '@/lib/actions/messaging.actions';

export interface QueuedMessage {
  id: string;
  matchId: string;
  content: string;
  timestamp: Date;
  attempts: number;
  lastAttempt?: Date;
  error?: string;
}

export interface OfflineQueueOptions {
  maxQueueSize?: number;
  maxMessageAge?: number; // in milliseconds
  retryConfig?: RetryConfig;
  storageKey?: string;
}

/**
 * Offline message queue that persists messages in localStorage
 * and automatically syncs when connection is restored
 */
export class OfflineMessageQueue {
  private queue: Map<string, QueuedMessage> = new Map();
  private retryQueue: RetryQueue;
  private isOnline = navigator.onLine;
  private storageKey: string;
  private maxQueueSize: number;
  private maxMessageAge: number;

  constructor(options: OfflineQueueOptions = {}) {
    this.storageKey = options.storageKey || 'messaging_offline_queue';
    this.maxQueueSize = options.maxQueueSize || 100;
    this.maxMessageAge = options.maxMessageAge || 24 * 60 * 60 * 1000; // 24 hours
    this.retryQueue = new RetryQueue(options.retryConfig || DEFAULT_RETRY_CONFIG);

    // Load persisted queue from localStorage
    this.loadFromStorage();

    // Set up online/offline event listeners
    this.setupNetworkListeners();

    // Clean up old messages periodically
    this.setupCleanup();
  }

  /**
   * Add a message to the offline queue
   */
  enqueueMessage(matchId: string, content: string): string {
    const messageId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const queuedMessage: QueuedMessage = {
      id: messageId,
      matchId,
      content: content.trim(),
      timestamp: new Date(),
      attempts: 0
    };

    // Check queue size limit
    if (this.queue.size >= this.maxQueueSize) {
      // Remove oldest message
      const oldestId = Array.from(this.queue.keys())[0];
      this.queue.delete(oldestId);
    }

    this.queue.set(messageId, queuedMessage);
    this.saveToStorage();

    // If online, try to send immediately
    if (this.isOnline) {
      this.processMessage(messageId);
    }

    return messageId;
  }

  /**
   * Remove a message from the queue
   */
  dequeueMessage(messageId: string): boolean {
    const removed = this.queue.delete(messageId);
    if (removed) {
      this.saveToStorage();
    }
    return removed;
  }

  /**
   * Get all queued messages
   */
  getQueuedMessages(): QueuedMessage[] {
    return Array.from(this.queue.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
  }

  /**
   * Get queued messages for a specific match
   */
  getQueuedMessagesForMatch(matchId: string): QueuedMessage[] {
    return this.getQueuedMessages().filter(msg => msg.matchId === matchId);
  }

  /**
   * Get queue status
   */
  getStatus(): {
    isOnline: boolean;
    queueSize: number;
    oldestMessage?: Date;
    newestMessage?: Date;
    failedMessages: number;
  } {
    const messages = this.getQueuedMessages();
    const failedMessages = messages.filter(msg => msg.error).length;

    return {
      isOnline: this.isOnline,
      queueSize: this.queue.size,
      oldestMessage: messages.length > 0 ? messages[0].timestamp : undefined,
      newestMessage: messages.length > 0 ? messages[messages.length - 1].timestamp : undefined,
      failedMessages
    };
  }

  /**
   * Clear all queued messages
   */
  clear(): void {
    this.queue.clear();
    this.saveToStorage();
  }

  /**
   * Manually trigger sync of all queued messages
   */
  async syncAll(): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ messageId: string; error: string }>;
  }> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ messageId: string; error: string }>
    };

    const messages = this.getQueuedMessages();
    
    for (const message of messages) {
      try {
        await this.processMessage(message.id);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          messageId: message.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  /**
   * Process a single message from the queue
   */
  private async processMessage(messageId: string): Promise<void> {
    const message = this.queue.get(messageId);
    if (!message) {
      return;
    }

    // Update attempt count
    message.attempts++;
    message.lastAttempt = new Date();
    this.saveToStorage();

    try {
      // Attempt to send the message
      const result = await sendMessageAction(message.matchId, message.content);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }

      // Success - remove from queue
      this.dequeueMessage(messageId);
      
      // Emit success event
      this.emitEvent('message-sent', { messageId, message: result.data });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      message.error = errorMessage;
      this.saveToStorage();

      // Check if we should retry
      const messagingError = this.normalizeError(error);
      if (messagingError.retryable && message.attempts < 5) {
        // Add to retry queue for later processing
        this.retryQueue.enqueue(
          messageId,
          () => this.processMessage(messageId),
          () => {
            // Success callback handled in processMessage
          },
          (retryError) => {
            // Final failure - emit error event
            this.emitEvent('message-failed', { messageId, error: retryError.message });
          },
          1 // Normal priority
        );
      } else {
        // Non-retryable error or max attempts reached
        this.emitEvent('message-failed', { messageId, error: errorMessage });
      }

      throw error;
    }
  }

  /**
   * Set up network status listeners
   */
  private setupNetworkListeners(): void {
    const handleOnline = () => {
      console.log('Network connection restored, processing offline queue');
      this.isOnline = true;
      this.processAllMessages();
      this.emitEvent('online', { queueSize: this.queue.size });
    };

    const handleOffline = () => {
      console.log('Network connection lost, messages will be queued');
      this.isOnline = false;
      this.emitEvent('offline', { queueSize: this.queue.size });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Store cleanup function
    this.cleanup = () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      this.retryQueue.destroy();
    };
  }

  /**
   * Process all queued messages when coming online
   */
  private async processAllMessages(): Promise<void> {
    const messages = this.getQueuedMessages();
    
    // Process messages in order, but don't wait for each one
    for (const message of messages) {
      // Add small delay to avoid overwhelming the server
      setTimeout(() => {
        this.processMessage(message.id).catch(error => {
          console.warn(`Failed to process queued message ${message.id}:`, error);
        });
      }, Math.random() * 1000); // Random delay up to 1 second
    }
  }

  /**
   * Set up periodic cleanup of old messages
   */
  private setupCleanup(): void {
    const cleanupInterval = setInterval(() => {
      this.cleanupOldMessages();
    }, 60000); // Clean up every minute

    // Store cleanup function
    const originalCleanup = this.cleanup;
    this.cleanup = () => {
      clearInterval(cleanupInterval);
      if (originalCleanup) {
        originalCleanup();
      }
    };
  }

  /**
   * Remove messages older than maxMessageAge
   */
  private cleanupOldMessages(): void {
    const now = Date.now();
    let cleaned = false;

    for (const [messageId, message] of this.queue.entries()) {
      if (now - message.timestamp.getTime() > this.maxMessageAge) {
        this.queue.delete(messageId);
        cleaned = true;
      }
    }

    if (cleaned) {
      this.saveToStorage();
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.queue = new Map(
          data.map((item: any) => [
            item.id,
            {
              ...item,
              timestamp: new Date(item.timestamp),
              lastAttempt: item.lastAttempt ? new Date(item.lastAttempt) : undefined
            }
          ])
        );
      }
    } catch (error) {
      console.error('Failed to load offline queue from storage:', error);
      this.queue = new Map();
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = Array.from(this.queue.values());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save offline queue to storage:', error);
    }
  }

  /**
   * Normalize errors for consistent handling
   */
  private normalizeError(error: unknown): MessagingError {
    if (error instanceof Error) {
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return createMessagingError(
          MessagingErrorType.NETWORK_ERROR,
          error.message
        );
      }
    }

    return createMessagingError(
      MessagingErrorType.UNKNOWN_ERROR,
      error instanceof Error ? error.message : String(error)
    );
  }

  /**
   * Event system for notifying about queue events
   */
  private eventListeners: Map<string, Array<(data: any) => void>> = new Map();

  addEventListener(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  removeEventListener(event: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Cleanup function to be called when destroying the queue
   */
  private cleanup?: () => void;

  /**
   * Destroy the offline queue and clean up resources
   */
  destroy(): void {
    if (this.cleanup) {
      this.cleanup();
    }
    this.eventListeners.clear();
  }
}

/**
 * Global offline queue instance
 */
let globalOfflineQueue: OfflineMessageQueue | null = null;

/**
 * Get or create the global offline queue instance
 */
export function getOfflineQueue(options?: OfflineQueueOptions): OfflineMessageQueue {
  if (!globalOfflineQueue) {
    globalOfflineQueue = new OfflineMessageQueue(options);
  }
  return globalOfflineQueue;
}

/**
 * Hook for using the offline queue in React components
 */
export function useOfflineQueue(options?: OfflineQueueOptions) {
  const queue = getOfflineQueue(options);
  
  return {
    enqueueMessage: (matchId: string, content: string) => queue.enqueueMessage(matchId, content),
    getQueuedMessages: () => queue.getQueuedMessages(),
    getQueuedMessagesForMatch: (matchId: string) => queue.getQueuedMessagesForMatch(matchId),
    getStatus: () => queue.getStatus(),
    syncAll: () => queue.syncAll(),
    clear: () => queue.clear(),
    addEventListener: (event: string, callback: (data: any) => void) => queue.addEventListener(event, callback),
    removeEventListener: (event: string, callback: (data: any) => void) => queue.removeEventListener(event, callback)
  };
}