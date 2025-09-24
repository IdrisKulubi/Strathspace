/**
 * Message caching and localStorage persistence utilities
 * Provides offline support and performance optimization for messaging
 */

import { MessageWithSender, ConversationPreview } from '@/lib/actions/messaging.actions';

// Cache configuration
const CACHE_CONFIG = {
  // Cache keys
  MESSAGES_KEY: 'strathspace_messages',
  CONVERSATIONS_KEY: 'strathspace_conversations',
  QUEUE_KEY: 'strathspace_message_queue',
  METADATA_KEY: 'strathspace_cache_metadata',
  
  // Cache limits
  MAX_MESSAGES_PER_CONVERSATION: 500,
  MAX_CONVERSATIONS: 50,
  MAX_QUEUE_SIZE: 100,
  
  // Cache expiry (24 hours)
  CACHE_EXPIRY_MS: 24 * 60 * 60 * 1000,
  
  // Compression threshold (messages larger than this will be compressed)
  COMPRESSION_THRESHOLD: 1024,
};

// Types
export interface CachedMessage extends MessageWithSender {
  cachedAt: number;
  localId?: string;
}

export interface CachedConversation extends ConversationPreview {
  cachedAt: number;
  messageCount: number;
}

export interface QueuedMessage {
  id: string;
  matchId: string;
  content: string;
  localId: string;
  createdAt: number;
  retryCount: number;
  lastRetryAt?: number;
}

export interface CacheMetadata {
  version: string;
  lastCleanup: number;
  totalSize: number;
}

// Utility functions
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

function compressData(data: string): string {
  // Simple compression using LZ-string if available, otherwise return as-is
  if (typeof window !== 'undefined' && 'LZString' in window) {
    return (window as any).LZString.compress(data);
  }
  return data;
}

function decompressData(data: string): string {
  // Simple decompression using LZ-string if available, otherwise return as-is
  if (typeof window !== 'undefined' && 'LZString' in window) {
    try {
      const decompressed = (window as any).LZString.decompress(data);
      return decompressed || data;
    } catch {
      return data;
    }
  }
  return data;
}

function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function safeJSONParse<T>(data: string | null, fallback: T): T {
  if (!data) return fallback;
  
  try {
    const parsed = JSON.parse(decompressData(data));
    return parsed || fallback;
  } catch (error) {
    console.warn('Failed to parse cached data:', error);
    return fallback;
  }
}

function safeJSONStringify(data: any): string {
  try {
    const stringified = JSON.stringify(data);
    return stringified.length > CACHE_CONFIG.COMPRESSION_THRESHOLD 
      ? compressData(stringified) 
      : stringified;
  } catch (error) {
    console.error('Failed to stringify data for cache:', error);
    return '{}';
  }
}

// Cache management class
export class MessageCache {
  private static instance: MessageCache;
  private isAvailable: boolean;

  private constructor() {
    this.isAvailable = isLocalStorageAvailable();
    
    if (this.isAvailable) {
      this.initializeCache();
      this.scheduleCleanup();
    }
  }

  static getInstance(): MessageCache {
    if (!MessageCache.instance) {
      MessageCache.instance = new MessageCache();
    }
    return MessageCache.instance;
  }

  private initializeCache(): void {
    // Initialize cache metadata if not exists
    const metadata = this.getMetadata();
    if (!metadata.version) {
      this.setMetadata({
        version: '1.0.0',
        lastCleanup: Date.now(),
        totalSize: 0
      });
    }
  }

