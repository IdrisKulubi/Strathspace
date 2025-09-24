/**
 * Unit tests for messaging error handling utilities
 * Tests error creation, normalization, and handling logic
 */

import { describe, it, expect, jest } from '@jest/globals';
import { z } from 'zod';
import {
  MessagingErrorType,
  createMessagingError,
  isRetryableError,
  normalizeError,
  createErrorResult,
  createSuccessResult,
  withErrorHandling,
  retryWithBackoff,
  validateAndExecute,
  extractFormData,
  getUserFriendlyErrorMessage,
  DEFAULT_RETRY_CONFIG
} from '../messaging-errors.utils';

describe('Error Creation and Classification', () => {
  describe('createMessagingError', () => {
    it('should create error with default message', () => {
      const error = createMessagingError(MessagingErrorType.AUTH_ERROR);
      
      expect(error.type).toBe(MessagingErrorType.AUTH_ERROR);
      expect(error.message).toBe('Authentication required');
      expect(error.retryable).toBe(false);
    });

    it('should create error with custom message and code', () => {
      const error = createMessagingError(
        MessagingErrorType.VALIDATION_ERROR,
        'Custom validation message',
        'CUSTOM_001',
        { field: 'content' }
      );
      
      expect(error.type).toBe(MessagingErrorType.VALIDATION_ERROR);
      expect(error.message).toBe('Custom validation message');
      expect(error.code).toBe('CUSTOM_001');
      expect(error.details).toEqual({ field: 'content' });
      expect(error.retryable).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable errors', () => {
      const retryableTypes = [
        MessagingErrorType.NETWORK_ERROR,
        MessagingErrorType.DATABASE_ERROR,
        MessagingErrorType.UNKNOWN_ERROR
      ];

      retryableTypes.forEach(type => {
        expect(isRetryableError(type)).toBe(true);
      });
    });

    it('should identify non-retryable errors', () => {
      const nonRetryableTypes = [
        MessagingErrorType.VALIDATION_ERROR,
        MessagingErrorType.AUTH_ERROR,
        MessagingErrorType.PERMISSION_ERROR,
        MessagingErrorType.RATE_LIMIT_ERROR,
        MessagingErrorType.MESSAGE_NOT_FOUND,
        MessagingErrorType.MATCH_NOT_FOUND
      ];

      nonRetryableTypes.forEach(type => {
        expect(isRetryableError(type)).toBe(false);
      });
    });
  });
});

describe('Error Normalization', () => {
  describe('normalizeError', () => {
    it('should normalize Zod validation errors', () => {
      const zodSchema = z.object({
        content: z.string().min(1, 'Content is required')
      });

      try {
        zodSchema.parse({ content: '' });
      } catch (error) {
        const normalized = normalizeError(error);
        
        expect(normalized.type).toBe(MessagingErrorType.VALIDATION_ERROR);
        expect(normalized.message).toContain('Content is required');
        expect(normalized.retryable).toBe(false);
      }
    });

    it('should normalize authentication errors', () => {
      const authError = new Error('authentication failed');
      const normalized = normalizeError(authError);
      
      expect(normalized.type).toBe(MessagingErrorType.AUTH_ERROR);
      expect(normalized.message).toBe('authentication failed');
      expect(normalized.retryable).toBe(false);
    });

    it('should normalize permission errors', () => {
      const permissionError = new Error('access denied');
      const normalized = normalizeError(permissionError);
      
      expect(normalized.type).toBe(MessagingErrorType.PERMISSION_ERROR);
      expect(normalized.message).toBe('access denied');
      expect(normalized.retryable).toBe(false);
    });

    it('should normalize network errors', () => {
      const networkError = new Error('network connection failed');
      const normalized = normalizeError(networkError);
      
      expect(normalized.type).toBe(MessagingErrorType.NETWORK_ERROR);
      expect(normalized.message).toBe('network connection failed');
      expect(normalized.retryable).toBe(true);
    });

    it('should normalize database errors', () => {
      const dbError = new Error('database query failed');
      const normalized = normalizeError(dbError);
      
      expect(normalized.type).toBe(MessagingErrorType.DATABASE_ERROR);
      expect(normalized.message).toBe('database query failed');
      expect(normalized.retryable).toBe(true);
    });

    it('should handle string errors', () => {
      const normalized = normalizeError('Something went wrong');
      
      expect(normalized.type).toBe(MessagingErrorType.UNKNOWN_ERROR);
      expect(normalized.message).toBe('Something went wrong');
      expect(normalized.retryable).toBe(true);
    });

    it('should handle unknown error types', () => {
      const normalized = normalizeError({ weird: 'object' });
      
      expect(normalized.type).toBe(MessagingErrorType.UNKNOWN_ERROR);
      expect(normalized.message).toBe('An unexpected error occurred');
      expect(normalized.retryable).toBe(true);
    });
  });
});

