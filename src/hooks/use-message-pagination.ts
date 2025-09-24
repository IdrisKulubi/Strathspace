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
  const scrollRef = useRef<HTMLDivElement>(null);

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
      if (isLoadingMoreMessages && maintainScrollPosition && scrollRef.current) {
        shouldMaintainPositionRef.current = true;
        previousScrollHeightRef.current = scrollRef.current.scrollHeight;
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
    if (shouldMaintainPositionRef.current && scrollRef.current) {
      const scrollElement = scrollRef.current;
      const currentScrollHeight = scrollElement.scrollHeight;
      const heightDifference = currentScrollHeight - previousScrollHeightRef.current;
      
      if (heightDifference > 0) {
        // Adjust scroll position to maintain visual position
        scrollElement.scrollTop += heightDifference;
      }
      
      shouldMaintainPositionRef.current = false;
    }
  }, [messages.length]);

  // Initial load when matchId changes - use a ref to avoid dependency loop
  const currentMatchIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (matchId && enabled && currentMatchIdRef.current !== matchId) {
      currentMatchIdRef.current = matchId;
      setMessages([]);
      setNextCursor(undefined);
      fetchMessages().catch(console.error);
    }
  }, [matchId, enabled]);

  // Auto-scroll to bottom for new messages (not when loading more)
  const previousMessageCountRef = useRef(0);
  useEffect(() => {
    if (!isLoading && !isLoadingMore && messages.length > 0 && scrollRef.current) {
      const scrollElement = scrollRef.current;
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // Only auto-scroll if user is near the bottom (within 200px) and we have new messages
      if (distanceFromBottom < 200 && messages.length > previousMessageCountRef.current) {
        setTimeout(() => {
          scrollElement.scrollTo({
            top: scrollElement.scrollHeight,
            behavior: 'smooth'
          });
        }, 100);
      }
      
      previousMessageCountRef.current = messages.length;
    }
  }, [messages.length, isLoading, isLoadingMore]);

  // Create scroll utilities that use our scroll ref
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior
      });
    }
  }, []);

  const scrollToTop = useCallback((behavior: ScrollBehavior = 'smooth') => {
    scrollRef.current?.scrollTo({
      top: 0,
      behavior
    });
  }, []);

  const getScrollInfo = useCallback(() => {
    const element = scrollRef.current;
    if (!element) {
      return {
        scrollTop: 0,
        scrollHeight: 0,
        clientHeight: 0,
        isAtBottom: false,
        isAtTop: true,
        distanceFromBottom: 0,
        distanceFromTop: 0
      };
    }

    const { scrollTop, scrollHeight, clientHeight } = element;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const distanceFromTop = scrollTop;
    const isAtBottom = distanceFromBottom <= loadMoreThreshold;
    const isAtTop = scrollTop <= loadMoreThreshold;

    return {
      scrollTop,
      scrollHeight,
      clientHeight,
      isAtBottom,
      isAtTop,
      distanceFromBottom,
      distanceFromTop
    };
  }, [loadMoreThreshold]);

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
      scrollRef,
      loadMoreRef: infiniteScrollHook.loadMoreRef,
      isInfiniteScrollActive: infiniteScrollHook.isInfiniteScrollActive,
      scrollToBottom,
      scrollToTop,
      getScrollInfo
    }
  };
}