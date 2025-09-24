/**
 * Unit tests for messaging validation functions
 * These tests focus on the validation logic without external dependencies
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateMessageContent,
  validateUUID,
  validatePagination,
  validateMessageComprehensive,
  customValidationRules,
  sendMessageSchema,
  getMessagesSchema,
  updateMessageStatusSchema,
  messageContentSchema
} from '../messaging.validators';

describe('Message Content Validation', () => {
  describe('validateMessageContent', () => {
    it('should accept valid message content', () => {
      const result = validateMessageContent('Hello, this is a valid message!');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty messages', () => {
      const result = validateMessageContent('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Message cannot be empty');
    });

    it('should reject whitespace-only messages', () => {
      const result = validateMessageContent('   \n\t   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Message cannot be empty');
    });

    it('should reject messages that are too long', () => {
      const longMessage = 'a'.repeat(1001);
      const result = validateMessageContent(longMessage);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Message is too long');
    });

    it('should accept messages at the character limit', () => {
      const maxLengthMessage = 'a'.repeat(1000);
      const result = validateMessageContent(maxLengthMessage);
      expect(result.isValid).toBe(true);
    });

    it('should handle special characters and emojis', () => {
      const result = validateMessageContent('Hello! 🎉 @user #hashtag $special &chars');
      expect(result.isValid).toBe(true);
    });

    it('should handle unicode characters', () => {
      const result = validateMessageContent('こんにちは 世界! 🌍');
      expect(result.isValid).toBe(true);
    });
  });

  describe('messageContentSchema', () => {
    it('should parse valid content', () => {
      expect(() => messageContentSchema.parse('Valid message')).not.toThrow();
    });

    it('should throw for invalid content', () => {
      expect(() => messageContentSchema.parse('')).toThrow();
      expect(() => messageContentSchema.parse('a'.repeat(1001))).toThrow();
    });

    it('should trim whitespace', () => {
      const result = messageContentSchema.parse('  Hello World  ');
      expect(result).toBe('Hello World');
    });
  });
});

describe('UUID Validation', () => {
  describe('validateUUID', () => {
    it('should accept valid UUIDs', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      ];

      validUUIDs.forEach(uuid => {
        const result = validateUUID(uuid);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        'invalid-uuid',
        '123e4567-e89b-12d3-a456',
        '123e4567-e89b-12d3-a456-426614174000-extra',
        '',
        'not-a-uuid-at-all'
      ];

      invalidUUIDs.forEach(uuid => {
        const result = validateUUID(uuid);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });
});

describe('Pagination Validation', () => {
  describe('validatePagination', () => {
    it('should accept valid pagination parameters', () => {
      const validParams = [
        { limit: 50 },
        { limit: 25, offset: 0 },
        { limit: 100, cursor: '2023-01-01T00:00:00.000Z' }
      ];

      validParams.forEach(params => {
        const result = validatePagination(params);
        expect(result.isValid).toBe(true);
        expect(result.data).toBeDefined();
      });
    });

    it('should apply default values', () => {
      const result = validatePagination({});
      expect(result.isValid).toBe(true);
      expect(result.data?.limit).toBe(50);
      // offset is optional, so it may be undefined when not provided
      expect(result.data?.offset).toBeUndefined();
    });

    it('should reject invalid pagination parameters', () => {
      const invalidParams = [
        { limit: 0 },
        { limit: 101 },
        { limit: -1 },
        { offset: -1 }
      ];

      invalidParams.forEach(params => {
        const result = validatePagination(params);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });
});

describe('Comprehensive Message Validation', () => {
  describe('validateMessageComprehensive', () => {
    it('should pass basic validation for normal messages', () => {
      const result = validateMessageComprehensive('Hello, how are you?');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect emoji-only messages when checking substantive content', () => {
      const result = validateMessageComprehensive('🎉🎊🎈', {
        checkSubstantive: true
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message must contain meaningful text content');
    });

    it('should detect spam messages', () => {
      const spamMessage = 'aaaaaaaaaaaaaaaaaaaaaa'; // More than 10 repeated chars
      const result = validateMessageComprehensive(spamMessage, {
        checkSpam: true
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message appears to be spam (too many repeated characters)');
    });

    it('should detect excessive line breaks', () => {
      const messageWithManyBreaks = 'Hello\n\n\n\n\n\n\n\n\n\n\n\nWorld';
      const result = validateMessageComprehensive(messageWithManyBreaks, {
        checkFormatting: true
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message has too many line breaks');
    });

    it('should pass all checks for well-formatted messages', () => {
      const goodMessage = 'Hello! How are you doing today? 😊';
      const result = validateMessageComprehensive(goodMessage, {
        checkSubstantive: true,
        checkSpam: true,
        checkFormatting: true
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('Custom Validation Rules', () => {
  describe('hasSubstantiveContent', () => {
    it('should return true for messages with text content', () => {
      expect(customValidationRules.hasSubstantiveContent('Hello world')).toBe(true);
      expect(customValidationRules.hasSubstantiveContent('Hello 😊 world')).toBe(true);
    });

    it('should return false for emoji-only messages', () => {
      expect(customValidationRules.hasSubstantiveContent('😊🎉🎊')).toBe(false);
      expect(customValidationRules.hasSubstantiveContent('🔥')).toBe(false);
    });
  });

  describe('isNotSpam', () => {
    it('should return true for normal messages', () => {
      expect(customValidationRules.isNotSpam('Hello world')).toBe(true);
      expect(customValidationRules.isNotSpam('aaa bbb ccc')).toBe(true);
    });

    it('should return false for spam messages', () => {
      expect(customValidationRules.isNotSpam('aaaaaaaaaaaaaaaaaaaaaa')).toBe(false);
      expect(customValidationRules.isNotSpam('!!!!!!!!!!!!!!!!!!!!!')).toBe(false);
    });
  });

  describe('hasReasonableFormatting', () => {
    it('should return true for well-formatted messages', () => {
      expect(customValidationRules.hasReasonableFormatting('Hello\nWorld')).toBe(true);
      expect(customValidationRules.hasReasonableFormatting('Line 1\nLine 2\nLine 3')).toBe(true);
    });

    it('should return false for messages with too many line breaks', () => {
      const manyBreaks = 'Hello\n'.repeat(11) + 'World';
      expect(customValidationRules.hasReasonableFormatting(manyBreaks)).toBe(false);
    });
  });

  describe('isWithinRateLimit', () => {
    it('should return true when enough time has passed', () => {
      const pastTime = new Date(Date.now() - 2000); // 2 seconds ago
      expect(customValidationRules.isWithinRateLimit(pastTime, 1000)).toBe(true);
    });

    it('should return false when not enough time has passed', () => {
      const recentTime = new Date(Date.now() - 500); // 0.5 seconds ago
      expect(customValidationRules.isWithinRateLimit(recentTime, 1000)).toBe(false);
    });
  });
});

describe('Schema Validation', () => {
  describe('sendMessageSchema', () => {
    it('should validate correct send message data', () => {
      const validData = {
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Hello world!'
      };
      
      expect(() => sendMessageSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid send message data', () => {
      const invalidData = [
        { matchId: 'invalid', content: 'Hello' },
        { matchId: '123e4567-e89b-12d3-a456-426614174000', content: '' },
        { matchId: '123e4567-e89b-12d3-a456-426614174000', content: 'a'.repeat(1001) }
      ];

      invalidData.forEach(data => {
        expect(() => sendMessageSchema.parse(data)).toThrow();
      });
    });
  });

  describe('getMessagesSchema', () => {
    it('should validate correct get messages data', () => {
      const validData = [
        { matchId: '123e4567-e89b-12d3-a456-426614174000' },
        { matchId: '123e4567-e89b-12d3-a456-426614174000', limit: 25 },
        { matchId: '123e4567-e89b-12d3-a456-426614174000', limit: 50, before: '2023-01-01T00:00:00.000Z' }
      ];

      validData.forEach(data => {
        expect(() => getMessagesSchema.parse(data)).not.toThrow();
      });
    });

    it('should apply default limit', () => {
      const data = { matchId: '123e4567-e89b-12d3-a456-426614174000' };
      const result = getMessagesSchema.parse(data);
      expect(result.limit).toBe(50);
    });

    it('should reject invalid get messages data', () => {
      const invalidData = [
        { matchId: 'invalid' },
        { matchId: '123e4567-e89b-12d3-a456-426614174000', limit: 0 },
        { matchId: '123e4567-e89b-12d3-a456-426614174000', limit: 101 },
        { matchId: '123e4567-e89b-12d3-a456-426614174000', before: 'invalid-date' }
      ];

      invalidData.forEach(data => {
        expect(() => getMessagesSchema.parse(data)).toThrow();
      });
    });
  });

  describe('updateMessageStatusSchema', () => {
    it('should validate correct update status data', () => {
      const validData = [
        { messageId: '123e4567-e89b-12d3-a456-426614174000', status: 'delivered' as const },
        { messageId: '123e4567-e89b-12d3-a456-426614174000', status: 'read' as const }
      ];

      validData.forEach(data => {
        expect(() => updateMessageStatusSchema.parse(data)).not.toThrow();
      });
    });

    it('should reject invalid update status data', () => {
      const invalidData = [
        { messageId: 'invalid', status: 'delivered' },
        { messageId: '123e4567-e89b-12d3-a456-426614174000', status: 'invalid' },
        { messageId: '123e4567-e89b-12d3-a456-426614174000', status: 'sent' }
      ];

      invalidData.forEach(data => {
        expect(() => updateMessageStatusSchema.parse(data)).toThrow();
      });
    });
  });
});

describe('Edge Cases and Performance', () => {
  it('should handle very long valid messages efficiently', () => {
    const longMessage = 'a'.repeat(1000);
    const start = performance.now();
    const result = validateMessageContent(longMessage);
    const end = performance.now();
    
    expect(result.isValid).toBe(true);
    expect(end - start).toBeLessThan(100); // Should complete in less than 100ms
  });

  it('should handle unicode and special characters', () => {
    const unicodeMessage = '你好世界 🌍 مرحبا بالعالم Здравствуй мир';
    const result = validateMessageContent(unicodeMessage);
    expect(result.isValid).toBe(true);
  });

  it('should handle mixed content validation', () => {
    const mixedMessage = 'Hello 😊 this is a mix of text and emojis 🎉';
    const result = validateMessageComprehensive(mixedMessage, {
      checkSubstantive: true,
      checkSpam: true,
      checkFormatting: true
    });
    expect(result.isValid).toBe(true);
  });
});