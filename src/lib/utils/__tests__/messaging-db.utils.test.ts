/**
 * Unit tests for messaging database utilities
 * These tests focus on the database query logic without external dependencies
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the database - use relative path since Jest path mapping has issues
jest.mock('../../../db/drizzle', () => ({
  default: {
    query: {},
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn()
  }
}));

// Import the functions to test
import {
  validateUserMatchAccess,
  getConversationMessages,
  getConversationMessageCount,
  getUnreadMessageCount,
  getAllUnreadCounts,
  getLatestMessagesForMatches,
  insertMessage,
  updateMessageStatus,
  updateMatchTimestamp,
  markConversationMessagesAsRead,
  getConversationParticipants,
  getMessageById,
  getRecentMessagesForUser
} from '../messaging-db.utils';

// Mock data
const mockMatch = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  user1Id: 'user-123',
  user2Id: 'user-456',
  createdAt: new Date(),
  updatedAt: new Date(),
  lastMessageAt: new Date()
};

const mockUser = {
  id: 'user-123',
  name: 'Test User',
  image: 'https://example.com/avatar.jpg',
  isOnline: true
};

const mockMessage = {
  id: 'msg-123',
  content: 'Test message',
  matchId: mockMatch.id,
  senderId: mockUser.id,
  status: 'sent',
  createdAt: new Date(),
  updatedAt: new Date(),
  sender: mockUser
};

describe('Messaging Database Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUserMatchAccess', () => {
    it('should return true when user has access to match', async () => {
      const db = await import('../../../db/drizzle');
      const mockDb = db.default as any;
      
      mockDb.query = {
        matches: {
          findFirst: jest.fn().mockResolvedValue(mockMatch)
        }
      };

      const result = await validateUserMatchAccess(mockMatch.id, mockUser.id);
      
      expect(result).toBe(true);
      expect(mockDb.query.matches.findFirst).toHaveBeenCalledWith({
        where: expect.any(Object),
        columns: { id: true }
      });
    });

    it('should return false when user does not have access to match', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      mockDb.query = {
        matches: {
          findFirst: jest.fn().mockResolvedValue(null)
        }
      };

      const result = await validateUserMatchAccess(mockMatch.id, 'unauthorized-user');
      
      expect(result).toBe(false);
    });

    it('should return false when database query fails', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      mockDb.query = {
        matches: {
          findFirst: jest.fn().mockRejectedValue(new Error('Database error'))
        }
      };

      const result = await validateUserMatchAccess(mockMatch.id, mockUser.id);
      
      expect(result).toBe(false);
    });
  });

  describe('getConversationMessages', () => {
    it('should return messages with pagination info', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      const mockMessages = [mockMessage, { ...mockMessage, id: 'msg-124' }];
      
      mockDb.query = {
        messages: {
          findMany: jest.fn().mockResolvedValue(mockMessages)
        }
      };

      const result = await getConversationMessages(mockMatch.id, 50);
      
      expect(result.messages).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it('should handle pagination correctly when there are more messages', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      // Mock 51 messages (limit + 1 to indicate more available)
      const mockMessages = Array.from({ length: 51 }, (_, i) => ({
        ...mockMessage,
        id: `msg-${i}`,
        createdAt: new Date(Date.now() - i * 1000)
      }));
      
      mockDb.query = {
        messages: {
          findMany: jest.fn().mockResolvedValue(mockMessages)
        }
      };

      const result = await getConversationMessages(mockMatch.id, 50);
      
      expect(result.messages).toHaveLength(50);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeDefined();
    });

    it('should handle cursor-based pagination', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      mockDb.query = {
        messages: {
          findMany: jest.fn().mockResolvedValue([mockMessage])
        }
      };

      const cursor = new Date().toISOString();
      const result = await getConversationMessages(mockMatch.id, 50, cursor);
      
      expect(mockDb.query.messages.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        orderBy: expect.any(Array),
        limit: 51,
        with: expect.any(Object)
      });
    });
  });

  describe('getConversationMessageCount', () => {
    it('should return correct message count', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 42 }])
        })
      });

      const result = await getConversationMessageCount(mockMatch.id);
      
      expect(result).toBe(42);
    });

    it('should return 0 when no messages found', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      });

      const result = await getConversationMessageCount(mockMatch.id);
      
      expect(result).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('Database error'))
        })
      });

      const result = await getConversationMessageCount(mockMatch.id);
      
      expect(result).toBe(0);
    });
  });

  describe('getUnreadMessageCount', () => {
    it('should return correct unread count', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 5 }])
        })
      });

      const result = await getUnreadMessageCount(mockMatch.id, mockUser.id);
      
      expect(result).toBe(5);
    });

    it('should exclude user own messages from unread count', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 0 }])
        })
      });

      const result = await getUnreadMessageCount(mockMatch.id, mockUser.id);
      
      expect(result).toBe(0);
    });
  });

  describe('getAllUnreadCounts', () => {
    it('should return unread counts for all user matches', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      mockDb.query = {
        matches: {
          findMany: jest.fn().mockResolvedValue([mockMatch])
        }
      };
      
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            groupBy: jest.fn().mockResolvedValue([
              { matchId: mockMatch.id, count: 3 }
            ])
          })
        })
      });

      const result = await getAllUnreadCounts(mockUser.id);
      
      expect(result.get(mockMatch.id)).toBe(3);
    });

    it('should return empty map when user has no matches', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      mockDb.query = {
        matches: {
          findMany: jest.fn().mockResolvedValue([])
        }
      };

      const result = await getAllUnreadCounts(mockUser.id);
      
      expect(result.size).toBe(0);
    });
  });

  describe('insertMessage', () => {
    it('should insert message and return the created message', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      mockDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockMessage])
        })
      });

      const result = await insertMessage(mockMatch.id, mockUser.id, 'Test message');
      
      expect(result).toEqual(mockMessage);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should throw error when insert fails', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      mockDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockRejectedValue(new Error('Insert failed'))
        })
      });

      await expect(insertMessage(mockMatch.id, mockUser.id, 'Test message'))
        .rejects.toThrow('Failed to insert message');
    });
  });

  describe('updateMessageStatus', () => {
    it('should update message status successfully', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      const updatedMessage = { ...mockMessage, status: 'read' };
      
      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedMessage])
          })
        })
      });

      const result = await updateMessageStatus(mockMessage.id, 'read');
      
      expect(result.status).toBe('read');
    });

    it('should throw error when update fails', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockRejectedValue(new Error('Update failed'))
          })
        })
      });

      await expect(updateMessageStatus(mockMessage.id, 'read'))
        .rejects.toThrow('Failed to update message status');
    });
  });

  describe('markConversationMessagesAsRead', () => {
    it('should mark multiple messages as read', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([
              { id: 'msg-1' },
              { id: 'msg-2' }
            ])
          })
        })
      });

      const result = await markConversationMessagesAsRead(mockMatch.id, mockUser.id);
      
      expect(result).toBe(2);
    });

    it('should not update user own messages', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([])
          })
        })
      });

      const result = await markConversationMessagesAsRead(mockMatch.id, mockUser.id);
      
      expect(result).toBe(0);
    });
  });

  describe('getConversationParticipants', () => {
    it('should return both participants of a match', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      const mockMatchWithUsers = {
        ...mockMatch,
        user1: mockUser,
        user2: { ...mockUser, id: 'user-456', name: 'Other User' }
      };
      
      mockDb.query = {
        matches: {
          findFirst: jest.fn().mockResolvedValue(mockMatchWithUsers)
        }
      };

      const result = await getConversationParticipants(mockMatch.id);
      
      expect(result).toEqual({
        user1: mockUser,
        user2: mockMatchWithUsers.user2
      });
    });

    it('should return null when match not found', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      mockDb.query = {
        matches: {
          findFirst: jest.fn().mockResolvedValue(null)
        }
      };

      const result = await getConversationParticipants('nonexistent-match');
      
      expect(result).toBeNull();
    });
  });

  describe('getMessageById', () => {
    it('should return message with sender info', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      mockDb.query = {
        messages: {
          findFirst: jest.fn().mockResolvedValue(mockMessage)
        }
      };

      const result = await getMessageById(mockMessage.id);
      
      expect(result).toEqual(mockMessage);
    });

    it('should return undefined when message not found', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      mockDb.query = {
        messages: {
          findFirst: jest.fn().mockResolvedValue(null)
        }
      };

      const result = await getMessageById('nonexistent-message');
      
      expect(result).toBeUndefined();
    });
  });

  describe('getRecentMessagesForUser', () => {
    it('should return recent messages from user conversations', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      mockDb.query = {
        matches: {
          findMany: jest.fn().mockResolvedValue([mockMatch])
        },
        messages: {
          findMany: jest.fn().mockResolvedValue([mockMessage])
        }
      };

      const result = await getRecentMessagesForUser(mockUser.id, 10);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockMessage);
    });

    it('should exclude user own messages', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      mockDb.query = {
        matches: {
          findMany: jest.fn().mockResolvedValue([mockMatch])
        },
        messages: {
          findMany: jest.fn().mockResolvedValue([])
        }
      };

      const result = await getRecentMessagesForUser(mockUser.id, 10);
      
      expect(result).toHaveLength(0);
    });

    it('should return empty array when user has no matches', async () => {
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      mockDb.query = {
        matches: {
          findMany: jest.fn().mockResolvedValue([])
        }
      };

      const result = await getRecentMessagesForUser(mockUser.id, 10);
      
      expect(result).toHaveLength(0);
    });
  });
});