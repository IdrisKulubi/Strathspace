/**
 * Comprehensive tests for error recovery hook
 * Tests cover error handling, retry logic, offline support, and state management
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useErrorRecovery, useSimpleRetry } from '../use-error-recovery';
import { MessagingErrorType, createMessagingError } from '@/lib/utils/messaging-errors.utils';

// Mock dependencies
jest.mock('../use-toast', () => ({
  toast: jest.fn()
}));

jest.mock('@/lib/utils/offline-queue', () => ({
  useOfflineQueue: jest.fn(() => ({
    enqueueMessage: jest.fn(),
    getQueuedMessages: jest.fn(() => []),
    getQueuedMessagesForMatch: jest.fn(() => []),
    getStatus: jest.fn(() => ({ queueSize: 0, isOnline: true, failedMessages: 0 })),
    syncAll: jest.fn(() => Promise.resolve({ successful: 0, failed: 0, errors: [] })),
    clear: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }))
}));

import { toast } from '../use-toast';
const mockToast = toast as jest.MockedFunction<typeof toast>;

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock console methods
const originalConsole = console;
beforeEach(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  
  // Reset mocks
  mockToast.mockClear();
  
  // Reset navigator.onLine
  (navigator as any).onLine = true;
});

afterEach(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

describe('useErrorRecovery', () => {
  describe('Basic Functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useErrorRecovery());
      
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.isRetrying).toBe(false);
      expect(result.current.state.retryAttempts).toBe(0);
      expect(result.current.state.errorHistory).toEqual([]);
      expect(result.current.state.isOffline).toBe(false);
      expect(result.current.state.stats).toEqual({
        totalErrors: 0,
        totalRetries: 0,
        successfulRecoveries: 0,
        permanentFailures: 0
      });
    });

    it('should execute successful operations without retry', async () => {
      const { result } = renderHook(() => useErrorRecovery());
      
      const operation = jest.fn().mockResolvedValue('success');
      
      await act(async () => {
        const response = await result.current.actions.executeWithRetry(operation);
        expect(response).toBe('success');
      });
      
      expect(operation).toHaveBeenCalledTimes(1);
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.retryAttempts).toBe(0);
    });

    it('should retry failed operations', async () => {
      const { result } = renderHook(() => useErrorRecovery({
        retryConfig: {
          maxRetries: 2,
          baseDelay: 10,
          maxDelay: 100,
          backoffFactor: 2,
          jitterFactor: 0
        }
      }));
      
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success');
      
      await act(async () => {
        const response = await result.current.actions.executeWithRetry(operation);
        expect(response).toBe('success');
      });
      
      expect(operation).toHaveBeenCalledTimes(2);
      expect(result.current.state.stats.successfulRecoveries).toBe(1);
    });

    it('should fail after max retries', async () => {
      const { result } = renderHook(() => useErrorRecovery({
        retryConfig: {
          maxRetries: 2,
          baseDelay: 10,
          maxDelay: 100,
          backoffFactor: 2,
          jitterFactor: 0
        }
      }));
      
      const operation = jest.fn().mockRejectedValue(new Error('persistent error'));
      
      await act(async () => {
        await expect(
          result.current.actions.executeWithRetry(operation)
        ).rejects.toThrow('persistent error');
      });
      
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(result.current.state.error).toBeTruthy();
      expect(result.current.state.stats.permanentFailures).toBe(1);
    });
  });

  describe('Error State Management', () => {
    it('should add errors to state', () => {
      const { result } = renderHook(() => useErrorRecovery());
      
      act(() => {
        result.current.actions.addError(new Error('test error'), 'test context');
      });
      
      expect(result.current.state.error).toBeTruthy();
      expect(result.current.state.error?.message).toBe('test error');
      expect(result.current.state.errorHistory).toHaveLength(1);
      expect(result.current.state.stats.totalErrors).toBe(1);
    });

    it('should clear current error', () => {
      const { result } = renderHook(() => useErrorRecovery());
      
      act(() => {
        result.current.actions.addError(new Error('test error'));
      });
      
      expect(result.current.state.error).toBeTruthy();
      
      act(() => {
        result.current.actions.clearError();
      });
      
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.retryAttempts).toBe(0);
    });

    it('should clear error history', () => {
      const { result } = renderHook(() => useErrorRecovery());
      
      act(() => {
        result.current.actions.addError(new Error('error 1'));
        result.current.actions.addError(new Error('error 2'));
      });
      
      expect(result.current.state.errorHistory).toHaveLength(2);
      
      act(() => {
        result.current.actions.clearHistory();
      });
      
      expect(result.current.state.errorHistory).toHaveLength(0);
    });

    it('should mark errors as resolved', () => {
      const { result } = renderHook(() => useErrorRecovery());
      
      act(() => {
        result.current.actions.addError(new Error('test error'));
      });
      
      expect(result.current.state.error).toBeTruthy();
      
      act(() => {
        result.current.actions.markResolved();
      });
      
      expect(result.current.state.error).toBeNull();
    });

    it('should limit error history size', () => {
      const { result } = renderHook(() => useErrorRecovery({
        maxErrorHistory: 3
      }));
      
      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.actions.addError(new Error(`error ${i}`));
        }
      });
      
      expect(result.current.state.errorHistory).toHaveLength(3);
      // Should keep the most recent errors
      expect(result.current.state.errorHistory[0].error.message).toBe('error 4');
      expect(result.current.state.errorHistory[2].error.message).toBe('error 2');
    });
  });

  describe('Network Status Handling', () => {
    it('should track online/offline status', () => {
      const { result } = renderHook(() => useErrorRecovery());
      
      expect(result.current.state.isOffline).toBe(false);
      
      // Simulate going offline
      act(() => {
        (navigator as any).onLine = false;
        window.dispatchEvent(new Event('offline'));
      });
      
      expect(result.current.state.isOffline).toBe(true);
      
      // Simulate coming online
      act(() => {
        (navigator as any).onLine = true;
        window.dispatchEvent(new Event('online'));
      });
      
      expect(result.current.state.isOffline).toBe(false);
    });
  });

  describe('Toast Notifications', () => {
    it('should show toast on successful recovery', async () => {
      const { result } = renderHook(() => useErrorRecovery({
        showToasts: true,
        retryConfig: {
          maxRetries: 2,
          baseDelay: 10,
          maxDelay: 100,
          backoffFactor: 2,
          jitterFactor: 0
        }
      }));
      
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success');
      
      await act(async () => {
        await result.current.actions.executeWithRetry(operation);
      });
      
      expect(mockToast).toHaveBeenCalledWith({
        title: "Operation succeeded",
        description: expect.stringContaining("Recovered after"),
        variant: "default"
      });
    });

    it('should show toast on permanent failure', async () => {
      const { result } = renderHook(() => useErrorRecovery({
        showToasts: true,
        retryConfig: {
          maxRetries: 1,
          baseDelay: 10,
          maxDelay: 100,
          backoffFactor: 2,
          jitterFactor: 0
        }
      }));
      
      const operation = jest.fn().mockRejectedValue(new Error('auth error'));
      
      await act(async () => {
        await expect(
          result.current.actions.executeWithRetry(operation)
        ).rejects.toThrow();
      });
      
      expect(mockToast).toHaveBeenCalledWith({
        title: "Operation failed",
        description: expect.any(String),
        variant: "destructive"
      });
    });

    it('should not show toasts when disabled', async () => {
      const { result } = renderHook(() => useErrorRecovery({
        showToasts: false
      }));
      
      act(() => {
        result.current.actions.addError(new Error('test error'));
      });
      
      expect(mockToast).not.toHaveBeenCalled();
    });
  });

  describe('Retry Functionality', () => {
    it('should retry last failed operation', async () => {
      const { result } = renderHook(() => useErrorRecovery({
        retryConfig: {
          maxRetries: 1,
          baseDelay: 10,
          maxDelay: 100,
          backoffFactor: 2,
          jitterFactor: 0
        }
      }));
      
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success');
      
      // First attempt should fail
      await act(async () => {
        await expect(
          result.current.actions.executeWithRetry(operation)
        ).rejects.toThrow();
      });
      
      expect(operation).toHaveBeenCalledTimes(2); // Initial + 1 retry
      
      // Manual retry should succeed
      await act(async () => {
        await result.current.actions.retry();
      });
      
      expect(operation).toHaveBeenCalledTimes(4); // Previous 2 + initial + 1 retry
    });

    it('should throw error when no operation to retry', async () => {
      const { result } = renderHook(() => useErrorRecovery());
      
      await act(async () => {
        await expect(result.current.actions.retry()).rejects.toThrow('No operation to retry');
      });
    });
  });

  describe('Error Message Handling', () => {
    it('should return user-friendly error messages', () => {
      const { result } = renderHook(() => useErrorRecovery());
      
      act(() => {
        result.current.actions.addError(
          createMessagingError(MessagingErrorType.NETWORK_ERROR, 'Connection failed')
        );
      });
      
      const message = result.current.actions.getErrorMessage();
      expect(message).toBe('Connection failed. Please check your internet and try again');
    });

    it('should handle different error types', () => {
      const { result } = renderHook(() => useErrorRecovery());
      
      const testCases = [
        {
          error: createMessagingError(MessagingErrorType.AUTH_ERROR),
          expected: 'Please sign in to continue'
        },
        {
          error: createMessagingError(MessagingErrorType.PERMISSION_ERROR),
          expected: "You don't have permission to perform this action"
        },
        {
          error: createMessagingError(MessagingErrorType.RATE_LIMIT_ERROR),
          expected: "You're sending messages too quickly. Please slow down"
        }
      ];
      
      testCases.forEach(({ error, expected }) => {
        act(() => {
          result.current.actions.addError(error);
        });
        
        expect(result.current.actions.getErrorMessage()).toBe(expected);
        
        act(() => {
          result.current.actions.clearError();
        });
      });
    });
  });

  describe('Callback Handling', () => {
    it('should call onRecovery callback', async () => {
      const onRecovery = jest.fn();
      
      const { result } = renderHook(() => useErrorRecovery({
        onRecovery,
        retryConfig: {
          maxRetries: 2,
          baseDelay: 10,
          maxDelay: 100,
          backoffFactor: 2,
          jitterFactor: 0
        }
      }));
      
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success');
      
      await act(async () => {
        await result.current.actions.executeWithRetry(operation);
      });
      
      expect(onRecovery).toHaveBeenCalledWith(2); // 2 attempts total
    });

    it('should call onPermanentFailure callback', async () => {
      const onPermanentFailure = jest.fn();
      
      const { result } = renderHook(() => useErrorRecovery({
        onPermanentFailure,
        retryConfig: {
          maxRetries: 1,
          baseDelay: 10,
          maxDelay: 100,
          backoffFactor: 2,
          jitterFactor: 0
        }
      }));
      
      const operation = jest.fn().mockRejectedValue(new Error('persistent error'));
      
      await act(async () => {
        await expect(
          result.current.actions.executeWithRetry(operation)
        ).rejects.toThrow();
      });
      
      expect(onPermanentFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'persistent error'
        })
      );
    });
  });
});

describe('useSimpleRetry', () => {
  it('should execute operations with retry', async () => {
    const { result } = renderHook(() => useSimpleRetry({
      maxRetries: 2,
      baseDelay: 10,
      maxDelay: 100,
      backoffFactor: 2,
      jitterFactor: 0
    }));
    
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');
    
    await act(async () => {
      const response = await result.current.executeWithRetry(operation);
      expect(response).toBe('success');
    });
    
    expect(operation).toHaveBeenCalledTimes(2);
    expect(result.current.attempts).toBe(2);
  });

  it('should track retry state', async () => {
    const { result } = renderHook(() => useSimpleRetry());
    
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.attempts).toBe(0);
    
    const operation = jest.fn().mockResolvedValue('success');
    
    await act(async () => {
      await result.current.executeWithRetry(operation);
    });
    
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.attempts).toBe(1);
  });

  it('should handle operation failures', async () => {
    const { result } = renderHook(() => useSimpleRetry({
      maxRetries: 1,
      baseDelay: 10,
      maxDelay: 100,
      backoffFactor: 2,
      jitterFactor: 0
    }));
    
    const operation = jest.fn().mockRejectedValue(new Error('persistent error'));
    
    await act(async () => {
      await expect(
        result.current.executeWithRetry(operation)
      ).rejects.toThrow('persistent error');
    });
    
    expect(operation).toHaveBeenCalledTimes(2); // Initial + 1 retry
    expect(result.current.attempts).toBe(2);
  });
});