/**
 * Simple messaging hook without complex caching
 * For debugging the message sending issue
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
import {
  getMessages,
  type MessageWithSender,
  type PaginatedMessages
} from '@/lib/actions/messaging.actions';
import { simpleSendMessage } from '@/lib/actions/simple-send-message';
import { useToast } from './use-toast';

interface UseSimpleMessagingOptions {
  matchId: string;
  enabled?: boolean;
  pollingInterval?: number;
}

export function useSimpleMessaging(options: UseSimpleMessagingOptions) {
  const { matchId, enabled = true, pollingInterval = 4000 } = options;
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!user || !enabled) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await getMessages(matchId, 50);
      
      if (result.success && result.data) {
        setMessages(result.data.messages);
      } else {
        throw new Error(result.error || 'Failed to fetch messages');
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch messages');
    } finally {
      setIsLoading(false);
    }
  }, [matchId, user, enabled]);

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
        return [...prev, optimisticMessage!];
      });

      // Prepare form data
      const formData = new FormData();
      formData.append('matchId', matchId);
      formData.append('content', content.trim());

      console.log('✅ Calling server action with formData...');
      
      // Call server action
      const result = await simpleSendMessage(formData);
      
      console.log('📡 Server action result:', {
        success: result.success,
        hasData: !!result.data,
        error: result.error
      });

      if (result.success && result.data) {
        console.log('✅ Message sent successfully, updating UI...');
        
        // Replace optimistic message with real message
        setMessages(prev => 
          prev.map(msg => 
            msg.id === optimisticMessage!.id 
              ? { ...result.data!, status: 'sent' as const }
              : msg
          )
        );
        
        return true;
      } else {
        throw new Error(result.error || 'Server returned error');
      }
      
    } catch (error) {
      console.error('❌ Error in sendMessageSimple:', error);
      
      // Update optimistic message to failed status
      if (optimisticMessage) {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === optimisticMessage!.id 
              ? { ...msg, status: 'failed' as const }
              : msg
          )
        );
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