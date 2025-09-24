"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageList } from "./message-list";
import { getMessages } from "@/lib/actions/messaging.actions";
import { useAuth } from "@/hooks/use-auth";
import type { MessageWithSender } from "@/lib/actions/messaging.actions";
import { cn } from "@/lib/utils";

interface MessageListContainerProps {
  matchId: string;
  className?: string;
}

/**
 * Container component that manages message fetching and state for a specific conversation
 */
export function MessageListContainer({ matchId, className }: MessageListContainerProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch messages for the conversation
   */
  const fetchMessages = useCallback(async (cursor?: string, append = false) => {
    try {
      if (!append) {
        setIsLoading(true);
      }
      setError(null);

      const result = await getMessages(matchId, 50, cursor);

      if (result.success && result.data) {
        const { messages: newMessages, hasMore: moreAvailable, nextCursor: newCursor } = result.data;
        
        if (append) {
          // Prepend older messages
          setMessages(prev => [...newMessages, ...prev]);
        } else {
          // Replace with new messages
          setMessages(newMessages);
        }
        
        setHasMore(moreAvailable);
        setNextCursor(newCursor);
      } else {
        setError(result.error || "Failed to load messages");
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError("Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, [matchId]);

  /**
   * Load more (older) messages
   */
  const handleLoadMore = useCallback(async () => {
    if (!hasMore || !nextCursor) return;
    await fetchMessages(nextCursor, true);
  }, [fetchMessages, hasMore, nextCursor]);

  /**
   * Retry failed message
   */
  const handleRetry = useCallback(async (message: MessageWithSender) => {
    // TODO: Implement retry logic
    console.log("Retrying message:", message.id);
  }, []);

  /**
   * Add new message optimistically
   */
  const addOptimisticMessage = useCallback((message: MessageWithSender) => {
    setMessages(prev => [...prev, message]);
  }, []);

  /**
   * Update message status
   */
  const updateMessageStatus = useCallback((messageId: string, status: MessageWithSender['status']) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, status, isRetrying: false }
          : msg
      )
    );
  }, []);

  // Initial load and periodic refresh
  useEffect(() => {
    fetchMessages();
    
    // Set up periodic refresh every 4 seconds
    const interval = setInterval(() => {
      fetchMessages();
    }, 4000);

    return () => clearInterval(interval);
  }, [fetchMessages]);

  if (error && messages.length === 0) {
    return (
      <div className={cn("flex-1 flex items-center justify-center p-8", className)}>
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">Failed to load messages</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <MessageList
      messages={messages}
      currentUserId={user?.id || ""}
      isLoading={isLoading}
      onLoadMore={handleLoadMore}
      hasMore={hasMore}
      onRetry={handleRetry}
      className={className}
    />
  );
}