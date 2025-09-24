"use client";

import { useEffect, useRef, useState } from "react";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, Loader2, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./message-bubble";
import { useMessagePagination } from "@/hooks/use-message-pagination";
import type { MessageWithSender } from "@/lib/actions/messaging.actions";

interface InfiniteMessageListProps {
  /**
   * The match/conversation ID
   */
  matchId: string;
  
  /**
   * Current user ID for message alignment
   */
  currentUserId: string;
  
  /**
   * Number of messages to load per page
   * @default 50
   */
  pageSize?: number;
  
  /**
   * Whether to enable infinite scroll
   * @default true
   */
  enableInfiniteScroll?: boolean;
  
  /**
   * Custom retry handler for failed messages
   */
  onRetry?: (messageId?: string) => Promise<void>;
  
  /**
   * Callback when messages are loaded
   */
  onMessagesLoaded?: (messages: MessageWithSender[], isLoadingMore: boolean) => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Enhanced message list with infinite scroll pagination
 * Features:
 * - Infinite scroll for loading older messages
 * - Maintains scroll position when loading more messages
 * - Smooth animations and transitions
 * - Date separators and message grouping
 * - Performance optimized for large message histories
 */
export function InfiniteMessageList({
  matchId,
  currentUserId,
  pageSize = 50,
  enableInfiniteScroll = true,
  onRetry,
  onMessagesLoaded,
  className
}: InfiniteMessageListProps) {
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use the message pagination hook
  const {
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
    infiniteScroll
  } = useMessagePagination({
    matchId,
    pageSize,
    enabled: true,
    loadMoreThreshold: 100,
    maintainScrollPosition: true,
    onMessagesLoaded,
    onError: (error) => {
      console.error('Message pagination error:', error);
    }
  });

  // Handle scroll events to show/hide scroll-to-bottom button
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // Consider "near bottom" if within 100px of the bottom
    const nearBottom = distanceFromBottom < 100;
    setIsNearBottom(nearBottom);
    setShowScrollToBottom(!nearBottom && messages.length > 0);
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
  const groupedMessages = messages.reduce((groups, message, index) => {
    const messageDate = new Date(message.createdAt);
    const prevMessage = index > 0 ? messages[index - 1] : null;
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
  }, [] as Array<{ type: "date-separator" | "message"; date?: Date; message?: MessageWithSender; id: string }>);

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (isNearBottom && messagesEndRef.current && !isLoadingMore) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isNearBottom, isLoadingMore]);

  // Enhanced retry function
  const handleRetry = async (messageId?: string) => {
    if (onRetry) {
      try {
        await onRetry(messageId);
      } catch (error) {
        console.error('Retry failed:', error);
      }
    }
  };

  // Empty state
  if (messages.length === 0 && !isLoading && !error) {
    return (
      <div className={cn("flex-1 flex items-center justify-center p-8", className)}>
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">No messages yet</p>
          <p className="text-sm text-muted-foreground">
            Start the conversation by sending a message!
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && messages.length === 0) {
    return (
      <div className={cn("flex-1 flex items-center justify-center p-8", className)}>
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Failed to load messages</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={refresh} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex-1 relative flex flex-col", className)}>
      {/* Error banner for partial failures */}
      {error && messages.length > 0 && (
        <div className="p-2 bg-destructive/10 border-b border-destructive/20">
          <div className="flex items-center justify-between">
            <p className="text-sm text-destructive">{error}</p>
            <Button onClick={refresh} variant="ghost" size="sm">
              Retry
            </Button>
          </div>
        </div>
      )}

      <ScrollArea
        ref={infiniteScroll.scrollRef}
        className="flex-1"
        onScrollCapture={handleScroll}
      >
        <div className="p-4 space-y-4">
          {/* Load more trigger for infinite scroll */}
          {enableInfiniteScroll && hasMore && (
            <div 
              ref={infiniteScroll.loadMoreRef}
              className="flex justify-center py-2"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading older messages...</span>
                  </>
                ) : (
                  <>
                    <ArrowUp className="h-4 w-4" />
                    <span>Scroll up to load more ({totalCount - messages.length} remaining)</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Manual load more button (fallback) */}
          {!enableInfiniteScroll && hasMore && (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="text-xs"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  `Load older messages (${totalCount - messages.length} remaining)`
                )}
              </Button>
            </div>
          )}

          {/* Loading skeleton for initial load */}
          {isLoading && messages.length === 0 && (
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
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
          {groupedMessages.map((item, index) => {
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

            return (
              <div
                key={item.id}
                className="animate-in slide-in-from-bottom-2 duration-200"
                style={{
                  animationDelay: `${Math.min(index * 50, 500)}ms`
                }}
              >
                <MessageBubble
                  message={item.message!}
                  currentUserId={currentUserId}
                  onRetry={handleRetry}
                />
              </div>
            );
          })}

          {/* Loading indicator for loading more messages */}
          {isLoadingMore && messages.length > 0 && (
            <div className="flex justify-center py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading more messages...</span>
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => infiniteScroll.scrollToBottom('smooth')}
          className="absolute bottom-4 right-4 rounded-full shadow-lg animate-in slide-in-from-bottom-2"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      )}

      {/* Scroll to top button (when there are many messages) */}
      {messages.length > 50 && !infiniteScroll.getScrollInfo().isAtTop && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => infiniteScroll.scrollToTop('smooth')}
          className="absolute top-4 right-4 rounded-full shadow-lg"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      )}

      {/* Message count indicator */}
      {totalCount > messages.length && (
        <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-muted-foreground border">
          {messages.length} of {totalCount} messages
        </div>
      )}
    </div>
  );
}