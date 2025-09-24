import { useCallback, useEffect, useRef, useState } from 'react';
import { getMessages } from '@/lib/actions/messaging.actions';
import type { MessageWithSender, PaginatedMessages } from '@/lib/actions/messaging.actions';
import { useInfiniteScroll } from './use-infinite-scroll';

interface UseMessagePaginationOptions {
  /**
   * The match/conversation ID
   */
  matchId: string;
  
  /**
   * Number of messages to fetch per page
   * @default 50
   */
  pageSize?: number;
  
  /**
   * Whether to enable automatic fetching
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Distance from top to trigger load more
   * @default 100
   */
  loadMoreThreshold?: number;
  
  /**
   * Whether to maintain scroll position when loading older messages
   * @default true
   */
  maintainScrollPosition?: boolean;
  
  /**
   * Callback when new messages are loaded
   */
  onMessagesLoaded?: (messages: MessageWithSender[], isLoadingMore: boolean) => void;
  
  /**
   * Callback when an error occurs
   */
  onError?: (error: string) => void;
}

interface UseMessagePaginationReturn {
  /**
   * All messages in chronological order (oldest first)
   */
  messages: MessageWithSender[];
  
  /**
   * Whether initial loading is in progress
   */
  isLoading: boolean;
  
  /**
   * Whether loading more messages is in progress
   */
  isLoadingMore: boolean;
  
  /**
   * Whether there are more messages to load
   */
  hasMore: boolean;
  
  /**
   * Current error state
   */
  error: string | null;
  
  /**
   * Total number of messages in the conversation
   */
  totalCount: number;
  
  /**
   * Manually load more messages
   */
  loadMore: () => Promise<void>;
  
  /**
   * Refresh all messages (reset pagination)
   */
  refresh: () => Promise<void>;
  
  /**
   * Add a new message optimistically
   */
  addOptimisticMessage: (message: MessageWithSender) => void;
  
  /**
   * Update an existing message
   */
  updateMessage: (messageId: string, updates: Partial<MessageWithSender>) => void;
  
  /**
   * Remove a message
   */
  removeMessage: (messageId: string) => void;
  
  /**
   * Infinite scroll utilities
   */
  infiniteScroll: {
    scrollRef: React.RefObject<HTMLDivElement>;
    loadMoreRef: React.RefObject<HTMLDivElement>;
    isInfiniteScrollActive: boolean;
    scrollToBottom: (behavior?: ScrollBehavior) => void;
    scrollToTop: (behavior?: ScrollBehavior) => void;
    getScrollInfo: () => {
      scrollTop: number;
      scrollHeight: number;
      clientHeight: number;
      isAtBottom: boolean;
      isAtTop: boolean;
      distanceFromBottom: number;
      distanceFromTop: number;
    };
  };
}

/**
 * Custom hook for managing message pagination with infinite scroll
 * Handles loading older messages, maintaining scroll position, and optimistic updates
 */
