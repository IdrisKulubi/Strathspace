/**
 * Enhanced messaging hook with caching and offline support
 * Integrates localStorage persistence with server actions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './use-auth';
import { messageCache, type CachedMessage, type QueuedMessage } from '@/lib/messaging/cache';
import {
  sendMessage,
  getMessages,
  getConversations,
  type MessageWithSender,
  type ConversationPreview,
  type PaginatedMessages
} from '@/lib/actions/messaging.actions';
import { useToast } from './use-toast';

interface UseCachedMessagingOptions {
  matchId?: string;
  enabled?: boolean;
  pollingInterval?: number;
  retryInterval?: number;
  maxRetries?: number;
}

interface MessagingState {
  messages: CachedMessage[];
  conversations: ConversationPreview[];
  isLoading: boolean;
  isSending: boolean;
  isOnline: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
}

export function useCachedMessaging(options: UseCachedMessagingOptions = {}) {
  const {
    matchId,
    enabled = true,
    pollingInterval = 4000,
    retryInterval = 5000,
    maxRetries = 3
  } = options;

  const { user } = useAuth();
  const { toast } = useToast();
  
  const [state, setState] = useState<MessagingState>({
    messages: [],
    conversations: [],
    isLoading: false,
    isSending: false,
    isOnline: navigator.onLine,
    error: null,
    hasMore: false,
    totalCount: 0
  });

  const pollingRef = useRef<NodeJS.Timeout>();
  const retryRef = useRef<NodeJS.Timeout>();
  const lastFetchRef = useRef<number>(0);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      
      // Process queued messages when coming back online
      processMessageQueue();
      
      // Refresh data
      if (matchId) {
        fetchMessages(matchId, true);
      } else {
        fetchConversations(true);
      }
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [matchId]);

  // Load cached data on mount
  useEffect(() => {
    if (!enabled || !user) return;

    if (matchId) {
      // Load cached messages for specific conversation
      const cachedMessages = messageCache.getCachedMessages(matchId);
      setState(prev => ({ 
        ...prev, 
        messages: cachedMessages,
        totalCount: cachedMessages.length
      }));
    } else {
      // Load cached conversations
      const cachedConversations = messageCache.getCachedConversations();
      setState(prev => ({ ...prev, conversations: cachedConversations }));
    }
  }, [enabled, user, matchId]);

  // Fetch messages from server
  const fetchMessages = useCallback(async (
    conversationId: string, 
    force = false,
    before?: string
  ): Promise<PaginatedMessages | null> => {
    if (!user || (!force && Date.now() - lastFetchRef.current < 1000)) {
      return null;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      lastFetchRef.current = Date.now();

      const result = await getMessages(conversationId, 50, before);
      
      if (result.success && result.data) {
        const { messages, hasMore, totalCount } = result.data;
        
        // Cache the messages
        messageCache.cacheMessages(conversationId, messages);
        
        // Update state
        setState(prev => ({
          ...prev,
          messages: before 
            ? [...messages, ...prev.messages] // Prepend older messages
            : messages, // Replace with fresh messages
          hasMore,
          totalCount,
          isLoading: false
        }));

        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch messages');
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch messages'
      }));
      return null;
    }
  }, [user]);

  // Fetch conversations from server
  const fetchConversations = useCallback(async (force = false): Promise<ConversationPreview[] | null> => {
    if (!user || (!force && Date.now() - lastFetchRef.current < 1000)) {
      return null;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      lastFetchRef.current = Date.now();

      const result = await getConversations();
      
      if (result.success && result.data) {
        // Cache the conversations
        messageCache.cacheConversations(result.data);
        
        // Update state
        setState(prev => ({
          ...prev,
          conversations: result.data!,
          isLoading: false
        }));

        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch conversations');
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch conversations'
      }));
      return null;
    }
  }, [user]);

  // Send message with caching and offline support
  const sendMessageWithCache = useCallback(async (
    conversationId: string,
    content: string
  ): Promise<boolean> => {
    if (!user) return false;

    setState(prev => ({ ...prev, isSending: true }));

    try {
      // Create optimistic message
      const optimisticMessage = messageCache.addOptimisticMessage(conversationId, {
        content,
        matchId: conversationId,
        senderId: user.id,
        status: 'sending',
        sender: {
          id: user.id,
          name: user.name || 'You',
          image: user.image
        }
      });

      // Update UI immediately
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, optimisticMessage]
      }));

      if (state.isOnline) {
        // Try to send immediately if online
        const formData = new FormData();
        formData.append('matchId', conversationId);
        formData.append('content', content);

        const result = await sendMessage(formData);

        if (result.success && result.data) {
          // Replace optimistic message with real message
          messageCache.updateOptimisticMessage(
            conversationId,
            optimisticMessage.localId!,
            {
              ...result.data,
              status: 'sent'
            }
          );

          setState(prev => ({
            ...prev,
            messages: prev.messages.map(msg =>
              msg.localId === optimisticMessage.localId
                ? { ...result.data!, cachedAt: Date.now() }
                : msg
            ),
            isSending: false
          }));

          return true;
        } else {
          throw new Error(result.error || 'Failed to send message');
        }
      } else {
        // Queue message for later if offline
        messageCache.queueMessage(conversationId, content);
        
        // Update optimistic message status
        messageCache.updateOptimisticMessage(
          conversationId,
          optimisticMessage.localId!,
          { status: 'failed' }
        );

        setState(prev => ({
          ...prev,
          messages: prev.messages.map(msg =>
            msg.localId === optimisticMessage.localId
              ? { ...msg, status: 'failed' }
              : msg
          ),
          isSending: false
        }));

        toast({
          title: 'Message queued',
          description: 'Your message will be sent when you\'re back online.',
          variant: 'default'
        });

        return false;
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      setState(prev => ({ ...prev, isSending: false }));
      
      toast({
        title: 'Failed to send message',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive'
      });

      return false;
    }
  }, [user, state.isOnline, toast]);

  // Process queued messages
  const processMessageQueue = useCallback(async () => {
    if (!state.isOnline || !user) return;

    const queue = messageCache.getMessageQueue();
    
    for (const queuedMessage of queue) {
      try {
        // Check retry limits
        if (queuedMessage.retryCount >= maxRetries) {
          messageCache.removeFromQueue(queuedMessage.id);
          continue;
        }

        // Implement exponential backoff
        const backoffDelay = Math.pow(2, queuedMessage.retryCount) * 1000;
        const timeSinceLastRetry = Date.now() - (queuedMessage.lastRetryAt || 0);
        
        if (timeSinceLastRetry < backoffDelay) {
          continue;
        }

        // Update retry info
        messageCache.updateQueuedMessage(queuedMessage.id, {
          retryCount: queuedMessage.retryCount + 1,
          lastRetryAt: Date.now()
        });

        // Try to send the message
        const formData = new FormData();
        formData.append('matchId', queuedMessage.matchId);
        formData.append('content', queuedMessage.content);

        const result = await sendMessage(formData);

        if (result.success) {
          // Remove from queue on success
          messageCache.removeFromQueue(queuedMessage.id);
          
          // Update cached messages
          if (result.data) {
            const existingMessages = messageCache.getCachedMessages(queuedMessage.matchId);
            messageCache.cacheMessages(queuedMessage.matchId, [...existingMessages, result.data]);
          }

          toast({
            title: 'Message sent',
            description: 'Your queued message has been delivered.',
            variant: 'default'
          });
        }
      } catch (error) {
        console.error('Failed to process queued message:', error);
      }
    }
  }, [state.isOnline, user, maxRetries, toast]);

  // Retry failed message
  const retryMessage = useCallback(async (localId: string) => {
    if (!matchId || !user) return;

    const messages = state.messages;
    const failedMessage = messages.find(msg => msg.localId === localId);
    
    if (!failedMessage) return;

    return sendMessageWithCache(matchId, failedMessage.content);
  }, [matchId, user, state.messages, sendMessageWithCache]);

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!matchId || !state.hasMore || state.isLoading) return;

    const oldestMessage = state.messages[0];
    if (oldestMessage) {
      await fetchMessages(matchId, false, oldestMessage.createdAt.toISOString());
    }
  }, [matchId, state.hasMore, state.isLoading, state.messages, fetchMessages]);

  // Refresh data
  const refresh = useCallback(async () => {
    if (matchId) {
      await fetchMessages(matchId, true);
    } else {
      await fetchConversations(true);
    }
  }, [matchId, fetchMessages, fetchConversations]);

  // Set up polling
  useEffect(() => {
    if (!enabled || !state.isOnline) return;

    const poll = async () => {
      if (matchId) {
        await fetchMessages(matchId);
      } else {
        await fetchConversations();
      }
    };

    pollingRef.current = setInterval(poll, pollingInterval);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [enabled, state.isOnline, matchId, pollingInterval, fetchMessages, fetchConversations]);

  // Set up retry processing
  useEffect(() => {
    if (!state.isOnline) return;

    retryRef.current = setInterval(processMessageQueue, retryInterval);

    return () => {
      if (retryRef.current) {
        clearInterval(retryRef.current);
      }
    };
  }, [state.isOnline, retryInterval, processMessageQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (retryRef.current) clearInterval(retryRef.current);
    };
  }, []);

  return {
    // State
    messages: state.messages,
    conversations: state.conversations,
    isLoading: state.isLoading,
    isSending: state.isSending,
    isOnline: state.isOnline,
    error: state.error,
    hasMore: state.hasMore,
    totalCount: state.totalCount,

    // Actions
    sendMessage: sendMessageWithCache,
    retryMessage,
    loadMoreMessages,
    refresh,

    // Cache utilities
    getCacheStats: () => messageCache.getCacheStats(),
    clearCache: () => messageCache.clearCache(),
  };
}