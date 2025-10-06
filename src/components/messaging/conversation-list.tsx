"use client";

import { format, isToday, isYesterday } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConversationListProps } from "@/lib/messaging/types";

/**
 * ConversationList component displays a list of conversations with previews
 * Shows unread indicators, last message previews, and online status
 * Redesigned with dark purple theme matching the provided UI design
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
      <div className="space-y-1 p-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-3 rounded-lg">
            <Skeleton className="h-12 w-12 rounded-full bg-purple-800/30" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 bg-purple-800/30" />
              <Skeleton className="h-3 w-1/2 bg-purple-800/30" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <p className="text-gray-400">No conversations yet</p>
          <p className="text-sm text-gray-500">
            Start matching to begin conversations!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#2B1A3D]">
      {/* Search Bar */}
      <div className="p-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search Matches"
            className="pl-10 bg-[#3D2652] border-none text-white placeholder:text-gray-400 rounded-xl focus-visible:ring-1 focus-visible:ring-pink-500/50"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="px-2 pb-2">
          {conversations.map((conversation) => {
            const isActive = conversation.matchId === activeConversationId;
            const hasUnread = conversation.unreadCount > 0;
            
            return (
              <div
                key={conversation.matchId}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 mb-1",
                  "hover:bg-[#3D2652]/60",
                  isActive && "bg-[#492759]"
                )}
                onClick={() => onConversationSelect(conversation.matchId)}
              >
                {/* Avatar with online indicator */}
                <div className="relative flex-shrink-0">
                  <Avatar className="h-12 w-12 border-2 border-transparent">
                    <AvatarImage
                      src={conversation.otherUser.image}
                      alt={conversation.otherUser.name}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-600 text-white font-semibold">
                      {getUserInitials(conversation.otherUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Online status indicator */}
                  {conversation.otherUser.isOnline && (
                    <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 border-2 border-[#2B1A3D] rounded-full" />
                  )}
                </div>

                {/* Conversation details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3
                      className={cn(
                        "text-white truncate text-[15px]",
                        hasUnread ? "font-semibold" : "font-medium"
                      )}
                    >
                      {conversation.otherUser.name}
                    </h3>
                  </div>

                  {/* Last message preview and mutual friends */}
                  <div className="flex items-center justify-between">
                    {conversation.lastMessage ? (
                      <p
                        className={cn(
                          "text-[13px] truncate flex-1 mr-2",
                          hasUnread
                            ? "text-gray-300 font-medium"
                            : "text-gray-400"
                        )}
                      >
                        {conversation.lastMessage.senderId === conversation.otherUser.id
                          ? truncateMessage(conversation.lastMessage.content, 35)
                          : truncateMessage(conversation.lastMessage.content, 35)}
                      </p>
                    ) : (
                      <p className="text-[13px] text-gray-500 truncate flex-1 mr-2">
                        {conversation.otherUser.mutualFriends || 2} mutual friends
                      </p>
                    )}
                    
                    {/* Unread badge or time */}
                    {hasUnread ? (
                      <Badge
                        className="h-5 min-w-[20px] px-1.5 text-xs bg-pink-500 hover:bg-pink-500 text-white border-none font-semibold"
                      >
                        {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                      </Badge>
                    ) : conversation.lastMessage && (
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatLastMessageTime(new Date(conversation.lastMessage.createdAt))}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
