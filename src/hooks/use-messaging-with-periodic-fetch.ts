import { useCallback, useEffect, useRef, useState } from 'react';
import { usePeriodicMessageFetch } from './use-periodic-message-fetch';
import { sendMessageAction, markConversationAsRead } from '@/lib/messaging';
import { retryWithBackoff, DEFAULT_RETRY_CONFIG } from '@/lib/messaging';
import type { MessageWithSender, RetryConfig } from '@/lib/messaging';
import { useSession } from 'next-auth/react';
import { toast } from './use-toast';

interface OptimisticMessage extends MessageWithSender {
  isOptimistic: boolean;
  localId: string;
}

interface UseMessagingWithPeriodicFetchOptions {
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

  /**
   * Whether to automatically mark messages as read when viewing
   * @default true
   */
  autoMarkAsRead?: boolean;

  /**
   * Whether to show optimistic updates for sent messages
   * @default true
   */
  enableOptimisticUpdates?: boolean;
}

interface UseMessagingWithPeriodicFetchReturn {
  /**
   * All messages including optimistic ones
   */
  messages: MessageWithSender[];
  
  /**
   * Whether a fetch operation is currently in progress
   */
  isFetching: boolean;
  
  /**
   * Whether a message is currently being sent
   */
  isSending: boolean;
  
  /**
   * Any error that occurred during fetching or sending
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
   * Send a new message
   */
  sendMessage: (content: string) => Promise<void>;
  
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
   * Mark conversation as read
   */
  markAsRead: () => Promise<void>;
  
  /**
   * Retry a failed message
   */
  retryMessage: (messageId: string) => Promise<void>;
  
  /**
   * Get the current fetch interval ID (for debugging)
   */
  getIntervalId: () => NodeJS.Timeout | null;
}

/**
 * Enhanced messaging hook that combines periodic fetching with message sending
 * and optimistic updates for a complete messaging experience
 * 
 * @param matchId - The conversation/match ID
 * @param options - Configuration options
 * @returns Complete messaging interface
 */
export function useMessagingWithPeriodicFetch(
  matchId: string,
  options: UseMessagingWithPeriodicFetchOptions = {}
): UseMessagingWithPeriodicFetchReturn {
  const {
    autoMarkAsRead = true,
    enableOptimisticUpdates = true,
    retryConfig = {},
    ...fetchOptions
  } = options;

  const { data: session } = useSession();
  const [isSending, setIsSending] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const [failedMessages, setFailedMessages] = useState<Map<string, string>>(new Map());
  
  // Refs for managing state
  const retryConfigRef = useRef<RetryConfig>({
    ...DEFAULT_RETRY_CONFIG,
    ...retryConfig
  });
  const hasMarkedAsReadRef = useRef(false);

  // Use the periodic fetch hook
  const {
    messages: fetchedMessages,
    isFetching,
    error: fetchError,
    hasMore,
    totalCount,
    refetch,
    setUserTyping,
    clearError: clearFetchError,
    getIntervalId
  } = usePeriodicMessageFetch(matchId, fetchOptions);

  // Combine fetched messages with optimistic messages
  const allMessages = [...fetchedMessages, ...optimisticMessages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Remove optimistic messages that have been confirmed by server
  useEffect(() => {
    if (fetchedMessages.length > 0) {
      setOptimisticMessages(prev => {
        const fetchedIds = new Set(fetchedMessages.map(msg => msg.id));
        return prev.filter(msg => !fetchedIds.has(msg.id));
      });
    }
  }, [fetchedMessages]);

  // Auto-mark as read when messages are loaded
  useEffect(() => {
    if (autoMarkAsRead && fetchedMessages.length > 0 && !hasMarkedAsReadRef.current) {
      hasMarkedAsReadRef.current = true;
      markConversationAsRead(matchId).catch(error => {
        console.error('Failed to mark conversation as read:', error);
      });
    }
  }, [fetchedMessages.length, autoMarkAsRead, matchId]);

  /**
   * Send a new message with optimistic updates
   */
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!content.trim() || !session?.user?.id) {
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create optimistic message
    const optimisticMessage: OptimisticMessage = {
      id: tempId,
      localId: tempId,
      content: content.trim(),
      matchId,
      senderId: session.user.id,
      status: 'sending',
      createdAt: new Date(),
      updatedAt: new Date(),
      isOptimistic: true,
      sender: {
        id: session.user.id,
        name: session.user.name || 'You',
        image: session.user.image || null
      }
    };

    try {
      setIsSending(true);
      
      // Add optimistic message if enabled
      if (enableOptimisticUpdates) {
        setOptimisticMessages(prev => [...prev, optimisticMessage]);
      }

      // Send message with retry logic
      const result = await retryWithBackoff(
        async () => {
          const response = await sendMessageAction(matchId, content);
          if (!response.success) {
            throw new Error(response.error || 'Failed to send message');
          }
          return response.data!;
        },
        retryConfigRef.current
      );

      // Update optimistic message with server response
      if (enableOptimisticUpdates) {
        setOptimisticMessages(prev => 
          prev.map(msg => 
            msg.localId === tempId 
              ? { ...result, isOptimistic: false, localId: tempId }
              : msg
          )
        );
      }

      // Clear any previous error
      clearFetchError();

      // Trigger a refetch to get the latest messages
      setTimeout(() => refetch(), 500);

    } catch (error) {
      console.error('Failed to send message:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      
      if (enableOptimisticUpdates) {
        // Mark optimistic message as failed
        setOptimisticMessages(prev => 
          prev.map(msg => 
            msg.localId === tempId 
              ? { ...msg, status: 'failed' as const }
              : msg
          )
        );
        
        // Track failed message for retry
        setFailedMessages(prev => new Map(prev).set(tempId, content));
      }

      toast({
        title: "Failed to send message",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  }, [matchId, session?.user, enableOptimisticUpdates, refetch, clearFetchError]);

  /**
   * Retry a failed message
   */
  const retryMessage = useCallback(async (messageId: string): Promise<void> => {
    const originalContent = failedMessages.get(messageId);
    if (!originalContent) {
      return;
    }

    // Remove from failed messages
    setFailedMessages(prev => {
      const newMap = new Map(prev);
      newMap.delete(messageId);
      return newMap;
    });

    // Remove the failed optimistic message
    setOptimisticMessages(prev => prev.filter(msg => msg.localId !== messageId));

    // Resend the message
    await sendMessage(originalContent);
  }, [failedMessages, sendMessage]);

  /**
   * Mark conversation as read
   */
  const markAsRead = useCallback(async (): Promise<void> => {
    try {
      await markConversationAsRead(matchId);
      hasMarkedAsReadRef.current = true;
    } catch (error) {
      console.error('Failed to mark conversation as read:', error);
      toast({
        title: "Failed to mark as read",
        description: "Please try again",
        variant: "destructive"
      });
    }
  }, [matchId]);

  /**
   * Clear all errors
   */
  const clearError = useCallback(() => {
    clearFetchError();
    setFailedMessages(new Map());
  }, [clearFetchError]);

  // Update retry config when options change
  useEffect(() => {
    retryConfigRef.current = {
      ...DEFAULT_RETRY_CONFIG,
      ...retryConfig
    };
  }, [retryConfig]);

  // Reset read status when match changes
  useEffect(() => {
    hasMarkedAsReadRef.current = false;
  }, [matchId]);

  return {
    messages: allMessages,
    isFetching,
    isSending,
    error: fetchError,
    hasMore,
    totalCount,
    sendMessage,
    refetch,
    setUserTyping,
    clearError,
    markAsRead,
    retryMessage,
    getIntervalId
  };
}