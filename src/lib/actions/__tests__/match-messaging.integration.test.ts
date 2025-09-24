/**
 * Integration tests for match-to-messaging functionality
 * Tests the complete flow from match creation to messaging
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  getConversationFromMatch,
  createConversationFromMatch,
  getMatchesForMessaging,
  navigateToMessaging,
  validateMatchAccess,
  getConversationStats
} from '../match-messaging.actions';
import { sendMessageAction } from '../messaging.actions';

// Mock the auth module
jest.mock('@/auth', () => ({
  auth: jest.fn(() => Promise.resolve({
    user: { id: 'test-user-1' }
  }))
}));

// Mock the database
jest.mock('@/db/drizzle', () => ({
  default: {
    query: {
      matches: {
        findFirst: jest.fn(),
        findMany: jest.fn()
      },
      messages: {
        findMany: jest.fn()
      },
      users: {
        findFirst: jest.fn()
      }
    },
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => Promise.resolve())
      }))
    })),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn(() => Promise.resolve([{
          id: 'test-message-1',
          content: 'Test message',
          matchId: 'test-match-1',
          senderId: 'test-user-1',
          status: 'sent',
          createdAt: new Date(),
          updatedAt: new Date()
        }]))
      }))
    }))
  }
}));

// Mock revalidatePath
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}));

// Mock messaging error utils
jest.mock('@/lib/utils/messaging-errors.utils', () => ({
  withErrorHandling: jest.fn((fn) => fn()),
  createMessagingError: jest.fn((type, message, code) => new Error(message)),
  MessagingErrorType: {
    AUTH_ERROR: 'AUTH_ERROR',
    PERMISSION_ERROR: 'PERMISSION_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR'
  },
  ERROR_CODES: {
    UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
    MATCH_NOT_ACCESSIBLE: 'MATCH_NOT_ACCESSIBLE',
    MESSAGE_SEND_FAILED: 'MESSAGE_SEND_FAILED',
    INVALID_MESSAGE_CONTENT: 'INVALID_MESSAGE_CONTENT'
  }
}));

describe('Match-to-Messaging Integration', () => {
  const mockMatch = {
    id: 'test-match-1',
    user1Id: 'test-user-1',
    user2Id: 'test-user-2',
    createdAt: new Date(),
    updatedAt: new Date(),
    user1: {
      id: 'test-user-1',
      name: 'Test User 1',
      image: null,
      profile: {
        firstName: 'Test',
        lastName: 'User1',
        profilePhoto: null,
        anonymous: false,
        anonymousAvatar: null
      }
    },
    user2: {
      id: 'test-user-2',
      name: 'Test User 2',
      image: null,
      profile: {
        firstName: 'Test',
        lastName: 'User2',
        profilePhoto: null,
        anonymous: false,
        anonymousAvatar: null
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getConversationFromMatch', () => {
    it('should return conversation details for valid match', async () => {
      const mockDb = await import('@/db/drizzle');
      (mockDb.default.query.matches.findFirst as jest.Mock).mockResolvedValue(mockMatch);
      (mockDb.default.query.messages.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getConversationFromMatch('test-match-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.match.id).toBe('test-match-1');
        expect(result.data.partner.name).toBe('Test User 2');
        expect(result.data.conversationExists).toBe(false);
      }
    });

    it('should return error for non-existent match', async () => {
      const mockDb = await import('@/db/drizzle');
      (mockDb.default.query.matches.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await getConversationFromMatch('non-existent-match');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Match not found');
    });

    it('should detect existing conversation', async () => {
      const mockDb = await import('@/db/drizzle');
      (mockDb.default.query.matches.findFirst as jest.Mock).mockResolvedValue(mockMatch);
      (mockDb.default.query.messages.findMany as jest.Mock).mockResolvedValue([
        { id: 'test-message-1' }
      ]);

      const result = await getConversationFromMatch('test-match-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.conversationExists).toBe(true);
      }
    });
  });

  describe('createConversationFromMatch', () => {
    it('should initialize conversation for valid match', async () => {
      const mockDb = await import('@/db/drizzle');
      vi.mocked(mockDb.default.query.matches.findFirst).mockResolvedValue(mockMatch);
      vi.mocked(mockDb.default.query.messages.findMany).mockResolvedValue([]);

      const result = await createConversationFromMatch('test-match-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.conversationId).toBe('test-match-1');
        expect(result.data.partner.name).toBe('Test User 2');
      }
    });
  });

  describe('getMatchesForMessaging', () => {
    it('should return matches with messaging status', async () => {
      const mockDb = await import('@/db/drizzle');
      vi.mocked(mockDb.default.query.matches.findMany).mockResolvedValue([mockMatch]);
      vi.mocked(mockDb.default.query.messages.findMany).mockResolvedValue([]);

      const result = await getMatchesForMessaging();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].matchId).toBe('test-match-1');
        expect(result.data[0].hasMessages).toBe(false);
      }
    });

    it('should detect matches with existing messages', async () => {
      const mockDb = await import('@/db/drizzle');
      vi.mocked(mockDb.default.query.matches.findMany).mockResolvedValue([mockMatch]);
      vi.mocked(mockDb.default.query.messages.findMany).mockResolvedValue([
        {
          id: 'test-message-1',
          matchId: 'test-match-1',
          content: 'Hello',
          senderId: 'test-user-1',
          status: 'sent',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      const result = await getMatchesForMessaging();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].hasMessages).toBe(true);
        expect(result.data[0].lastMessageAt).toBeDefined();
      }
    });
  });

  describe('navigateToMessaging', () => {
    it('should provide navigation details for valid match', async () => {
      const mockDb = await import('@/db/drizzle');
      vi.mocked(mockDb.default.query.matches.findFirst).mockResolvedValue(mockMatch);
      vi.mocked(mockDb.default.query.messages.findMany).mockResolvedValue([]);

      const result = await navigateToMessaging('test-match-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.conversationId).toBe('test-match-1');
        expect(result.data.redirectPath).toBe('/chat/test-match-1');
      }
    });
  });

  describe('validateMatchAccess', () => {
    it('should validate user access to match', async () => {
      const mockDb = await import('@/db/drizzle');
      vi.mocked(mockDb.default.query.matches.findFirst).mockResolvedValue(mockMatch);

      const result = await validateMatchAccess('test-match-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hasAccess).toBe(true);
        expect(result.data.match?.id).toBe('test-match-1');
      }
    });

    it('should deny access to non-existent match', async () => {
      const mockDb = await import('@/db/drizzle');
      vi.mocked(mockDb.default.query.matches.findFirst).mockResolvedValue(null);

      const result = await validateMatchAccess('non-existent-match');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hasAccess).toBe(false);
      }
    });
  });

  describe('getConversationStats', () => {
    it('should return conversation statistics', async () => {
      const mockDb = await import('@/db/drizzle');
      vi.mocked(mockDb.default.query.matches.findFirst).mockResolvedValue(mockMatch);
      vi.mocked(mockDb.default.query.messages.findMany)
        .mockResolvedValueOnce([]) // For conversation existence check
        .mockResolvedValueOnce([ // For stats query
          {
            id: 'msg-1',
            createdAt: new Date(),
            senderId: 'test-user-2',
            status: 'sent'
          },
          {
            id: 'msg-2',
            createdAt: new Date(),
            senderId: 'test-user-1',
            status: 'read'
          }
        ]);

      const result = await getConversationStats('test-match-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.messageCount).toBe(2);
        expect(result.data.unreadCount).toBe(1); // One unread message from partner
        expect(result.data.partnerName).toBe('Test');
      }
    });
  });

  describe('End-to-End Match-to-Message Flow', () => {
    it('should complete full flow from match to first message', async () => {
      const mockDb = await import('@/db/drizzle');
      
      // Setup mocks for the complete flow
      vi.mocked(mockDb.default.query.matches.findFirst).mockResolvedValue(mockMatch);
      vi.mocked(mockDb.default.query.messages.findMany).mockResolvedValue([]);
      
      // Mock user lookup for sendMessage
      vi.mocked(mockDb.default.query.users.findFirst).mockResolvedValue({
        id: 'test-user-1',
        name: 'Test User 1',
        image: null
      });

      // 1. Validate match access
      const accessResult = await validateMatchAccess('test-match-1');
      expect(accessResult.success).toBe(true);

      // 2. Get conversation details
      const conversationResult = await getConversationFromMatch('test-match-1');
      expect(conversationResult.success).toBe(true);

      // 3. Navigate to messaging
      const navigationResult = await navigateToMessaging('test-match-1');
      expect(navigationResult.success).toBe(true);

      // 4. Send first message
      const messageResult = await sendMessageAction('test-match-1', 'Hello! Nice to match with you!');
      expect(messageResult.success).toBe(true);

      // 5. Verify conversation stats after message
      vi.mocked(mockDb.default.query.messages.findMany).mockResolvedValue([
        {
          id: 'test-message-1',
          createdAt: new Date(),
          senderId: 'test-user-1',
          status: 'sent'
        }
      ]);

      const statsResult = await getConversationStats('test-match-1');
      expect(statsResult.success).toBe(true);
      if (statsResult.success) {
        expect(statsResult.data.messageCount).toBe(1);
      }
    });

    it('should handle anonymous user matches', async () => {
      const anonymousMatch = {
        ...mockMatch,
        user2: {
          ...mockMatch.user2,
          profile: {
            ...mockMatch.user2.profile,
            anonymous: true,
            anonymousAvatar: 'mystery-avatar',
            firstName: 'Anonymous',
            lastName: 'User'
          }
        }
      };

      const mockDb = await import('@/db/drizzle');
      vi.mocked(mockDb.default.query.matches.findFirst).mockResolvedValue(anonymousMatch);
      vi.mocked(mockDb.default.query.messages.findMany).mockResolvedValue([]);

      const result = await getConversationFromMatch('test-match-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.partner.anonymous).toBe(true);
        expect(result.data.partner.anonymousAvatar).toBe('mystery-avatar');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockDb = await import('@/db/drizzle');
      vi.mocked(mockDb.default.query.matches.findFirst).mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await getConversationFromMatch('test-match-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    it('should handle unauthorized access attempts', async () => {
      // Mock auth to return no user
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue(null);

      const result = await getConversationFromMatch('test-match-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication required');
    });
  });
});