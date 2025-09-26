/**
 * Simple messaging hook without complex caching
 * For debugging the message sending issue
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

type MessageWithSender = {
  id: string;
  content: string;
  matchId: string;
  senderId: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: Date | string;
  updatedAt: Date | string;
  sender?: { id: string; name: string; image?: string | null };
  localId?: string;
  isRetrying?: boolean;
};

interface UseSimpleMessagingOptions {
  matchId: string;
  enabled?: boolean;
  pollingInterval?: number;
}

// In-memory cache across hook instances for snappy loads
const messageCache = new Map<string, MessageWithSender[]>();

export function useSimpleMessaging(options: UseSimpleMessagingOptions) {
  const { matchId, enabled = true, pollingInterval = 2500 } = options;
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from cache immediately for fast UI
  useEffect(() => {
    if (!matchId) return;
    const mem = messageCache.get(matchId);
    if (mem && mem.length) {
      setMessages(mem);
    } else {
      // Try sessionStorage cache
      try {
        const raw = sessionStorage.getItem(`msgs::${matchId}`);
        if (raw) {
          const parsed = JSON.parse(raw) as MessageWithSender[];
          if (Array.isArray(parsed)) setMessages(parsed);
        }
      } catch {}
    }
  }, [matchId]);

  // Fetch messages (non-blocking when we already have some)
  const fetchMessages = useCallback(async () => {
    if (!user || !enabled || !matchId) return;

    try {
      // Only show initial loading state if we have nothing to render yet
      setIsLoading(prev => (messages.length === 0 ? true : prev));
      setError(null);
      
      const res = await fetch(`/api/messages/list?matchId=${encodeURIComponent(matchId)}&limit=30`, { cache: 'no-store' });
      const result = await res.json();
      if (result.success && result.data) {
        const next = result.data.messages as MessageWithSender[];
        const prevLast = messages[messages.length - 1]?.id;
        const nextLast = next[next.length - 1]?.id;
        if (messages.length !== next.length || prevLast !== nextLast) {
          setMessages(next);
          messageCache.set(matchId, next);
          try { sessionStorage.setItem(`msgs::${matchId}`, JSON.stringify(next)); } catch {}
        }
      } else {
        throw new Error(result.error || 'Failed to fetch messages');
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch messages');
    } finally {
      setIsLoading(false);
    }
  }, [matchId, user, enabled, messages]);

  // Send message - simplified and robust
  const sendMessageSimple = useCallback(async (content: string): Promise<boolean> => {
    console.log('🚀 sendMessageSimple called with:', { content: content?.substring(0, 50), hasUser: !!user, matchId });
    
    if (!user?.id) {
      console.error('❌ No user ID');
      return false;
    }
    
    if (!content?.trim()) {
      console.error('❌ No content');
      return false;
    }

    if (!matchId) {
      console.error('❌ No match ID');
      return false;
    }

    let optimisticMessage: MessageWithSender | null = null;

    try {
      setIsSending(true);
      setError(null);
      
      console.log('✅ Starting message send process...');

      // Create optimistic message
      optimisticMessage = {
        id: `temp_${Date.now()}_${Math.random()}`,
        content: content.trim(),
        matchId,
        senderId: user.id,
        status: 'sending',
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: {
          id: user.id,
          name: user.name || 'You',
          image: user.image || null
        }
      };

      console.log('✅ Created optimistic message:', optimisticMessage.id);

      // Add optimistic message to UI immediately
      setMessages(prev => {
        console.log('✅ Adding optimistic message to UI, current count:', prev.length);
        const updated = [...prev, optimisticMessage!];
        messageCache.set(matchId, updated);
        try { sessionStorage.setItem(`msgs::${matchId}`, JSON.stringify(updated)); } catch {}
        return updated;
      });

      console.log('✅ Sending via API route...');
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, content: content.trim() }),
      });
      const result = await res.json();

      console.log('📡 API result:', { success: result.success, hasData: !!result.data, error: result.error });

      if (result.success && result.data) {
        console.log('✅ Message sent successfully, updating UI...');
        
        // Replace optimistic message with real message
        setMessages(prev => {
          const updated = prev.map(msg => 
            msg.id === optimisticMessage!.id 
              ? { ...result.data!, status: 'sent' as const }
              : msg
          );
          messageCache.set(matchId, updated);
          try { sessionStorage.setItem(`msgs::${matchId}`, JSON.stringify(updated)); } catch {}
          return updated;
        });
        
        return true;
      } else {
        throw new Error(result.error || 'Server returned error');
      }
      
    } catch (error) {
      console.error('❌ Error in sendMessageSimple:', error);
      
      // Update optimistic message to failed status
      if (optimisticMessage) {
        setMessages(prev => {
          const updated = prev.map(msg => 
            msg.id === optimisticMessage!.id 
              ? { ...msg, status: 'failed' as const }
              : msg
          );
          messageCache.set(matchId, updated);
          try { sessionStorage.setItem(`msgs::${matchId}`, JSON.stringify(updated)); } catch {}
          return updated;
        });
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      
      toast({
        title: 'Failed to send message',
        description: errorMessage,
        variant: 'destructive'
      });

      return false;
      
    } finally {
      console.log('🏁 Finishing send process, setting isSending to false');
      setIsSending(false);
    }
  }, [user, matchId, toast]);

  // Retry failed message
  const retryMessage = useCallback(async (messageId: string) => {
    const failedMessage = messages.find(msg => msg.id === messageId && msg.status === 'failed');
    if (failedMessage) {
      // Remove the failed message and resend
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      await sendMessageSimple(failedMessage.content);
    }
  }, [messages, sendMessageSimple]);

  // Initial load
  useEffect(() => {
    if (matchId && enabled) {
      fetchMessages();
    }
  }, [matchId, enabled, fetchMessages]);

  // Polling for new messages
  useEffect(() => {
    if (!enabled || !user) return;

    const interval = setInterval(fetchMessages, pollingInterval);
    return () => clearInterval(interval);
  }, [enabled, user, pollingInterval, fetchMessages]);

  return {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage: sendMessageSimple,
    retryMessage,
    refresh: fetchMessages
  };
}