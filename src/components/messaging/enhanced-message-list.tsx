"use client";

import { useEffect, useRef, useState } from "react";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./message-bubble";
import { ErrorRecovery, CompactErrorRecovery } from "./error-recovery";
import { useErrorRecovery } from "@/hooks/use-error-recovery";
import { useOfflineQueue } from "@/lib/utils/offline-queue";
import type { MessageListProps } from "@/lib/messaging/types";
import type { MessageWithSender } from "@/lib/actions/messaging.actions";

interface EnhancedMessageListProps extends MessageListProps {
  matchId: string;
  onLoadMore?: () => Promise<void>;
  onRefresh?: () => Promise<void>;
}

/**
 * Enhanced MessageList with comprehensive error handling, retry mechanisms,
 * and offline queue integration
 */
export function EnhancedMessageList({
  matchId,
  messages,
  currentUserId,
  isLoading = false,
  onLoadMore,
  onRefresh,
  onRetry,
  hasMore = false,
  className,
}: EnhancedMessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Error recovery for load more and refresh operations
  const { state: errorState, actions: errorActions } = useErrorRecovery({
    showToasts: true,
    onRecovery: (attempts) => {
      console.log(`Message loading recovered after ${attempts} attempts`);
    }
  });

  // Offline queue integration
  const offlineQueue = useOfflineQueue();
  const queuedMessages = offlineQueue.getQueuedMessagesForMatch(matchId);

  // Combine server messages with queued messages for display
  const allMessages = [
    ...messages,
    ...queuedMessages.map(queuedMsg => ({
      id: queuedMsg.id,
      content: queuedMsg.content,
      matchId: queuedMsg.matchId,
      senderId: currentUserId,
      status: queuedMsg.error ? 'failed' as const : 'sending' as const,
      createdAt: queuedMsg.timestamp,
      updatedAt: queuedMsg.timestamp,
      sender: {
        id: currentUserId,
        name: 'You',
        image: null
      },
      isQueued: true,
      queueError: queuedMsg.error
    } as MessageWithSender & { isQueued?: boolean; queueError?: string }))
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (isNearBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [allMessages.length, isNearBottom]);

  // Handle scroll events
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    const nearBottom = distanceFromBottom < 100;
    setIsNearBottom(nearBottom);
    setShowScrollToBottom(!nearBottom && allMessages.length > 0);
  };

  // Enhanced load more with error handling and scroll position maintenance
  const handleLoadMore = async () => {
    if (!onLoadMore || isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      // Store current scroll position for maintaining position after load
      const scrollElement = scrollAreaRef.current;
      const previousScrollHeight = scrollElement?.scrollHeight || 0;
      
      await errorActions.executeWithRetry(
        async () => {
          await onLoadMore();
        },
        'Load more messages'
      );
      
      // Maintain scroll position after loading older messages
      setTimeout(() => {
        if (scrollElement && previousScrollHeight > 0) {
          const newScrollHeight = scrollElement.scrollHeight;
          const heightDifference = newScrollHeight - previousScrollHeight;
          if (heightDifference > 0) {
            scrollElement.scrollTop += heightDifference;
          }
        }
      }, 50); // Small delay to ensure DOM updates
      
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Enhanced refresh with error handling
  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await errorActions.executeWithRetry(
        async () => {
          await onRefresh();
        },
        'Refresh messages'
      );
    } catch (error) {
      console.error('Failed to refresh messages:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Enhanced retry function that includes queued message retry
  const handleRetry = async (messageId?: string) => {
    if (messageId) {
      // Check if it's a queued message
      const queuedMessage = queuedMessages.find(msg => msg.id === messageId);
      if (queuedMessage) {
        try {
          await offlineQueue.syncAll();
        } catch (error) {
          console.error('Failed to retry queued message:', error);
        }
        return;
      }
    }

    // Default retry behavior
    if (onRetry) {
      try {
        await errorActions.executeWithRetry(
          async () => {
            await onRetry(messageId);
          },
          `Retry message ${messageId || 'operation'}`
        );
      } catch (error) {
        console.error('Retry failed:', error);
      }
    }
  };

  // Format date separators
  const formatDateSeparator = (date: Date) => {
    if (isToday(date)) {
      return "Today";
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else {
      return format(date, "EEEE, MMMM d, yyyy");
    }
  };

  // Group messages by date for date separators
  const groupedMessages = allMessages.reduce((groups, message, index) => {
    const messageDate = new Date(message.createdAt);
    const prevMessage = index > 0 ? allMessages[index - 1] : null;
    const prevMessageDate = prevMessage ? new Date(prevMessage.createdAt) : null;
    
    // Add date separator if this is the first message or date changed
    if (!prevMessageDate || !isSameDay(messageDate, prevMessageDate)) {
      groups.push({
        type: "date-separator",
        date: messageDate,
        id: `date-${messageDate.toISOString()}`,
      });
    }
    
    groups.push({
      type: "message",
      message,
      id: message.id,
    });
    
    return groups;
  }, [] as Array<{ type: "date-separator" | "message"; date?: Date; message?: any; id: string }>);

  // Empty state
  if (allMessages.length === 0 && !isLoading && !errorState.error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">No messages yet</p>
          <p className="text-sm text-muted-foreground">
            Start the conversation by sending a message!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex-1 relative flex flex-col", className)}>
      {/* Error recovery at the top */}
      {errorState.error && (
        <div className="p-4 border-b">
          <CompactErrorRecovery
            onRetry={errorActions.retry}
            error={errorActions.getErrorMessage()}
          />
        </div>
      )}

      {/* Pull to refresh indicator */}
      {isRefreshing && (
        <div className="flex items-center justify-center p-2 bg-muted/50 border-b">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Refreshing messages...</span>
          </div>
        </div>
      )}

      <ScrollArea
        ref={scrollAreaRef}
        className="flex-1"
        onScrollCapture={handleScroll}
      >
        <div className="p-4 space-y-4">
          {/* Load more button at the top */}
          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadMore}
                disabled={isLoadingMore || errorState.isRetrying}
                className="text-xs"
              >
                {isLoadingMore || errorState.isRetrying ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load older messages"
                )}
              </Button>
            </div>
          )}

          {/* Loading skeleton for initial load */}
          {isLoading && allMessages.length === 0 && (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    i % 2 === 0 ? "justify-end" : "justify-start"
                  )}
                >
                  <div className="space-y-2 max-w-[70%]">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Messages with date separators */}
          {groupedMessages.map((item) => {
            if (item.type === "date-separator") {
              return (
                <div key={item.id} className="flex items-center gap-4 my-6">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-full border">
                    {formatDateSeparator(item.date!)}
                  </span>
                  <Separator className="flex-1" />
                </div>
              );
            }

            const message = item.message;
            const isQueued = 'isQueued' in message && message.isQueued;
            const queueError = 'queueError' in message ? message.queueError : undefined;

            return (
              <div
                key={item.id}
                className="animate-in slide-in-from-bottom-2 duration-200"
              >
                <MessageBubble
                  message={message}
                  currentUserId={currentUserId}
                  onRetry={handleRetry}
                  isQueued={isQueued}
                  queueError={queueError}
                />
              </div>
            );
          })}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <Button
          variant="secondary"
          size="sm"
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 rounded-full shadow-lg animate-in slide-in-from-bottom-2"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      )}

      {/* Refresh button (pull-to-refresh alternative) */}
      {onRefresh && !isRefreshing && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="absolute top-4 right-4 rounded-full shadow-lg"
          disabled={errorState.isRetrying}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}