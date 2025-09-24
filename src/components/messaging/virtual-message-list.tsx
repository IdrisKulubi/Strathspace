"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { List } from "react-window";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, Loader2, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./message-bubble";
import { useMessagePagination } from "@/hooks/use-message-pagination";
import { MemoryMonitor, performanceMonitor } from "@/lib/messaging/performance";
import type { MessageWithSender } from "@/lib/actions/messaging.actions";

interface VirtualMessageListProps {
  /**
   * The match/conversation ID
   */
  matchId: string;

  /**
   * Current user ID for message alignment
   */
  currentUserId: string;

  /**
   * Height of the message list container
   * @default 400
   */
  height?: number;

  /**
   * Estimated height of each message item
   * @default 80
   */
  itemHeight?: number;

  /**
   * Number of messages to load per page
   * @default 100
   */
  pageSize?: number;

  /**
   * Custom retry handler for failed messages
   */
  onRetry?: (messageId?: string) => Promise<void>;

  /**
   * Callback when messages are loaded
   */
  onMessagesLoaded?: (
    messages: MessageWithSender[],
    isLoadingMore: boolean
  ) => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

interface MessageListItem {
  type: "message" | "date-separator" | "loading";
  id: string;
  message?: MessageWithSender;
  date?: Date;
  height: number;
}

interface ItemRendererProps {
  index: number;
  style: React.CSSProperties;
}

/**
 * Virtual scrolling message list for handling very large message histories
 * Uses react-window for performance optimization with thousands of messages
 */
export function VirtualMessageList({
  matchId,
  currentUserId,
  height = 400,
  itemHeight = 80,
  pageSize = 100,
  onRetry,
  onMessagesLoaded,
  className,
}: VirtualMessageListProps) {
  const listRef = useRef<any>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const performanceRef = useRef<{ lastRender: number; renderCount: number }>({
    lastRender: 0,
    renderCount: 0,
  });

  // Use the message pagination hook with larger page size for virtual scrolling
  const {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    totalCount,
    loadMore,
    refresh,
    infiniteScroll,
  } = useMessagePagination({
    matchId,
    pageSize,
    enabled: true,
    loadMoreThreshold: itemHeight * 5, // Load more when 5 items from top
    maintainScrollPosition: false, // Virtual list handles this
    onMessagesLoaded,
    onError: (error) => {
      console.error("Virtual message list error:", error);
    },
  });

  // Monitor memory usage
  useEffect(() => {
    const stopMonitoring = MemoryMonitor.startMonitoring(30000);
    return stopMonitoring;
  }, []);

  // Performance monitoring
  useEffect(() => {
    const now = performance.now();
    performanceRef.current.renderCount++;

    if (performanceRef.current.lastRender > 0) {
      const renderTime = now - performanceRef.current.lastRender;

      performanceMonitor.recordQuery({
        operation: "virtual-list-render",
        duration: renderTime,
        timestamp: Date.now(),
        success: true,
        metadata: {
          messageCount: messages.length,
          renderCount: performanceRef.current.renderCount,
        },
      });
    }

    performanceRef.current.lastRender = now;
  });

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

  // Create virtual list items with date separators
  const listItems = useMemo(() => {
    const items: MessageListItem[] = [];

    // Add loading indicator at top if loading more
    if (isLoadingMore && hasMore) {
      items.push({
        type: "loading",
        id: "loading-more",
        height: 60,
      });
    }

    // Process messages and add date separators
    messages.forEach((message, index) => {
      const messageDate = new Date(message.createdAt);
      const prevMessage = index > 0 ? messages[index - 1] : null;
      const prevMessageDate = prevMessage
        ? new Date(prevMessage.createdAt)
        : null;

      // Add date separator if this is the first message or date changed
      if (!prevMessageDate || !isSameDay(messageDate, prevMessageDate)) {
        items.push({
          type: "date-separator",
          id: `date-${messageDate.toISOString()}`,
          date: messageDate,
          height: 40,
        });
      }

      // Add message
      items.push({
        type: "message",
        id: message.id,
        message,
        height: itemHeight,
      });
    });

    return items;
  }, [messages, isLoadingMore, hasMore, itemHeight]);

  // Get item height for virtual list
  const getItemSize = useCallback(
    (index: number) => {
      return listItems[index]?.height || itemHeight;
    },
    [listItems, itemHeight]
  );

  // Handle scroll events
  const handleScroll = useCallback(
    ({ scrollOffset, scrollUpdateWasRequested }: any) => {
      if (!scrollUpdateWasRequested) {
        const totalHeight = listItems.reduce(
          (sum, item) => sum + item.height,
          0
        );
        const visibleHeight = height;
        const distanceFromBottom = totalHeight - scrollOffset - visibleHeight;

        const nearBottom = distanceFromBottom < itemHeight * 3;
        setIsNearBottom(nearBottom);
        setShowScrollToBottom(!nearBottom && messages.length > 0);

        // Load more when near top
        if (scrollOffset < itemHeight * 2 && hasMore && !isLoadingMore) {
          loadMore();
        }
      }
    },
    [
      listItems,
      height,
      itemHeight,
      messages.length,
      hasMore,
      isLoadingMore,
      loadMore,
    ]
  );

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (listRef.current && listItems.length > 0) {
      listRef.current.scrollToItem(listItems.length - 1, "end");
    }
  }, [listItems.length]);

  // Scroll to top
  const scrollToTop = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(0, "start");
    }
  }, []);

  // Auto-scroll to bottom for new messages
  useEffect(() => {
    if (isNearBottom && !isLoadingMore && listItems.length > 0) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [
    messages.length,
    isNearBottom,
    isLoadingMore,
    listItems.length,
    scrollToBottom,
  ]);

  // Enhanced retry function
  const handleRetry = async (messageId?: string) => {
    if (onRetry) {
      try {
        await onRetry(messageId);
      } catch (error) {
        console.error("Retry failed:", error);
      }
    }
  };

  // Item renderer function for react-window
  const renderItem = useCallback(
    ({ index, style }: ItemRendererProps) => {
      const item = listItems[index];

      if (!item) {
        return <div style={style} />;
      }

      if (item.type === "loading") {
        return (
          <div style={style} className="flex justify-center items-center py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading older messages...</span>
            </div>
          </div>
        );
      }

      if (item.type === "date-separator") {
        return (
          <div style={style} className="flex items-center gap-4 my-2 px-4">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-full border">
              {formatDateSeparator(item.date!)}
            </span>
            <Separator className="flex-1" />
          </div>
        );
      }

      if (item.type === "message" && item.message) {
        return (
          <div style={style} className="px-4 py-2">
            <MessageBubble
              message={item.message}
              currentUserId={currentUserId}
              onRetry={(message) => handleRetry(message.id)}
            />
          </div>
        );
      }

      return <div style={style} />;
    },
    [listItems, currentUserId, handleRetry, formatDateSeparator]
  );

  // Empty state
  if (messages.length === 0 && !isLoading && !error) {
    return (
      <div
        className={cn("flex items-center justify-center p-8", className)}
        style={{ height }}
      >
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
      <div
        className={cn("flex items-center justify-center p-8", className)}
        style={{ height }}
      >
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

  // Loading state
  if (isLoading && messages.length === 0) {
    return (
      <div className={cn("p-4 space-y-4", className)} style={{ height }}>
        {Array.from({ length: Math.floor(height / itemHeight) }).map((_, i) => (
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
    );
  }

  return (
    <div className={cn("relative", className)} style={{ height }}>
      {/* Error banner for partial failures */}
      {error && messages.length > 0 && (
        <div className="absolute top-0 left-0 right-0 z-10 p-2 bg-destructive/10 border-b border-destructive/20">
          <div className="flex items-center justify-between">
            <p className="text-sm text-destructive">{error}</p>
            <Button onClick={refresh} variant="ghost" size="sm">
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Virtual list */}
      <List
        ref={listRef}
        height={height}
        itemCount={listItems.length}
        itemSize={getItemSize}
        onScroll={handleScroll}
        className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
      >
        {renderItem}
      </List>

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

      {/* Scroll to top button */}
      {messages.length > 50 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollToTop}
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
