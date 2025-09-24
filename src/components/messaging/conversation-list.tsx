"use client";

import { format, isToday, isYesterday } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ConversationListProps } from "@/lib/messaging/types";

/**
 * ConversationList component displays a list of conversations with previews
 * Shows unread indicators, last message previews, and online status
 */
export function ConversationList({
  conversations,
  activeConversationId,
  onConversationSelect,
  isLoading = false,
}: ConversationListProps) {
  
  // Format the last message timestamp
  const formatLastMessageTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, "HH:mm");
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else {
      return format(date, "MMM d");
    }
  };

  // Truncate message content for preview
  const truncateMessage = (content: string, maxLength = 50) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + "...";
  };

  // Get user initials for avatar fallback
  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-3 w-8" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">No conversations yet</p>
          <p className="text-sm text-muted-foreground">
            Start matching to begin conversations!
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {conversations.map((conversation) => {
          const isActive = conversation.matchId === activeConversationId;
          const hasUnread = conversation.unreadCount > 0;
          
          return (
            <Card
              key={conversation.matchId}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md",
                isActive && "ring-2 ring-primary/50 bg-primary/5",
                hasUnread && "border-primary/30"
              )}
              onClick={() => onConversationSelect(conversation.matchId)}
            >
              <CardContent className="p-3">
                <div className="flex items-center space-x-3">
                  {/* User Avatar with online indicator */}
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={conversation.otherUser.image}
                        alt={conversation.otherUser.name}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-pink-100 to-rose-100 text-pink-700">
                        {getUserInitials(conversation.otherUser.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Online status indicator */}
                    {conversation.otherUser.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-green-500 border-2 border-background rounded-full" />
                    )}
                  </div>

                  {/* Conversation details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3
                        className={cn(
                          "font-medium truncate",
                          hasUnread && "font-semibold"
                        )}
                      >
                        {conversation.otherUser.name}
                      </h3>
                      
                      {/* Timestamp and unread badge */}
                      <div className="flex items-center gap-2 ml-2">
                        {conversation.lastMessage && (
                          <span
                            className={cn(
                              "text-xs",
                              hasUnread
                                ? "text-primary font-medium"
                                : "text-muted-foreground"
                            )}
                          >
                            {formatLastMessageTime(new Date(conversation.lastMessage.createdAt))}
                          </span>
                        )}
                        
                        {hasUnread && (
                          <Badge
                            variant="default"
                            className="h-5 min-w-[20px] px-1.5 text-xs bg-primary"
                          >
                            {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Last message preview */}
                    {conversation.lastMessage ? (
                      <p
                        className={cn(
                          "text-sm truncate mt-1",
                          hasUnread
                            ? "text-foreground font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        {conversation.lastMessage.senderId === conversation.otherUser.id
                          ? truncateMessage(conversation.lastMessage.content)
                          : `You: ${truncateMessage(conversation.lastMessage.content)}`}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1 italic">
                        No messages yet
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}