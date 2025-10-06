"use client";

import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle } from "lucide-react";
import type { MessageBubbleProps } from "@/lib/messaging/types";

/**
 * MessageBubble component displays individual messages with status indicators and timestamps
 * Supports retry functionality for failed messages and optimistic updates
 */
export function MessageBubble({ message, currentUserId, onRetry }: MessageBubbleProps) {
  const isCurrentUser = message.senderId === currentUserId;
  const messageDate = new Date(message.createdAt);
  
  // Format timestamp based on when the message was sent
  const formatTimestamp = (date: Date) => {
    if (isToday(date)) {
      return format(date, "HH:mm");
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, "HH:mm")}`;
    } else {
      return format(date, "MMM d, HH:mm");
    }
  };

  // Determine message status styling and icons
  const getStatusIcon = () => {
    if (message.isOptimistic || message.status === "sending") {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs opacity-60 cursor-help">⏳</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Sending...</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    switch (message.status) {
      case "sent":
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs opacity-60 cursor-help">✓</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sent</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case "delivered":
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs opacity-60 cursor-help">✓✓</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delivered</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case "read":
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-blue-400 cursor-help">✓✓</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Read</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case "failed":
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertCircle className="h-3 w-3 text-red-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Failed to send</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      default:
        return null;
    }
  };

  // Determine message bubble styling based on content length
  const contentLength = message.content.length;
  const isShortMessage = contentLength < 30;
  const isLongMessage = contentLength > 150;

  return (
    <div
      className={cn(
        "flex flex-col gap-1 max-w-[85%] sm:max-w-[75%] md:max-w-[65%]",
        isCurrentUser ? "ml-auto items-end" : "mr-auto items-start"
      )}
    >
      <div
        className={cn(
          "rounded-2xl transition-all duration-200",
          // Padding based on message length
          isShortMessage ? "px-3 py-2" : isLongMessage ? "p-4" : "px-3 py-2.5",
          // Text size based on message length
          isShortMessage ? "text-sm" : "text-base",
          // Background and text colors
          isCurrentUser
? "bg-gradient-to-r from-[#fb51c2] via-[#ff6cd4] to-[#ff88de] text-white shadow-lg shadow-pink-500/20"
            : "bg-[#3D2652] text-white border border-[#4D3662]/50",
          // Border radius adjustments for message tails
          isCurrentUser ? "rounded-br-md" : "rounded-bl-md",
          // Opacity for optimistic messages
          message.isOptimistic && "opacity-70",
          // Error styling for failed messages
          message.status === "failed" && "border-red-200 bg-red-50 dark:bg-red-950/20"
        )}
      >
        <p className="break-words whitespace-pre-wrap leading-relaxed">
          {message.content}
        </p>
        
        {/* Message metadata (timestamp and status) */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "text-xs opacity-75 cursor-help",
                    isCurrentUser ? "text-white/90" : "text-muted-foreground"
                  )}
                >
                  {formatTimestamp(messageDate)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{format(messageDate, "PPpp")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Status indicator for current user's messages */}
          {isCurrentUser && (
            <div className="flex items-center gap-1">
              {message.isRetrying && (
                <RefreshCw className="h-3 w-3 animate-spin opacity-60" />
              )}
              {getStatusIcon()}
            </div>
          )}
        </div>
        
        {/* Retry button for failed messages */}
        {message.status === "failed" && onRetry && (
          <div className="mt-2 pt-2 border-t border-red-200/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRetry(message)}
              disabled={message.isRetrying}
              className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-100/50"
            >
              {message.isRetrying ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Retrying...
                </>
              ) : (
                "Retry"
              )}
            </Button>
          </div>
        )}
      </div>
      
      {/* Status badge for special states */}
      {(message.isOptimistic || message.status === "sending") && (
        <Badge variant="secondary" className="text-xs opacity-60 self-end">
          Sending...
        </Badge>
      )}
    </div>
  );
}