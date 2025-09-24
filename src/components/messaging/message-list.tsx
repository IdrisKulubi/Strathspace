"use client";

import { useEffect, useRef, useState } from "react";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./message-bubble";
import type { MessageListProps } from "@/lib/messaging/types";

/**
 * MessageList component displays a scrollable list of messages with date separators
 * Supports infinite scroll, smooth animations, and maintains scroll position
 */
export function MessageList({
  messages,
  currentUserId,
  isLoading = false,
  onLoadMore,
  hasMore = false,
  onRetry,
  className,
}: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (isNearBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isNearBottom]);

  // Handle scroll events to show/hide scroll-to-bottom button
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // Consider "near bottom" if within 100px of the bottom
    const nearBottom = distanceFromBottom < 100;
    setIsNearBottom(nearBottom);
    setShowScrollToBottom(!nearBottom && messages.length > 0);
  };

  // Load more messages when scrolling to top
  const handleLoadMore = async () => {
    if (!onLoadMore || isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      await onLoadMore();
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
  }, [] as Array<{ type: "date-separator" | "message"; date?: Date; message?: any; id: string }>);

  if (messages.length === 0 && !isLoading) {
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
    <div className={cn("flex-1 relative", className)}>
      <ScrollArea
        ref={scrollAreaRef}
        className="h-full"
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
                disabled={isLoadingMore}
                className="text-xs"
              >
                {isLoadingMore ? (
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
          {isLoading && messages.length === 0 && (
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

            return (
              <div
                key={item.id}
                className="animate-in slide-in-from-bottom-2 duration-200"
              >
                <MessageBubble
                  message={item.message}
                  currentUserId={currentUserId}
                  onRetry={onRetry}
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
    </div>
  );
}