export function useMessagePagination({
  matchId,
  pageSize = 50,
  enabled = true,
  loadMoreThreshold = 100,
  maintainScrollPosition = true,
  onMessagesLoaded,
  onError
}: UseMessagePaginationOptions): UseMessagePaginationReturn {
  // State management
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  
  // Refs for scroll position management
  const previousScrollHeightRef = useRef<number>(0);
  const shouldMaintainPositionRef = useRef(false);

  /**
   * Load messages with pagination
   */
  const fetchMessages = useCallback(async (cursor?: string, isLoadingMoreMessages = false): Promise<void> => {
    try {
      if (!isLoadingMoreMessages) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      const result = await getMessages(matchId, pageSize, cursor);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch messages');
      }

      const data = result.data as PaginatedMessages;
      const { messages: newMessages, hasMore: moreAvailable, nextCursor: newCursor, totalCount: total } = data;

      // Store previous scroll height for position maintenance
      if (isLoadingMoreMessages && maintainScrollPosition) {
        shouldMaintainPositionRef.current = true;
        if (infiniteScrollHook.scrollRef.current) {
          previousScrollHeightRef.current = infiniteScrollHook.scrollRef.current.scrollHeight;
        }
      }

      if (isLoadingMoreMessages) {
        // Prepend older messages (they come in reverse chronological order)
        setMessages(prev => [...newMessages.reverse(), ...prev]);
      } else {
        // Replace with new messages (reverse to get chronological order)
        setMessages(newMessages.reverse());
      }

      setHasMore(moreAvailable);
      setNextCursor(newCursor);
      setTotalCount(total);

      // Call callback if provided
      if (onMessagesLoaded) {
        onMessagesLoaded(newMessages, isLoadingMoreMessages);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
      
      console.error('Error fetching messages:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [matchId, pageSize, maintainScrollPosition, onMessagesLoaded, onError]);

  /**
   * Load more (older) messages
   */
  const loadMore = useCallback(async (): Promise<void> => {
    if (!hasMore || isLoadingMore || !nextCursor) {
      return;
    }
    
    await fetchMessages(nextCursor, true);
  }, [fetchMessages, hasMore, isLoadingMore, nextCursor]);

  /**
   * Refresh messages (reset pagination)
   */
  const refresh = useCallback(async (): Promise<void> => {
    setNextCursor(undefined);
    await fetchMessages();
  }, [fetchMessages]);

  /**
   * Add optimistic message
   */
  const addOptimisticMessage = useCallback((message: MessageWithSender) => {
    setMessages(prev => [...prev, message]);
  }, []);

  /**
   * Update existing message
   */
  const updateMessage = useCallback((messageId: string, updates: Partial<MessageWithSender>) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, ...updates }
          : msg
      )
    );
  }, []);

  /**
   * Remove message
   */
  const removeMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  // Set up infinite scroll
  const infiniteScrollHook = useInfiniteScroll({
    loadMore,
    hasMore,
    isLoading: isLoadingMore,
    threshold: loadMoreThreshold,
    enabled: enabled && !isLoading
  });

  // Maintain scroll position after loading older messages
  useEffect(() => {
    if (shouldMaintainPositionRef.current && infiniteScrollHook.scrollRef.current) {
      const scrollElement = infiniteScrollHook.scrollRef.current;
      const currentScrollHeight = scrollElement.scrollHeight;
      const heightDifference = currentScrollHeight - previousScrollHeightRef.current;
      
      if (heightDifference > 0) {
        // Adjust scroll position to maintain visual position
        scrollElement.scrollTop += heightDifference;
      }
      
      shouldMaintainPositionRef.current = false;
    }
  }, [messages.length]);

  // Initial load when matchId changes
  useEffect(() => {
    if (matchId && enabled) {
      setMessages([]);
      setNextCursor(undefined);
      fetchMessages();
    }
  }, [matchId, enabled, fetchMessages]);

  // Auto-scroll to bottom for new messages (not when loading more)
  useEffect(() => {
    if (!isLoading && !isLoadingMore && messages.length > 0) {
      const scrollInfo = infiniteScrollHook.getScrollInfo();
      
      // Only auto-scroll if user is near the bottom (within 200px)
      if (scrollInfo.distanceFromBottom < 200) {
        setTimeout(() => {
          infiniteScrollHook.scrollToBottom('smooth');
        }, 100);
      }
    }
  }, [messages.length, isLoading, isLoadingMore, infiniteScrollHook]);

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    totalCount,
    loadMore,
    refresh,
    addOptimisticMessage,
    updateMessage,
    removeMessage,
    infiniteScroll: {
      scrollRef: infiniteScrollHook.scrollRef,
      loadMoreRef: infiniteScrollHook.loadMoreRef,
      isInfiniteScrollActive: infiniteScrollHook.isInfiniteScrollActive,
      scrollToBottom: infiniteScrollHook.scrollToBottom,
      scrollToTop: infiniteScrollHook.scrollToTop,
      getScrollInfo: infiniteScrollHook.getScrollInfo
    }
  };
}