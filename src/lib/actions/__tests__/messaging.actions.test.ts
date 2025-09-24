/**
 * Comprehensive tests for messaging server actions
 * Tests validation, authentication, error handling, and business logic
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';

// Mock external dependencies
jest.mock('@/db/drizzle');
jest.mock('@/auth');
jest.mock('next/cache');

// Import the functions to test
import {
  sendMessage,
  sendMessageAction,
  getMessages,
  getConversations,
  updateMessageStatus,
  markConversationAsRead,
  validateUserAccess,
  type MessageWithSender,
  type ConversationPreview
} from '../messaging.actions';

// Mock data
const mockUser = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  image: 'https://example.com/avatar.jpg'
};

const mockMatch = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  user1Id: 'user-123',
  user2Id: 'user-456',
  createdAt: new Date(),
  updatedAt: new Date(),
  lastMessageAt: new Date()
};

const mockMessage: MessageWithSender = {
  id: 'msg-123',
  content: 'Test message',
  matchId: mockMatch.id,
  senderId: mockUser.id,
  status: 'sent',
  createdAt: new Date(),
  updatedAt: new Date(),
  sender: {
    id: mockUser.id,
    name: mockUser.name,
    image: mockUser.image
  }
};

describe('Messaging Server Actions - Validation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should reject empty message content', async () => {
      const formData = new FormData();
      formData.append('matchId', '123e4567-e89b-12d3-a456-426614174000');
      formData.append('content', '');

      const result = await sendMessage(formData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Message cannot be empty');
    });

    it('should reject message content that is too long', async () => {
      const formData = new FormData();
      formData.append('matchId', '123e4567-e89b-12d3-a456-426614174000');
      formData.append('content', 'a'.repeat(1001)); // Exceeds 1000 char limit

      const result = await sendMessage(formData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Message is too long');
    });

    it('should reject invalid match ID format', async () => {
      const formData = new FormData();
      formData.append('matchId', 'invalid-uuid');
      formData.append('content', 'Valid message');

      const result = await sendMessage(formData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid match ID');
    });

    it('should reject whitespace-only messages', async () => {
      const formData = new FormData();
      formData.append('matchId', '123e4567-e89b-12d3-a456-426614174000');
      formData.append('content', '   \n\t   ');

      const result = await sendMessage(formData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Message cannot be empty');
    });

    it('should accept valid message content', async () => {
      // Mock successful authentication
      const { auth } = await import('@/auth');
      (auth as jest.MockedFunction<typeof auth>).mockResolvedValue({
        user: mockUser
      } as any);

      // Mock database operations
      const db = await import('@/db/drizzle');
      const mockDb = db.default as any;
      
      // Mock validateUserAccess to return true
      mockDb.query = {
        matches: {
          findFirst: jest.fn().mockResolvedValue(mockMatch)
        },
        users: {
          findFirst: jest.fn().mockResolvedValue(mockUser)
        }
      };
      
      mockDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockMessage])
        })
      });
      
      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      });

      const formData = new FormData();
      formData.append('matchId', '123e4567-e89b-12d3-a456-426614174000');
      formData.append('content', 'Valid message content');

      const result = await sendMessage(formData);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.content).toBe('Valid message content');
    });
  });

  describe('sendMessageAction', () => {
    it('should work with direct parameters', async () => {
      // Mock unauthenticated user to test validation
      const { auth } = await import('@/auth');
      (auth as jest.MockedFunction<typeof auth>).mockResolvedValue(null);

      const result = await sendMessageAction(
        '123e4567-e89b-12d3-a456-426614174000',
        'Test message'
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });
  });

  describe('getMessages', () => {
    it('should validate matchId parameter', async () => {
      const result = await getMessages('invalid-uuid');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid match ID');
    });

    it('should validate limit parameter bounds', async () => {
      const result = await getMessages(
        '123e4567-e89b-12d3-a456-426614174000',
        101 // exceeds max limit of 100
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Limit cannot exceed 100');
    });

    it('should validate minimum limit', async () => {
      const result = await getMessages(
        '123e4567-e89b-12d3-a456-426614174000',
        0 // below minimum limit of 1
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Limit must be at least 1');
    });

    it('should validate cursor format', async () => {
      const result = await getMessages(
        '123e4567-e89b-12d3-a456-426614174000',
        50,
        'invalid-date-format'
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid cursor format');
    });
  });

  describe('updateMessageStatus', () => {
    it('should validate messageId parameter', async () => {
      const result = await updateMessageStatus('invalid-uuid', 'read');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid message ID');
    });

    it('should validate status parameter', async () => {
      const result = await updateMessageStatus(
        '123e4567-e89b-12d3-a456-426614174000',
        'invalid-status' as any
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Status must be');
    });

    it('should accept valid status values', async () => {
      // Mock unauthenticated user to test early validation
      const { auth } = await import('@/auth');
      (auth as jest.MockedFunction<typeof auth>).mockResolvedValue(null);

      const result1 = await updateMessageStatus(
        '123e4567-e89b-12d3-a456-426614174000',
        'delivered'
      );
      
      const result2 = await updateMessageStatus(
        '123e4567-e89b-12d3-a456-426614174000',
        'read'
      );
      
      // Both should fail at auth, not validation
      expect(result1.error).toBe('Authentication required');
      expect(result2.error).toBe('Authentication required');
    });
  });
});

describe('Messaging Server Actions - Authentication Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication for sendMessage', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.MockedFunction<typeof auth>).mockResolvedValue(null);

    const formData = new FormData();
    formData.append('matchId', '123e4567-e89b-12d3-a456-426614174000');
    formData.append('content', 'Test message');

    const result = await sendMessage(formData);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Authentication required');
  });

  it('should require authentication for getMessages', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.MockedFunction<typeof auth>).mockResolvedValue(null);

    const result = await getMessages('123e4567-e89b-12d3-a456-426614174000');
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Authentication required');
  });

  it('should require authentication for getConversations', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.MockedFunction<typeof auth>).mockResolvedValue(null);

    const result = await getConversations();
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Authentication required');
  });

  it('should require authentication for updateMessageStatus', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.MockedFunction<typeof auth>).mockResolvedValue(null);

    const result = await updateMessageStatus(
      '123e4567-e89b-12d3-a456-426614174000',
      'read'
    );
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Authentication required');
  });

  it('should require authentication for markConversationAsRead', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.MockedFunction<typeof auth>).mockResolvedValue(null);

    const result = await markConversationAsRead('123e4567-e89b-12d3-a456-426614174000');
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Authentication required');
  });
});

describe('Messaging Server Actions - Authorization Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticated user
    const { auth } = require('@/auth');
    auth.mockResolvedValue({
      user: mockUser
    });
  });

  it('should check user access for sendMessage', async () => {
    // Mock database to return no match (user doesn't have access)
    const db = await import('@/db/drizzle');
    const mockDb = db.default as any;
    
    mockDb.query = {
      matches: {
        findFirst: jest.fn().mockResolvedValue(null) // No match found
      }
    };

    const formData = new FormData();
    formData.append('matchId', '123e4567-e89b-12d3-a456-426614174000');
    formData.append('content', 'Test message');

    const result = await sendMessage(formData);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized access to conversation');
  });

  it('should check user access for getMessages', async () => {
    // Mock database to return no match
    const db = await import('@/db/drizzle');
    const mockDb = db.default as any;
    
    mockDb.query = {
      matches: {
        findFirst: jest.fn().mockResolvedValue(null)
      }
    };

    const result = await getMessages('123e4567-e89b-12d3-a456-426614174000');
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized access to conversation');
  });
});

describe('Messaging Server Actions - Error Handling Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticated user
    const { auth } = require('@/auth');
    auth.mockResolvedValue({
      user: mockUser
    });
  });

  it('should handle database errors gracefully in sendMessage', async () => {
    // Mock database to throw an error
    const db = await import('@/db/drizzle');
    const mockDb = db.default as any;
    
    mockDb.query = {
      matches: {
        findFirst: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      }
    };

    const formData = new FormData();
    formData.append('matchId', '123e4567-e89b-12d3-a456-426614174000');
    formData.append('content', 'Test message');

    const result = await sendMessage(formData);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to send message. Please try again.');
  });

  it('should handle database errors gracefully in getMessages', async () => {
    const db = await import('@/db/drizzle');
    const mockDb = db.default as any;
    
    mockDb.query = {
      matches: {
        findFirst: jest.fn().mockRejectedValue(new Error('Database error'))
      }
    };

    const result = await getMessages('123e4567-e89b-12d3-a456-426614174000');
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to load messages. Please try again.');
  });
});

describe('validateUserAccess utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false for invalid matchId', async () => {
    const result = await validateUserAccess('invalid-uuid', 'user-id');
    
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

    const result = await validateUserAccess('123e4567-e89b-12d3-a456-426614174000', 'user-id');
    
    expect(result).toBe(false);
  });

  it('should return true when user has access to match', async () => {
    const db = await import('@/db/drizzle');
    const mockDb = db.default as any;
    
    mockDb.query = {
      matches: {
        findFirst: jest.fn().mockResolvedValue(mockMatch)
      }
    };

    const result = await validateUserAccess(mockMatch.id, mockUser.id);
    
    expect(result).toBe(true);
  });
});

// Performance and edge case tests
describe('Messaging Server Actions - Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle malformed FormData gracefully', async () => {
    const formData = new FormData();
    // Missing required fields

    const result = await sendMessage(formData);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle very long valid messages', async () => {
    const formData = new FormData();
    formData.append('matchId', '123e4567-e89b-12d3-a456-426614174000');
    formData.append('content', 'a'.repeat(1000)); // Exactly at limit

    // Should pass validation but fail at auth
    const result = await sendMessage(formData);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Authentication required'); // Not a validation error
  });

  it('should handle special characters in message content', async () => {
    const formData = new FormData();
    formData.append('matchId', '123e4567-e89b-12d3-a456-426614174000');
    formData.append('content', '🎉 Hello! @user #hashtag $special &chars');

    const result = await sendMessage(formData);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Authentication required'); // Should pass validation
  });
});

// Mock cleanup
afterEach(() => {
  jest.clearAllMocks();
});