describe('Result Creation', () => {
  describe('createErrorResult', () => {
    it('should create error result', () => {
      const error = createMessagingError(MessagingErrorType.VALIDATION_ERROR, 'Test error');
      const result = createErrorResult(error);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
      expect(result.data).toBeUndefined();
    });
  });

  describe('createSuccessResult', () => {
    it('should create success result', () => {
      const data = { id: '123', content: 'Test message' };
      const result = createSuccessResult(data);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.error).toBeUndefined();
    });
  });
});

describe('Error Handling Wrappers', () => {
  describe('withErrorHandling', () => {
    it('should return success result for successful operations', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await withErrorHandling(operation, 'test operation');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should return error result for failed operations', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Test error'));
      const result = await withErrorHandling(operation, 'test operation');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
      expect(operation).toHaveBeenCalled();
    });
  });

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
        .mockResolvedValue('success');
      
      const result = await retryWithBackoff(operation, {
        maxRetries: 2,
        baseDelay: 10,
        maxDelay: 100,
        backoffFactor: 2
      });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('authentication failed'));
      
      await expect(retryWithBackoff(operation)).rejects.toThrow('authentication failed');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should exhaust retries and throw last error', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('network error'));
      
      await expect(retryWithBackoff(operation, {
        maxRetries: 2,
        baseDelay: 10,
        maxDelay: 100,
        backoffFactor: 2
      })).rejects.toThrow('network error');
      
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('validateAndExecute', () => {
    const testSchema = z.object({
      content: z.string().min(1, 'Content required')
    });

    it('should validate and execute successfully', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const input = { content: 'Valid content' };
      
      const result = await validateAndExecute(testSchema, input, operation);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(operation).toHaveBeenCalledWith(input);
    });

    it('should return validation error for invalid input', async () => {
      const operation = jest.fn();
      const input = { content: '' };
      
      const result = await validateAndExecute(testSchema, input, operation);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Content required');
      expect(operation).not.toHaveBeenCalled();
    });

    it('should handle operation errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      const input = { content: 'Valid content' };
      
      const result = await validateAndExecute(testSchema, input, operation);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Operation failed');
      expect(operation).toHaveBeenCalled();
    });
  });
});

describe('Form Data Handling', () => {
  describe('extractFormData', () => {
    it('should extract valid form data', () => {
      const formData = new FormData();
      formData.append('field1', 'value1');
      formData.append('field2', 'value2');
      
      const result = extractFormData(formData, ['field1', 'field2']);
      
      expect(result).toEqual({
        field1: 'value1',
        field2: 'value2'
      });
    });

    it('should throw error for missing fields', () => {
      const formData = new FormData();
      formData.append('field1', 'value1');
      
      expect(() => {
        extractFormData(formData, ['field1', 'field2']);
      }).toThrow('Missing or invalid field: field2');
    });

    it('should throw error for non-string values', () => {
      const formData = new FormData();
      const file = new File(['content'], 'test.txt');
      formData.append('field1', file);
      
      expect(() => {
        extractFormData(formData, ['field1']);
      }).toThrow('Missing or invalid field: field1');
    });
  });
});

describe('User-Friendly Messages', () => {
  describe('getUserFriendlyErrorMessage', () => {
    it('should return user-friendly messages for each error type', () => {
      const testCases = [
        {
          type: MessagingErrorType.VALIDATION_ERROR,
          message: 'Field is required',
          expected: 'Field is required'
        },
        {
          type: MessagingErrorType.AUTH_ERROR,
          message: 'Auth failed',
          expected: 'Please sign in to continue'
        },
        {
          type: MessagingErrorType.PERMISSION_ERROR,
          message: 'No access',
          expected: "You don't have permission to access this conversation"
        },
        {
          type: MessagingErrorType.NETWORK_ERROR,
          message: 'Network failed',
          expected: 'Connection failed. Please check your internet and try again'
        },
        {
          type: MessagingErrorType.DATABASE_ERROR,
          message: 'DB error',
          expected: 'Something went wrong. Please try again in a moment'
        },
        {
          type: MessagingErrorType.RATE_LIMIT_ERROR,
          message: 'Too fast',
          expected: "You're sending messages too quickly. Please slow down"
        },
        {
          type: MessagingErrorType.MESSAGE_NOT_FOUND,
          message: 'Not found',
          expected: 'This message could not be found'
        },
        {
          type: MessagingErrorType.MATCH_NOT_FOUND,
          message: 'Match not found',
          expected: 'This conversation could not be found'
        },
        {
          type: MessagingErrorType.UNKNOWN_ERROR,
          message: 'Unknown',
          expected: 'Something went wrong. Please try again'
        }
      ];

      testCases.forEach(({ type, message, expected }) => {
        const error = createMessagingError(type, message);
        const friendlyMessage = getUserFriendlyErrorMessage(error);
        expect(friendlyMessage).toBe(expected);
      });
    });
  });
});

describe('Configuration', () => {
  describe('DEFAULT_RETRY_CONFIG', () => {
    it('should have reasonable default values', () => {
      expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
      expect(DEFAULT_RETRY_CONFIG.baseDelay).toBe(1000);
      expect(DEFAULT_RETRY_CONFIG.maxDelay).toBe(10000);
      expect(DEFAULT_RETRY_CONFIG.backoffFactor).toBe(2);
    });
  });
});