  private scheduleCleanup(): void {
    // Schedule periodic cleanup (every hour)
    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  private getMetadata(): CacheMetadata {
    if (!this.isAvailable) return { version: '', lastCleanup: 0, totalSize: 0 };
    
    return safeJSONParse(
      localStorage.getItem(CACHE_CONFIG.METADATA_KEY),
      { version: '', lastCleanup: 0, totalSize: 0 }
    );
  }

  private setMetadata(metadata: CacheMetadata): void {
    if (!this.isAvailable) return;
    
    localStorage.setItem(CACHE_CONFIG.METADATA_KEY, safeJSONStringify(metadata));
  }

  // Message caching methods
  cacheMessages(matchId: string, messages: MessageWithSender[]): void {
    if (!this.isAvailable || !messages.length) return;

    try {
      const cachedMessages: CachedMessage[] = messages.map(msg => ({
        ...msg,
        cachedAt: Date.now()
      }));

      // Get existing cache
      const existingCache = this.getCachedMessages(matchId);
      
      // Merge with existing messages, avoiding duplicates
      const messageMap = new Map<string, CachedMessage>();
      
      // Add existing messages
      existingCache.forEach(msg => messageMap.set(msg.id, msg));
      
      // Add new messages (will overwrite existing with same ID)
      cachedMessages.forEach(msg => messageMap.set(msg.id, msg));
      
      // Convert back to array and sort by creation time
      const mergedMessages = Array.from(messageMap.values())
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      // Limit cache size
      const limitedMessages = mergedMessages.slice(-CACHE_CONFIG.MAX_MESSAGES_PER_CONVERSATION);
      
      // Store in localStorage
      const cacheKey = `${CACHE_CONFIG.MESSAGES_KEY}_${matchId}`;
      localStorage.setItem(cacheKey, safeJSONStringify(limitedMessages));
      
      this.updateCacheSize();
      
    } catch (error) {
      console.error('Failed to cache messages:', error);
    }
  }

  getCachedMessages(matchId: string): CachedMessage[] {
    if (!this.isAvailable) return [];

    try {
      const cacheKey = `${CACHE_CONFIG.MESSAGES_KEY}_${matchId}`;
      const cached = safeJSONParse(localStorage.getItem(cacheKey), []);
      
      // Filter out expired messages
      const now = Date.now();
      return cached.filter((msg: CachedMessage) => 
        now - msg.cachedAt < CACHE_CONFIG.CACHE_EXPIRY_MS
      );
      
    } catch (error) {
      console.error('Failed to get cached messages:', error);
      return [];
    }
  }

  // Conversation caching methods
  cacheConversations(conversations: ConversationPreview[]): void {
    if (!this.isAvailable || !conversations.length) return;

    try {
      const cachedConversations: CachedConversation[] = conversations.map(conv => ({
        ...conv,
        cachedAt: Date.now(),
        messageCount: 0 // Will be updated when messages are cached
      }));

      // Limit cache size
      const limitedConversations = cachedConversations.slice(0, CACHE_CONFIG.MAX_CONVERSATIONS);
      
      localStorage.setItem(CACHE_CONFIG.CONVERSATIONS_KEY, safeJSONStringify(limitedConversations));
      this.updateCacheSize();
      
    } catch (error) {
      console.error('Failed to cache conversations:', error);
    }
  }

  getCachedConversations(): CachedConversation[] {
    if (!this.isAvailable) return [];

    try {
      const cached = safeJSONParse(localStorage.getItem(CACHE_CONFIG.CONVERSATIONS_KEY), []);
      
      // Filter out expired conversations
      const now = Date.now();
      return cached.filter((conv: CachedConversation) => 
        now - conv.cachedAt < CACHE_CONFIG.CACHE_EXPIRY_MS
      );
      
    } catch (error) {
      console.error('Failed to get cached conversations:', error);
      return [];
    }
  }

  // Message queue methods (for offline support)
  queueMessage(matchId: string, content: string): QueuedMessage {
    const queuedMessage: QueuedMessage = {
      id: generateLocalId(),
      matchId,
      content,
      localId: generateLocalId(),
      createdAt: Date.now(),
      retryCount: 0
    };

    if (!this.isAvailable) return queuedMessage;

    try {
      const queue = this.getMessageQueue();
      queue.push(queuedMessage);
      
      // Limit queue size
      const limitedQueue = queue.slice(-CACHE_CONFIG.MAX_QUEUE_SIZE);
      
      localStorage.setItem(CACHE_CONFIG.QUEUE_KEY, safeJSONStringify(limitedQueue));
      this.updateCacheSize();
      
    } catch (error) {
      console.error('Failed to queue message:', error);
    }

    return queuedMessage;
  }

  getMessageQueue(): QueuedMessage[] {
    if (!this.isAvailable) return [];

    try {
      return safeJSONParse(localStorage.getItem(CACHE_CONFIG.QUEUE_KEY), []);
    } catch (error) {
      console.error('Failed to get message queue:', error);
      return [];
    }
  }

  removeFromQueue(messageId: string): void {
    if (!this.isAvailable) return;

    try {
      const queue = this.getMessageQueue();
      const filteredQueue = queue.filter(msg => msg.id !== messageId);
      
      localStorage.setItem(CACHE_CONFIG.QUEUE_KEY, safeJSONStringify(filteredQueue));
      this.updateCacheSize();
      
    } catch (error) {
      console.error('Failed to remove message from queue:', error);
    }
  }

  updateQueuedMessage(messageId: string, updates: Partial<QueuedMessage>): void {
    if (!this.isAvailable) return;

    try {
      const queue = this.getMessageQueue();
      const messageIndex = queue.findIndex(msg => msg.id === messageId);
      
      if (messageIndex !== -1) {
        queue[messageIndex] = { ...queue[messageIndex], ...updates };
        localStorage.setItem(CACHE_CONFIG.QUEUE_KEY, safeJSONStringify(queue));
        this.updateCacheSize();
      }
      
    } catch (error) {
      console.error('Failed to update queued message:', error);
    }
  }

  // Cache management methods
  private updateCacheSize(): void {
    if (!this.isAvailable) return;

    try {
      let totalSize = 0;
      
      // Calculate total cache size
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('strathspace_')) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += key.length + value.length;
          }
        }
      }
      
      const metadata = this.getMetadata();
      this.setMetadata({ ...metadata, totalSize });
      
    } catch (error) {
      console.error('Failed to update cache size:', error);
    }
  }

  cleanup(): void {
    if (!this.isAvailable) return;

    try {
      const now = Date.now();
      const keysToRemove: string[] = [];
      
      // Find expired cache entries
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_CONFIG.MESSAGES_KEY)) {
          const value = localStorage.getItem(key);
          if (value) {
            const messages = safeJSONParse(value, []);
            const validMessages = messages.filter((msg: CachedMessage) => 
              now - msg.cachedAt < CACHE_CONFIG.CACHE_EXPIRY_MS
            );
            
            if (validMessages.length === 0) {
              keysToRemove.push(key);
            } else if (validMessages.length !== messages.length) {
              // Update with only valid messages
              localStorage.setItem(key, safeJSONStringify(validMessages));
            }
          }
        }
      }
      
      // Remove expired entries
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Update metadata
      const metadata = this.getMetadata();
      this.setMetadata({ ...metadata, lastCleanup: now });
      this.updateCacheSize();
      
      console.log(`Cache cleanup completed. Removed ${keysToRemove.length} expired entries.`);
      
    } catch (error) {
      console.error('Failed to cleanup cache:', error);
    }
  }

  clearCache(): void {
    if (!this.isAvailable) return;

    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('strathspace_')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('Cache cleared successfully');
      
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  getCacheStats(): {
    totalSize: number;
    messageCount: number;
    conversationCount: number;
    queueSize: number;
    lastCleanup: number;
  } {
    if (!this.isAvailable) {
      return {
        totalSize: 0,
        messageCount: 0,
        conversationCount: 0,
        queueSize: 0,
        lastCleanup: 0
      };
    }

    try {
      const metadata = this.getMetadata();
      const conversations = this.getCachedConversations();
      const queue = this.getMessageQueue();
      
      let messageCount = 0;
      
      // Count messages across all conversations
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_CONFIG.MESSAGES_KEY)) {
          const messages = this.getCachedMessages(key.replace(CACHE_CONFIG.MESSAGES_KEY + '_', ''));
          messageCount += messages.length;
        }
      }
      
      return {
        totalSize: metadata.totalSize,
        messageCount,
        conversationCount: conversations.length,
        queueSize: queue.length,
        lastCleanup: metadata.lastCleanup
      };
      
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalSize: 0,
        messageCount: 0,
        conversationCount: 0,
        queueSize: 0,
        lastCleanup: 0
      };
    }
  }

  // Optimistic message handling
  addOptimisticMessage(matchId: string, message: Omit<MessageWithSender, 'id' | 'createdAt' | 'updatedAt'>): CachedMessage {
    const optimisticMessage: CachedMessage = {
      ...message,
      id: generateLocalId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'sending',
      cachedAt: Date.now(),
      localId: generateLocalId()
    };

    // Add to cache immediately for optimistic UI
    const existingMessages = this.getCachedMessages(matchId);
    existingMessages.push(optimisticMessage);
    this.cacheMessages(matchId, existingMessages);

    return optimisticMessage;
  }

  updateOptimisticMessage(matchId: string, localId: string, updates: Partial<CachedMessage>): void {
    const messages = this.getCachedMessages(matchId);
    const messageIndex = messages.findIndex(msg => msg.localId === localId);
    
    if (messageIndex !== -1) {
      messages[messageIndex] = { ...messages[messageIndex], ...updates };
      this.cacheMessages(matchId, messages);
    }
  }

  removeOptimisticMessage(matchId: string, localId: string): void {
    const messages = this.getCachedMessages(matchId);
    const filteredMessages = messages.filter(msg => msg.localId !== localId);
    this.cacheMessages(matchId, filteredMessages);
  }
}

// Export singleton instance
export const messageCache = MessageCache.getInstance();

// Hook for React components
export function useMessageCache() {
  return messageCache;
}