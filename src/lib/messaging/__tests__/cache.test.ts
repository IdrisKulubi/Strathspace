/**
 * Comprehensive tests for message caching functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MessageCache, messageCache } from '../cache';
import type { MessageWithSender, ConversationPreview } from '@/lib/actions/messaging.actions';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Test data
const mockMessage: MessageWithSender = {
  id: 'msg-1',
  content: 'Test message',
  matchId: 'match-1',
  senderId: 'user-1',
  status: 'sent',
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
  sender: {
    id: 'user-1',
    name: 'Test User',
    image: 'https://example.com/avatar.jpg'
  }
};

const mockConversation: ConversationPreview = {
  matchId: 'match-1',
  otherUser: {
    id: 'user-2',
    name: 'Other User',
    image: 'https://example.com/avatar2.jpg',
    isOnline: true
  },
  lastMessage: {
    id: 'msg-1',
    content: 'Last message',
    senderId: 'user-2',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    status: 'sent'
  },
  unreadCount: 1,
  updatedAt: new Date('2024-01-01T10:00:00Z')
};

describe('MessageCache', () => {
  let cache: MessageCache;

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    cache = MessageCache.getInstance();
  });

  afterEach(() => {
    cache.clearCache();
  });

  describe('Message Caching', () => {
    it('should cache messages successfully', () => {
      const messages = [mockMessage];
      
      cache.cacheMessages('match-1', messages);
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
      
      const cachedMessages = cache.getCachedMessages('match-1');
      expect(cachedMessages).toHaveLength(1);
      expect(cachedMessages[0].id).toBe(mockMessage.id);
      expect(cachedMessages[0].content).toBe(mockMessage.content);
    });

    it('should merge new messages with existing cache', () => {
      const message1 = { ...mockMessage, id: 'msg-1' };
      const message2 = { ...mockMessage, id: 'msg-2', content: 'Second message' };
      
      // Cache first message
      cache.cacheMessages('match-1', [message1]);
      
      // Cache second message
      cache.cacheMessages('match-1', [message2]);
      
      const cachedMessages = cache.getCachedMessages('match-1');
      expect(cachedMessages).toHaveLength(2);
      expect(cachedMessages.find(m => m.id === 'msg-1')).toBeDefined();
      expect(cachedMessages.find(m => m.id === 'msg-2')).toBeDefined();
    });

    it('should limit cache size per conversation', () => {
      const messages = Array.from({ length: 600 }, (_, i) => ({
        ...mockMessage,
        id: `msg-${i}`,
        content: `Message ${i}`
      }));
      
      cache.cacheMessages('match-1', messages);
      
      const cachedMessages = cache.getCachedMessages('match-1');
      expect(cachedMessages.length).toBeLessThanOrEqual(500); // MAX_MESSAGES_PER_CONVERSATION
    });

    it('should handle empty message arrays', () => {
      cache.cacheMessages('match-1', []);
      
      const cachedMessages = cache.getCachedMessages('match-1');
      expect(cachedMessages).toHaveLength(0);
    });

    it('should sort messages by creation time', () => {
      const message1 = { ...mockMessage, id: 'msg-1', createdAt: new Date('2024-01-01T10:00:00Z') };
      const message2 = { ...mockMessage, id: 'msg-2', createdAt: new Date('2024-01-01T09:00:00Z') };
      const message3 = { ...mockMessage, id: 'msg-3', createdAt: new Date('2024-01-01T11:00:00Z') };
      
      cache.cacheMessages('match-1', [message1, message2, message3]);
      
      const cachedMessages = cache.getCachedMessages('match-1');
      expect(cachedMessages[0].id).toBe('msg-2'); // Earliest
      expect(cachedMessages[1].id).toBe('msg-1');
      expect(cachedMessages[2].id).toBe('msg-3'); // Latest
    });
  });

  describe('Conversation Caching', () => {
    it('should cache conversations successfully', () => {
      const conversations = [mockConversation];
      
      cache.cacheConversations(conversations);
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
      
      const cachedConversations = cache.getCachedConversations();
      expect(cachedConversations).toHaveLength(1);
      expect(cachedConversations[0].matchId).toBe(mockConversation.matchId);
    });

    it('should limit conversation cache size', () => {
      const conversations = Array.from({ length: 60 }, (_, i) => ({
        ...mockConversation,
        matchId: `match-${i}`
      }));
      
      cache.cacheConversations(conversations);
      
      const cachedConversations = cache.getCachedConversations();
      expect(cachedConversations.length).toBeLessThanOrEqual(50); // MAX_CONVERSATIONS
    });
  });

  describe('Message Queue', () => {
    it('should queue messages for offline sending', () => {
      const queuedMessage = cache.queueMessage('match-1', 'Offline message');
      
      expect(queuedMessage.matchId).toBe('match-1');
      expect(queuedMessage.content).toBe('Offline message');
      expect(queuedMessage.retryCount).toBe(0);
      
      const queue = cache.getMessageQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe(queuedMessage.id);
    });

    it('should remove messages from queue', () => {
      const queuedMessage = cache.queueMessage('match-1', 'Test message');
      
      cache.removeFromQueue(queuedMessage.id);
      
      const queue = cache.getMessageQueue();
      expect(queue).toHaveLength(0);
    });

    it('should update queued messages', () => {
      const queuedMessage = cache.queueMessage('match-1', 'Test message');
      
      cache.updateQueuedMessage(queuedMessage.id, {
        retryCount: 1,
        lastRetryAt: Date.now()
      });
      
      const queue = cache.getMessageQueue();
      expect(queue[0].retryCount).toBe(1);
      expect(queue[0].lastRetryAt).toBeDefined();
    });

    it('should limit queue size', () => {
      // Queue more than the limit
      for (let i = 0; i < 110; i++) {
        cache.queueMessage('match-1', `Message ${i}`);
      }
      
      const queue = cache.getMessageQueue();
      expect(queue.length).toBeLessThanOrEqual(100); // MAX_QUEUE_SIZE
    });
  });

  describe('Optimistic Messages', () => {
    it('should add optimistic messages', () => {
      const optimisticMessage = cache.addOptimisticMessage('match-1', {
        content: 'Optimistic message',
        matchId: 'match-1',
        senderId: 'user-1',
        status: 'sending',
        sender: {
          id: 'user-1',
          name: 'Test User'
        }
      });
      
      expect(optimisticMessage.status).toBe('sending');
      expect(optimisticMessage.localId).toBeDefined();
      
      const cachedMessages = cache.getCachedMessages('match-1');
      expect(cachedMessages).toHaveLength(1);
      expect(cachedMessages[0].localId).toBe(optimisticMessage.localId);
    });

    it('should update optimistic messages', () => {
      const optimisticMessage = cache.addOptimisticMessage('match-1', {
        content: 'Optimistic message',
        matchId: 'match-1',
        senderId: 'user-1',
        status: 'sending',
        sender: {
          id: 'user-1',
          name: 'Test User'
        }
      });
      
      cache.updateOptimisticMessage('match-1', optimisticMessage.localId!, {
        status: 'sent',
        id: 'real-msg-id'
      });
      
      const cachedMessages = cache.getCachedMessages('match-1');
      expect(cachedMessages[0].status).toBe('sent');
      expect(cachedMessages[0].id).toBe('real-msg-id');
    });

    it('should remove optimistic messages', () => {
      const optimisticMessage = cache.addOptimisticMessage('match-1', {
        content: 'Optimistic message',
        matchId: 'match-1',
        senderId: 'user-1',
        status: 'sending',
        sender: {
          id: 'user-1',
          name: 'Test User'
        }
      });
      
      cache.removeOptimisticMessage('match-1', optimisticMessage.localId!);
      
      const cachedMessages = cache.getCachedMessages('match-1');
      expect(cachedMessages).toHaveLength(0);
    });
  });

  describe('Cache Management', () => {
    it('should provide cache statistics', () => {
      cache.cacheMessages('match-1', [mockMessage]);
      cache.cacheConversations([mockConversation]);
      cache.queueMessage('match-1', 'Queued message');
      
      const stats = cache.getCacheStats();
      
      expect(stats.messageCount).toBeGreaterThan(0);
      expect(stats.conversationCount).toBe(1);
      expect(stats.queueSize).toBe(1);
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it('should clear all cache data', () => {
      cache.cacheMessages('match-1', [mockMessage]);
      cache.cacheConversations([mockConversation]);
      
      cache.clearCache();
      
      const stats = cache.getCacheStats();
      expect(stats.messageCount).toBe(0);
      expect(stats.conversationCount).toBe(0);
    });

    it('should handle localStorage unavailability gracefully', () => {
      // Mock localStorage to throw errors
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      
      // Should not throw errors
      expect(() => {
        cache.cacheMessages('match-1', [mockMessage]);
      }).not.toThrow();
      
      // Restore original implementation
      localStorageMock.setItem.mockImplementation(originalSetItem);
    });
  });

  describe('Cache Expiry', () => {
    it('should filter out expired messages', () => {
      // Mock Date.now to simulate time passage
      const originalNow = Date.now;
      const mockNow = jest.fn();
      Date.now = mockNow;
      
      // Set initial time
      mockNow.mockReturnValue(1000000);
      
      cache.cacheMessages('match-1', [mockMessage]);
      
      // Simulate 25 hours later (beyond expiry)
      mockNow.mockReturnValue(1000000 + (25 * 60 * 60 * 1000));
      
      const cachedMessages = cache.getCachedMessages('match-1');
      expect(cachedMessages).toHaveLength(0);
      
      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parse errors gracefully', () => {
      // Manually set invalid JSON in localStorage
      localStorageMock.setItem('strathspace_messages_match-1', 'invalid json');
      
      const cachedMessages = cache.getCachedMessages('match-1');
      expect(cachedMessages).toHaveLength(0);
    });

    it('should handle JSON stringify errors gracefully', () => {
      // Create circular reference that can't be stringified
      const circularMessage = { ...mockMessage };
      (circularMessage as any).circular = circularMessage;
      
      expect(() => {
        cache.cacheMessages('match-1', [circularMessage as any]);
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle large message sets efficiently', () => {
      const largeMessageSet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockMessage,
        id: `msg-${i}`,
        content: `Message ${i}`.repeat(100) // Large content
      }));
      
      const startTime = performance.now();
      cache.cacheMessages('match-1', largeMessageSet);
      const cacheTime = performance.now() - startTime;
      
      const retrieveStartTime = performance.now();
      const cachedMessages = cache.getCachedMessages('match-1');
      const retrieveTime = performance.now() - retrieveStartTime;
      
      // Should complete within reasonable time (adjust thresholds as needed)
      expect(cacheTime).toBeLessThan(1000); // 1 second
      expect(retrieveTime).toBeLessThan(500); // 0.5 seconds
      expect(cachedMessages.length).toBeGreaterThan(0);
    });

    it('should handle concurrent cache operations', async () => {
      const operations = Array.from({ length: 10 }, (_, i) => 
        () => cache.cacheMessages(`match-${i}`, [{ ...mockMessage, id: `msg-${i}` }])
      );
      
      const startTime = performance.now();
      await Promise.all(operations.map(op => Promise.resolve(op())));
      const totalTime = performance.now() - startTime;
      
      expect(totalTime).toBeLessThan(1000); // Should complete quickly
      
      // Verify all operations completed
      for (let i = 0; i < 10; i++) {
        const messages = cache.getCachedMessages(`match-${i}`);
        expect(messages).toHaveLength(1);
      }
    });
  });
});