/**
 * Comprehensive tests for offline message queue
 * Tests cover message queuing, network status handling, persistence, and sync operations
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { OfflineMessageQueue, getOfflineQueue } from '../offline-queue';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock sendMessageAction
jest.mock('@/lib/actions/messaging.actions', () => ({
  sendMessageAction: jest.fn()
}));

import { sendMessageAction } from '@/lib/actions/messaging.actions';
const mockSendMessageAction = sendMessageAction as jest.MockedFunction<typeof sendMessageAction>;

// Mock console methods
const originalConsole = console;
beforeEach(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  
  // Reset mocks
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  mockSendMessageAction.mockClear();
  
  // Reset navigator.onLine
  (navigator as any).onLine = true;
});

afterEach(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

describe('OfflineMessageQueue', () => {
  let queue: OfflineMessageQueue;

  beforeEach(() => {
    queue = new OfflineMessageQueue({
      maxQueueSize: 5,
      maxMessageAge: 60000, // 1 minute for testing
      storageKey: 'test_queue'
    });
  });

  afterEach(() => {
    queue.destroy();
  });

  describe('Message Queuing', () => {
    it('should enqueue messages', () => {
      const messageId = queue.enqueueMessage('match-1', 'Hello world');
      
      expect(messageId).toMatch(/^offline_\d+_[a-z0-9]+$/);
      expect(queue.getStatus().queueSize).toBe(1);
      
      const messages = queue.getQueuedMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Hello world');
      expect(messages[0].matchId).toBe('match-1');
    });

    it('should trim message content', () => {
      const messageId = queue.enqueueMessage('match-1', '  Hello world  ');
      
      const messages = queue.getQueuedMessages();
      expect(messages[0].content).toBe('Hello world');
    });

    it('should respect queue size limit', () => {
      // Fill queue to capacity
      for (let i = 0; i < 6; i++) {
        queue.enqueueMessage('match-1', `Message ${i}`);
      }
      
      expect(queue.getStatus().queueSize).toBe(5); // Should not exceed maxQueueSize
      
      const messages = queue.getQueuedMessages();
      expect(messages[0].content).toBe('Message 1'); // First message should be removed
      expect(messages[4].content).toBe('Message 5'); // Last message should be present
    });

    it('should dequeue messages', () => {
      const messageId = queue.enqueueMessage('match-1', 'Hello world');
      
      expect(queue.getStatus().queueSize).toBe(1);
      
      const removed = queue.dequeueMessage(messageId);
      
      expect(removed).toBe(true);
      expect(queue.getStatus().queueSize).toBe(0);
    });

    it('should return false when dequeuing non-existent message', () => {
      const removed = queue.dequeueMessage('non-existent');
      
      expect(removed).toBe(false);
    });

    it('should get messages for specific match', () => {
      queue.enqueueMessage('match-1', 'Message for match 1');
      queue.enqueueMessage('match-2', 'Message for match 2');
      queue.enqueueMessage('match-1', 'Another message for match 1');
      
      const match1Messages = queue.getQueuedMessagesForMatch('match-1');
      const match2Messages = queue.getQueuedMessagesForMatch('match-2');
      
      expect(match1Messages).toHaveLength(2);
      expect(match2Messages).toHaveLength(1);
      expect(match1Messages[0].content).toBe('Message for match 1');
      expect(match1Messages[1].content).toBe('Another message for match 1');
    });

    it('should sort messages by timestamp', () => {
      const id1 = queue.enqueueMessage('match-1', 'First message');
      
      // Wait a bit to ensure different timestamps
      setTimeout(() => {
        const id2 = queue.enqueueMessage('match-1', 'Second message');
        
        const messages = queue.getQueuedMessages();
        expect(messages[0].id).toBe(id1);
        expect(messages[1].id).toBe(id2);
      }, 10);
    });

    it('should clear all messages', () => {
      queue.enqueueMessage('match-1', 'Message 1');
      queue.enqueueMessage('match-2', 'Message 2');
      
      expect(queue.getStatus().queueSize).toBe(2);
      
      queue.clear();
      
      expect(queue.getStatus().queueSize).toBe(0);
      expect(queue.getQueuedMessages()).toHaveLength(0);
    });
  });

  describe('Network Status Handling', () => {
    it('should process messages when online', async () => {
      mockSendMessageAction.mockResolvedValue({
        success: true,
        data: {
          id: 'server-msg-1',
          content: 'Hello world',
          matchId: 'match-1',
          senderId: 'user-1',
          status: 'sent' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          sender: { id: 'user-1', name: 'User 1' }
        }
      });

      const messageId = queue.enqueueMessage('match-1', 'Hello world');
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockSendMessageAction).toHaveBeenCalledWith('match-1', 'Hello world');
      expect(queue.getStatus().queueSize).toBe(0); // Message should be removed after success
    });

    it('should queue messages when offline', () => {
      (navigator as any).onLine = false;
      
      const messageId = queue.enqueueMessage('match-1', 'Offline message');
      
      expect(queue.getStatus().queueSize).toBe(1);
      expect(mockSendMessageAction).not.toHaveBeenCalled();
    });

    it('should handle send failures with retry', async () => {
      mockSendMessageAction
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          success: true,
          data: {
            id: 'server-msg-1',
            content: 'Hello world',
            matchId: 'match-1',
            senderId: 'user-1',
            status: 'sent' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
            sender: { id: 'user-1', name: 'User 1' }
          }
        });

      const messageId = queue.enqueueMessage('match-1', 'Hello world');
      
      // Wait for initial attempt and retry
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(mockSendMessageAction).toHaveBeenCalledTimes(2);
      expect(queue.getStatus().queueSize).toBe(0); // Should succeed on retry
    });

    it('should handle permanent send failures', async () => {
      mockSendMessageAction.mockRejectedValue(new Error('Authentication required'));

      const messageId = queue.enqueueMessage('match-1', 'Hello world');
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const messages = queue.getQueuedMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].error).toBe('Authentication required');
    });
  });

  describe('Persistence', () => {
    it('should save queue to localStorage', () => {
      queue.enqueueMessage('match-1', 'Hello world');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test_queue',
        expect.stringContaining('Hello world')
      );
    });

    it('should load queue from localStorage', () => {
      const savedData = [{
        id: 'offline_123_abc',
        matchId: 'match-1',
        content: 'Saved message',
        timestamp: new Date().toISOString(),
        attempts: 0
      }];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedData));
      
      const newQueue = new OfflineMessageQueue({ storageKey: 'test_queue' });
      
      const messages = newQueue.getQueuedMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Saved message');
      
      newQueue.destroy();
    });

    it('should handle corrupted localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      // Should not throw error
      const newQueue = new OfflineMessageQueue({ storageKey: 'test_queue' });
      
      expect(newQueue.getQueuedMessages()).toHaveLength(0);
      
      newQueue.destroy();
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      // Should not throw error
      expect(() => {
        queue.enqueueMessage('match-1', 'Hello world');
      }).not.toThrow();
    });
  });

  describe('Sync Operations', () => {
    it('should sync all messages successfully', async () => {
      mockSendMessageAction.mockResolvedValue({
        success: true,
        data: {
          id: 'server-msg-1',
          content: 'Hello world',
          matchId: 'match-1',
          senderId: 'user-1',
          status: 'sent' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          sender: { id: 'user-1', name: 'User 1' }
        }
      });

      queue.enqueueMessage('match-1', 'Message 1');
      queue.enqueueMessage('match-2', 'Message 2');
      
      const result = await queue.syncAll();
      
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(queue.getStatus().queueSize).toBe(0);
    });

    it('should handle mixed sync results', async () => {
      mockSendMessageAction
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: 'server-msg-1',
            content: 'Message 1',
            matchId: 'match-1',
            senderId: 'user-1',
            status: 'sent' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
            sender: { id: 'user-1', name: 'User 1' }
          }
        })
        .mockRejectedValueOnce(new Error('Send failed'));

      queue.enqueueMessage('match-1', 'Message 1');
      queue.enqueueMessage('match-2', 'Message 2');
      
      const result = await queue.syncAll();
      
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Send failed');
    });

    it('should return empty result for empty queue', async () => {
      const result = await queue.syncAll();
      
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Event System', () => {
    it('should emit message-sent events', (done) => {
      mockSendMessageAction.mockResolvedValue({
        success: true,
        data: {
          id: 'server-msg-1',
          content: 'Hello world',
          matchId: 'match-1',
          senderId: 'user-1',
          status: 'sent' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          sender: { id: 'user-1', name: 'User 1' }
        }
      });

      queue.addEventListener('message-sent', (data) => {
        expect(data.messageId).toBeDefined();
        expect(data.message.content).toBe('Hello world');
        done();
      });

      queue.enqueueMessage('match-1', 'Hello world');
    });

    it('should emit message-failed events', (done) => {
      mockSendMessageAction.mockRejectedValue(new Error('Send failed'));

      queue.addEventListener('message-failed', (data) => {
        expect(data.messageId).toBeDefined();
        expect(data.error).toBe('Send failed');
        done();
      });

      queue.enqueueMessage('match-1', 'Hello world');
    });

    it('should emit online/offline events', () => {
      const onlineHandler = jest.fn();
      const offlineHandler = jest.fn();

      queue.addEventListener('online', onlineHandler);
      queue.addEventListener('offline', offlineHandler);

      // Simulate going offline
      (navigator as any).onLine = false;
      window.dispatchEvent(new Event('offline'));

      expect(offlineHandler).toHaveBeenCalled();

      // Simulate coming online
      (navigator as any).onLine = true;
      window.dispatchEvent(new Event('online'));

      expect(onlineHandler).toHaveBeenCalled();
    });

    it('should remove event listeners', () => {
      const handler = jest.fn();

      queue.addEventListener('message-sent', handler);
      queue.removeEventListener('message-sent', handler);

      // Handler should not be called
      mockSendMessageAction.mockResolvedValue({
        success: true,
        data: {
          id: 'server-msg-1',
          content: 'Hello world',
          matchId: 'match-1',
          senderId: 'user-1',
          status: 'sent' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          sender: { id: 'user-1', name: 'User 1' }
        }
      });

      queue.enqueueMessage('match-1', 'Hello world');

      setTimeout(() => {
        expect(handler).not.toHaveBeenCalled();
      }, 100);
    });
  });

  describe('Cleanup and Maintenance', () => {
    it('should clean up old messages', async () => {
      // Create queue with very short message age
      const shortQueue = new OfflineMessageQueue({
        maxMessageAge: 50, // 50ms
        storageKey: 'short_test_queue'
      });

      shortQueue.enqueueMessage('match-1', 'Old message');
      
      expect(shortQueue.getStatus().queueSize).toBe(1);
      
      // Wait for message to age out
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Trigger cleanup by adding another message
      shortQueue.enqueueMessage('match-1', 'New message');
      
      // Wait for cleanup to run
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const messages = shortQueue.getQueuedMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('New message');
      
      shortQueue.destroy();
    });

    it('should destroy queue and clean up resources', () => {
      const handler = jest.fn();
      queue.addEventListener('message-sent', handler);
      
      queue.destroy();
      
      // Should not process new messages after destroy
      queue.enqueueMessage('match-1', 'Should not process');
      
      setTimeout(() => {
        expect(mockSendMessageAction).not.toHaveBeenCalled();
        expect(handler).not.toHaveBeenCalled();
      }, 100);
    });
  });

  describe('Status and Statistics', () => {
    it('should provide accurate status information', () => {
      const now = new Date();
      
      queue.enqueueMessage('match-1', 'Message 1');
      queue.enqueueMessage('match-2', 'Message 2');
      
      const status = queue.getStatus();
      
      expect(status.isOnline).toBe(true);
      expect(status.queueSize).toBe(2);
      expect(status.oldestMessage).toBeInstanceOf(Date);
      expect(status.newestMessage).toBeInstanceOf(Date);
      expect(status.failedMessages).toBe(0);
    });

    it('should track failed messages in status', async () => {
      mockSendMessageAction.mockRejectedValue(new Error('Send failed'));

      queue.enqueueMessage('match-1', 'Message 1');
      
      // Wait for processing to fail
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = queue.getStatus();
      expect(status.failedMessages).toBe(1);
    });
  });
});

describe('Global Queue Management', () => {
  afterEach(() => {
    // Clean up global queue
    const globalQueue = getOfflineQueue();
    globalQueue.destroy();
  });

  it('should return same instance for multiple calls', () => {
    const queue1 = getOfflineQueue();
    const queue2 = getOfflineQueue();
    
    expect(queue1).toBe(queue2);
  });

  it('should create new instance with different options', () => {
    const queue1 = getOfflineQueue({ maxQueueSize: 10 });
    const queue2 = getOfflineQueue({ maxQueueSize: 20 });
    
    // Should still return same instance (options only apply on first creation)
    expect(queue1).toBe(queue2);
  });
});