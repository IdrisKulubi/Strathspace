/**
 * Tests for the enhanced periodic message fetch hook with status synchronization
 * These tests cover the status tracking features added in task 8
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePeriodicMessageFetch } from '../use-periodic-message-fetch';

// Mock the messaging actions
jest.mock('@/lib/actions/messaging.actions', () => ({
  getMessages: jest.fn(),
  markMessagesAsDelivered: jest.fn(),
  markConversationAsRead: jest.fn(),
}));

// Mock the retry utility
jest.mock('@/lib/messaging', () => ({
  retryWithBackoff: jest.fn((fn) => fn()),
  DEFAULT_RETRY_CONFIG: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  },
}));

const mockGetMessages = require('@/lib/actions/messaging.actions').getMessages;
const mockMarkMessagesAsDelivered = require('@/lib/actions/messaging.actions').markMessagesAsDelivered;
const mockMarkConversationAsRead = require('@/lib/actions/messaging.actions').markConversationAsRead;

const mockMessages = [
  {
    id: 'message-1',
    content: 'Hello',
    matchId: 'match-1',
    senderId: 'user-2',
    status: 'sent',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    sender: {
      id: 'user-2',
      name: 'John Doe',
      image: null,
    },
  },
  {
    id: 'message-2',
    content: 'How are you?',
    matchId: 'match-1',
    senderId: 'user-2',
    status: 'delivered',
    createdAt: new Date('2024-01-01T10:01:00Z'),
    updatedAt: new Date('2024-01-01T10:01:00Z'),
    sender: {
      id: 'user-2',
      name: 'John Doe',
      image: null,
    },
  },
];

describe('usePeriodicMessageFetch with Status Synchronization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Default successful responses
    mockGetMessages.mockResolvedValue({
      success: true,
      data: {
        messages: mockMessages,
        hasMore: false,
        totalCount: 2,
      },
    });
    
    mockMarkMessagesAsDelivered.mockResolvedValue({
      success: true,
      data: { deliveredCount: 1 },
    });
    
    mockMarkConversationAsRead.mockResolvedValue({
      success: true,
      data: { success: true },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Automatic Delivery Status Updates', () => {
    it('should mark messages as delivered when autoMarkDelivered is enabled', async () => {
      const { result } = renderHook(() =>
        usePeriodicMessageFetch('match-1', {
          autoMarkDelivered: true,
          fetchInterval: 1000,
        })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });

      expect(mockMarkMessagesAsDelivered).toHaveBeenCalledWith('match-1');
    });

    it('should not mark messages as delivered when autoMarkDelivered is disabled', async () => {
      const { result } = renderHook(() =>
        usePeriodicMessageFetch('match-1', {
          autoMarkDelivered: false,
          fetchInterval: 1000,
        })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });

      expect(mockMarkMessagesAsDelivered).not.toHaveBeenCalled();
    });

    it('should continue fetching even if delivery status update fails', async () => {
      mockMarkMessagesAsDelivered.mockRejectedValue(new Error('Delivery update failed'));

      const { result } = renderHook(() =>
        usePeriodicMessageFetch('match-1', {
          autoMarkDelivered: true,
          fetchInterval: 1000,
        })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });

      // Should still have messages despite delivery update failure
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Automatic Read Status Updates', () => {
    it('should mark messages as read when conversation is active and autoMarkRead is enabled', async () => {
      const { result } = renderHook(() =>
        usePeriodicMessageFetch('match-1', {
          autoMarkRead: true,
          isConversationActive: true,
          fetchInterval: 1000,
        })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });

      expect(mockMarkConversationAsRead).toHaveBeenCalledWith('match-1');
    });

    it('should not mark messages as read when conversation is not active', async () => {
      const { result } = renderHook(() =>
        usePeriodicMessageFetch('match-1', {
          autoMarkRead: true,
          isConversationActive: false,
          fetchInterval: 1000,
        })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });

      expect(mockMarkConversationAsRead).not.toHaveBeenCalled();
    });

    it('should not mark messages as read when autoMarkRead is disabled', async () => {
      const { result } = renderHook(() =>
        usePeriodicMessageFetch('match-1', {
          autoMarkRead: false,
          isConversationActive: true,
          fetchInterval: 1000,
        })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });

      expect(mockMarkConversationAsRead).not.toHaveBeenCalled();
    });

    it('should continue fetching even if read status update fails', async () => {
      mockMarkConversationAsRead.mockRejectedValue(new Error('Read update failed'));

      const { result } = renderHook(() =>
        usePeriodicMessageFetch('match-1', {
          autoMarkRead: true,
          isConversationActive: true,
          fetchInterval: 1000,
        })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });

      // Should still have messages despite read update failure
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Combined Status Updates', () => {
    it('should handle both delivery and read status updates together', async () => {
      const { result } = renderHook(() =>
        usePeriodicMessageFetch('match-1', {
          autoMarkDelivered: true,
          autoMarkRead: true,
          isConversationActive: true,
          fetchInterval: 1000,
        })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });

      expect(mockMarkMessagesAsDelivered).toHaveBeenCalledWith('match-1');
      expect(mockMarkConversationAsRead).toHaveBeenCalledWith('match-1');
    });

    it('should handle partial failures in status updates', async () => {
      mockMarkMessagesAsDelivered.mockResolvedValue({
        success: true,
        data: { deliveredCount: 1 },
      });
      mockMarkConversationAsRead.mockRejectedValue(new Error('Read update failed'));

      const { result } = renderHook(() =>
        usePeriodicMessageFetch('match-1', {
          autoMarkDelivered: true,
          autoMarkRead: true,
          isConversationActive: true,
          fetchInterval: 1000,
        })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });

      // Should still succeed overall
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Periodic Status Synchronization', () => {
    it('should perform status updates on each periodic fetch', async () => {
      const { result } = renderHook(() =>
        usePeriodicMessageFetch('match-1', {
          autoMarkDelivered: true,
          fetchInterval: 1000,
        })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });

      // Clear previous calls
      mockMarkMessagesAsDelivered.mockClear();

      // Advance timer to trigger next fetch
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Wait for periodic fetch
      await waitFor(() => {
        expect(mockMarkMessagesAsDelivered).toHaveBeenCalledTimes(1);
      });
    });

    it('should not perform status updates when user is typing', async () => {
      const { result } = renderHook(() =>
        usePeriodicMessageFetch('match-1', {
          autoMarkDelivered: true,
          pauseOnTyping: true,
          fetchInterval: 1000,
        })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });

      // Set user typing
      act(() => {
        result.current.setUserTyping(true);
      });

      // Clear previous calls
      mockGetMessages.mockClear();
      mockMarkMessagesAsDelivered.mockClear();

      // Advance timer to trigger next fetch
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should not fetch or update status while typing
      expect(mockGetMessages).not.toHaveBeenCalled();
      expect(mockMarkMessagesAsDelivered).not.toHaveBeenCalled();
    });
  });

  describe('Manual Refetch with Status Updates', () => {
    it('should perform status updates on manual refetch', async () => {
      const { result } = renderHook(() =>
        usePeriodicMessageFetch('match-1', {
          autoMarkDelivered: true,
          autoMarkRead: true,
          isConversationActive: true,
          enabled: false, // Disable automatic fetching
        })
      );

      // Clear initial calls
      mockMarkMessagesAsDelivered.mockClear();
      mockMarkConversationAsRead.mockClear();

      // Manually trigger refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect(mockMarkMessagesAsDelivered).toHaveBeenCalledWith('match-1');
      expect(mockMarkConversationAsRead).toHaveBeenCalledWith('match-1');
    });

    it('should perform status updates even when user is typing during manual refetch', async () => {
      const { result } = renderHook(() =>
        usePeriodicMessageFetch('match-1', {
          autoMarkDelivered: true,
          pauseOnTyping: true,
          enabled: false,
        })
      );

      // Set user typing
      act(() => {
        result.current.setUserTyping(true);
      });

      // Clear initial calls
      mockMarkMessagesAsDelivered.mockClear();

      // Manually trigger refetch (should work despite typing)
      await act(async () => {
        await result.current.refetch();
      });

      expect(mockMarkMessagesAsDelivered).toHaveBeenCalledWith('match-1');
    });
  });

  describe('Error Handling in Status Updates', () => {
    it('should log warnings for status update failures but not fail the fetch', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      mockMarkMessagesAsDelivered.mockRejectedValue(new Error('Status update failed'));

      const { result } = renderHook(() =>
        usePeriodicMessageFetch('match-1', {
          autoMarkDelivered: true,
          fetchInterval: 1000,
        })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });

      // Should have logged warning but not failed
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to mark messages as delivered:',
        expect.any(Error)
      );
      expect(result.current.error).toBeNull();

      consoleSpy.mockRestore();
    });
  });
});