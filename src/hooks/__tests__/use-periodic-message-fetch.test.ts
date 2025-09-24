import { renderHook, act, waitFor } from '@testing-library/react';
import { usePeriodicMessageFetch } from '../use-periodic-message-fetch';
import { getMessages } from '@/lib/messaging';
import { retryWithBackoff } from '@/lib/messaging';

// Mock the messaging functions
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

const mockGetMessages = getMessages as jest.MockedFunction<typeof getMessages>;
const mockRetryWithBackoff = retryWithBackoff as jest.MockedFunction<typeof retryWithBackoff>;

// Mock timers
jest.useFakeTimers();

describe('usePeriodicMessageFetch', () => {
  const mockMatchId = 'test-match-id';
  const mockMessages = [
    {
      id: '1',
      content: 'Hello',
      matchId: mockMatchId,
      senderId: 'user1',
      status: 'sent' as const,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      sender: {
        id: 'user1',
        name: 'User 1',
        image: null
      }
    },
    {
      id: '2',
      content: 'Hi there',
      matchId: mockMatchId,
      senderId: 'user2',
      status: 'sent' as const,
      createdAt: new Date('2024-01-01T10:01:00Z'),
      updatedAt: new Date('2024-01-01T10:01:00Z'),
      sender: {
        id: 'user2',
        name: 'User 2',
        image: null
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Default successful response
    mockRetryWithBackoff.mockImplementation(async (fn) => await fn());
    mockGetMessages.mockResolvedValue({
      success: true,
      data: {
        messages: mockMessages,
        hasMore: false,
        totalCount: 2
      }
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('Basic functionality', () => {
    it('should fetch messages on initial load', async () => {
      const { result } = renderHook(() => 
        usePeriodicMessageFetch(mockMatchId)
      );

      expect(result.current.isFetching).toBe(true);

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockGetMessages).toHaveBeenCalledWith(mockMatchId, 50);
      expect(result.current.messages).toEqual(mockMessages);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.totalCount).toBe(2);
      expect(result.current.error).toBeNull();
    });

    it('should set up periodic fetching with correct interval', async () => {
      const fetchInterval = 5000;
      
      renderHook(() => 
        usePeriodicMessageFetch(mockMatchId, { fetchInterval })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalledTimes(1);
      });

      // Advance timer by interval
      act(() => {
        jest.advanceTimersByTime(fetchInterval);
      });

      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalledTimes(2);
      });

      // Advance timer again
      act(() => {
        jest.advanceTimersByTime(fetchInterval);
      });

      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalledTimes(3);
      });
    });

    it('should not fetch when disabled', async () => {
      renderHook(() => 
        usePeriodicMessageFetch(mockMatchId, { enabled: false })
      );

      // Wait a bit to ensure no fetch happens
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockGetMessages).not.toHaveBeenCalled();
    });
  });

  describe('Typing pause functionality', () => {
    it('should pause fetching when user is typing', async () => {
      const { result } = renderHook(() => 
        usePeriodicMessageFetch(mockMatchId, { 
          fetchInterval: 2000,
          pauseOnTyping: true 
        })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalledTimes(1);
      });

      // Set user typing
      act(() => {
        result.current.setUserTyping(true);
      });

      // Advance timer - should not fetch while typing
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockGetMessages).toHaveBeenCalledTimes(1);

      // Stop typing
      act(() => {
        result.current.setUserTyping(false);
      });

      // Now it should fetch
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalledTimes(2);
      });
    });

    it('should auto-clear typing status after timeout', async () => {
      const typingTimeout = 3000;
      const { result } = renderHook(() => 
        usePeriodicMessageFetch(mockMatchId, { 
          fetchInterval: 1000,
          typingTimeout 
        })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalledTimes(1);
      });

      // Set user typing
      act(() => {
        result.current.setUserTyping(true);
      });

      // Advance by typing timeout
      act(() => {
        jest.advanceTimersByTime(typingTimeout);
      });

      // Should resume fetching after typing timeout
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalledTimes(2);
      });
    });

    it('should allow manual refetch even when typing', async () => {
      const { result } = renderHook(() => 
        usePeriodicMessageFetch(mockMatchId)
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalledTimes(1);
      });

      // Set user typing
      act(() => {
        result.current.setUserTyping(true);
      });

      // Manual refetch should work even while typing
      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetMessages).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error handling', () => {
    it('should handle fetch errors gracefully', async () => {
      const errorMessage = 'Network error';
      mockGetMessages.mockResolvedValueOnce({
        success: false,
        error: errorMessage
      });

      mockRetryWithBackoff.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => 
        usePeriodicMessageFetch(mockMatchId)
      );

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.isFetching).toBe(false);
      });
    });

    it('should clear error when clearError is called', async () => {
      const errorMessage = 'Network error';
      mockGetMessages.mockResolvedValueOnce({
        success: false,
        error: errorMessage
      });

      mockRetryWithBackoff.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => 
        usePeriodicMessageFetch(mockMatchId)
      );

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should use retry logic for failed requests', async () => {
      const { result } = renderHook(() => 
        usePeriodicMessageFetch(mockMatchId)
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockRetryWithBackoff).toHaveBeenCalled();
    });
  });

  describe('Message deduplication', () => {
    it('should avoid duplicate messages on periodic fetch', async () => {
      const { result } = renderHook(() => 
        usePeriodicMessageFetch(mockMatchId, { fetchInterval: 1000 })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });

      // Mock same messages returned on next fetch
      mockGetMessages.mockResolvedValueOnce({
        success: true,
        data: {
          messages: mockMessages, // Same messages
          hasMore: false,
          totalCount: 2
        }
      });

      // Advance timer for next fetch
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalledTimes(2);
      });

      // Should still have only 2 messages (no duplicates)
      expect(result.current.messages).toHaveLength(2);
    });

    it('should add new messages without duplicating existing ones', async () => {
      const { result } = renderHook(() => 
        usePeriodicMessageFetch(mockMatchId, { fetchInterval: 1000 })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });

      // Mock new message added
      const newMessage = {
        id: '3',
        content: 'New message',
        matchId: mockMatchId,
        senderId: 'user1',
        status: 'sent' as const,
        createdAt: new Date('2024-01-01T10:02:00Z'),
        updatedAt: new Date('2024-01-01T10:02:00Z'),
        sender: {
          id: 'user1',
          name: 'User 1',
          image: null
        }
      };

      mockGetMessages.mockResolvedValueOnce({
        success: true,
        data: {
          messages: [...mockMessages, newMessage],
          hasMore: false,
          totalCount: 3
        }
      });

      // Advance timer for next fetch
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(3);
      });

      expect(result.current.messages[2]).toEqual(newMessage);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup intervals on unmount', () => {
      const { unmount } = renderHook(() => 
        usePeriodicMessageFetch(mockMatchId)
      );

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should cleanup typing timeout on unmount', () => {
      const { result, unmount } = renderHook(() => 
        usePeriodicMessageFetch(mockMatchId)
      );

      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      act(() => {
        result.current.setUserTyping(true);
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('Configuration options', () => {
    it('should respect custom fetch interval', async () => {
      const customInterval = 8000;
      
      renderHook(() => 
        usePeriodicMessageFetch(mockMatchId, { fetchInterval: customInterval })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalledTimes(1);
      });

      // Advance by less than interval - should not fetch
      act(() => {
        jest.advanceTimersByTime(customInterval - 1000);
      });

      expect(mockGetMessages).toHaveBeenCalledTimes(1);

      // Advance to complete interval - should fetch
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalledTimes(2);
      });
    });

    it('should respect custom limit', async () => {
      const customLimit = 25;
      
      renderHook(() => 
        usePeriodicMessageFetch(mockMatchId, { limit: customLimit })
      );

      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalledWith(mockMatchId, customLimit);
      });
    });

    it('should allow disabling typing pause', async () => {
      const { result } = renderHook(() => 
        usePeriodicMessageFetch(mockMatchId, { 
          fetchInterval: 1000,
          pauseOnTyping: false 
        })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalledTimes(1);
      });

      // Set user typing
      act(() => {
        result.current.setUserTyping(true);
      });

      // Should still fetch even while typing
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Utility functions', () => {
    it('should provide interval ID for debugging', () => {
      const { result } = renderHook(() => 
        usePeriodicMessageFetch(mockMatchId)
      );

      const intervalId = result.current.getIntervalId();
      expect(intervalId).toBeDefined();
    });
  });
});