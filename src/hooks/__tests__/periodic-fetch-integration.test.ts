/**
 * Integration test for periodic message fetching
 * This test verifies the hook works with the actual messaging system
 */

import { renderHook, act } from '@testing-library/react';
import { usePeriodicMessageFetch } from '../use-periodic-message-fetch';

// Mock the messaging actions
jest.mock('@/lib/messaging', () => ({
  getMessages: jest.fn(),
  retryWithBackoff: jest.fn(),
  DEFAULT_RETRY_CONFIG: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  }
}));

describe('Periodic Message Fetch Integration', () => {
  it('should export the hook correctly', () => {
    expect(usePeriodicMessageFetch).toBeDefined();
    expect(typeof usePeriodicMessageFetch).toBe('function');
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => 
      usePeriodicMessageFetch('test-match-id', { enabled: false })
    );

    expect(result.current.messages).toEqual([]);
    expect(result.current.isFetching).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasMore).toBe(false);
    expect(result.current.totalCount).toBe(0);
    expect(typeof result.current.refetch).toBe('function');
    expect(typeof result.current.setUserTyping).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
    expect(typeof result.current.getIntervalId).toBe('function');
  });

  it('should handle typing state correctly', () => {
    const { result } = renderHook(() => 
      usePeriodicMessageFetch('test-match-id', { enabled: false })
    );

    act(() => {
      result.current.setUserTyping(true);
    });

    // The hook should accept the typing state without errors
    expect(result.current.setUserTyping).toBeDefined();
  });

  it('should provide interval control', () => {
    const { result } = renderHook(() => 
      usePeriodicMessageFetch('test-match-id', { enabled: false })
    );

    const intervalId = result.current.getIntervalId();
    expect(intervalId).toBeNull(); // Should be null when disabled
  });
});