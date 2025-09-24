import { useEffect, useRef, useCallback, useState } from 'react';
import { getMessages } from '@/lib/messaging';
import { retryWithBackoff, DEFAULT_RETRY_CONFIG, type RetryConfig } from '@/lib/messaging';
import type { MessageWithSender, PaginatedMessages } from '@/lib/messaging';

interface UsePeriodicMessageFetchOptions {
  /**
   * Interval between fetch attempts in milliseconds
   * @default 4000 (4 seconds)
   */
  fetchInterval?: number;
  
  /**
   * Whether to pause fetching when user is actively typing
   * @default true
   */
  pauseOnTyping?: boolean;
  
  /**
   * Timeout for typing detection in milliseconds
   * @default 3000 (3 seconds)
   */
  typingTimeout?: number;
  
  /**
   * Retry configuration for failed requests
   */
  retryConfig?: Partial<RetryConfig>;
  
  /**
   * Whether to enable the periodic fetching
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Maximum number of messages to fetch per request
   * @default 50
   */
  limit?: number;
}

interface UsePeriodicMessageFetchReturn {
  /**
   * Latest messages from the conversation
   */
  messages: MessageWithSender[];
  
  /**
   * Whether a fetch operation is currently in progress
   */
  isFetching: boolean;
  
  /**
   * Any error that occurred during fetching
   */
  error: string | null;
  
  /**
   * Whether there are more messages to load
   */
  hasMore: boolean;
  
  /**
   * Total number of messages in the conversation
   */
  totalCount: number;
  
  /**
   * Manually trigger a fetch (useful for pull-to-refresh)
   */
  refetch: () => Promise<void>;
  
  /**
   * Indicate that user is typing (will pause automatic fetching)
   */
  setUserTyping: (isTyping: boolean) => void;
  
  /**
   * Clear any existing error
   */
  clearError: () => void;
  
  /**
   * Get the current fetch interval ID (for debugging)
   */
  getIntervalId: () => NodeJS.Timeout | null;
}

/**
 * Custom hook for periodic message fetching with smart pausing and error handling
 * 
 * Features:
 * - Automatic periodic fetching at configurable intervals
 * - Smart pausing during user typing activity
 * - Exponential backoff retry logic for failed requests
 * - Proper cleanup and memory management
 * - Optimistic updates support
 * 
 * @param matchId - The conversation/match ID to fetch messages for
 * @param options - Configuration options for the hook
 * @returns Object containing messages, loading state, and control functions
 */
export function usePeriodicMessageFetch(
  matchId: string,
  options: UsePeriodicMessageFetchOptions = {}
): UsePeriodicMessageFetchReturn {
  const {
    fetchInterval = 4000,
    pauseOnTyping = true,
    typingTimeout = 3000,
    retryConfig = {},
    enabled = true,
    limit = 50
  } = options;

  // State management
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isUserTyping, setIsUserTyping] = useState(false);

  // Refs for cleanup and state management
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const lastFetchTimeRef = useRef<number>(0);
  const retryConfigRef = useRef<RetryConfig>({
    ...DEFAULT_RETRY_CONFIG,
    ...retryConfig
  });

  // Track the latest message timestamp to avoid duplicates
  const latestMessageTimeRef = useRef<Date | null>(null);

  /**
   * Fetch messages with error handling and retry logic
   */
  const fetchMessages = useCallback(async (isManualRefetch = false): Promise<void> => {
    if (!matchId || (!enabled && !isManualRefetch)) {
      return;
    }

    // Don't fetch if user is actively typing (unless manual refetch)
    if (pauseOnTyping && isUserTyping && !isManualRefetch) {
      return;
    }

    // Prevent concurrent fetches
    if (isFetching && !isManualRefetch) {
      return;
    }

    try {
      setIsFetching(true);
      setError(null);

      const result = await retryWithBackoff(
        async () => {
          const response = await getMessages(matchId, limit);
          if (!response.success) {
            throw new Error(response.error || 'Failed to fetch messages');
          }
          return response.data!;
        },
        retryConfigRef.current
      );

      // Only update state if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      const { messages: newMessages, hasMore: moreAvailable, totalCount: total } = result;

      // Filter out messages we already have (based on timestamp)
      let messagesToAdd = newMessages;
      if (latestMessageTimeRef.current && !isManualRefetch) {
        messagesToAdd = newMessages.filter(
          msg => new Date(msg.createdAt) > latestMessageTimeRef.current!
        );
      }

      // Update latest message timestamp
      if (newMessages.length > 0) {
        const latestMessage = newMessages.reduce((latest, current) => 
          new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
        );
        latestMessageTimeRef.current = new Date(latestMessage.createdAt);
      }

      // Update state
      if (isManualRefetch) {
        // Full refresh - replace all messages
        setMessages(newMessages);
      } else if (messagesToAdd.length > 0) {
        // Append new messages, avoiding duplicates
        setMessages(prevMessages => {
          const existingIds = new Set(prevMessages.map(msg => msg.id));
          const uniqueNewMessages = messagesToAdd.filter(msg => !existingIds.has(msg.id));
          return [...prevMessages, ...uniqueNewMessages];
        });
      }

      setHasMore(moreAvailable);
      setTotalCount(total);
      lastFetchTimeRef.current = Date.now();

    } catch (fetchError) {
      console.error('Error fetching messages:', fetchError);
      
      if (isMountedRef.current) {
        const errorMessage = fetchError instanceof Error 
          ? fetchError.message 
          : 'Failed to fetch messages';
        setError(errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setIsFetching(false);
      }
    }
  }, [matchId, enabled, pauseOnTyping, isUserTyping, isFetching, limit]);

  /**
   * Set user typing status with automatic timeout
   */
  const setUserTyping = useCallback((typing: boolean) => {
    setIsUserTyping(typing);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Set timeout to automatically clear typing status
    if (typing) {
      typingTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setIsUserTyping(false);
        }
      }, typingTimeout);
    }
  }, [typingTimeout]);

  /**
   * Manual refetch function
   */
  const refetch = useCallback(async () => {
    await fetchMessages(true);
  }, [fetchMessages]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Get current interval ID for debugging
   */
  const getIntervalId = useCallback(() => {
    return intervalRef.current;
  }, []);

  // Set up periodic fetching
  useEffect(() => {
    if (!enabled || !matchId) {
      return;
    }

    // Initial fetch
    fetchMessages(true);

    // Set up interval for periodic fetching
    intervalRef.current = setInterval(() => {
      fetchMessages();
    }, fetchInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [matchId, enabled, fetchInterval, fetchMessages]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      
      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, []);

  // Update retry config when options change
  useEffect(() => {
    retryConfigRef.current = {
      ...DEFAULT_RETRY_CONFIG,
      ...retryConfig
    };
  }, [retryConfig]);

  return {
    messages,
    isFetching,
    error,
    hasMore,
    totalCount,
    refetch,
    setUserTyping,
    clearError,
    getIntervalId
  };
}