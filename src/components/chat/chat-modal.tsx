"use client";

import { useEffect, useState, useCallback } from "react";
import { getChats } from "@/lib/actions/chat.actions";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatPreview } from "./chat-preview";
import { EmptyChats } from "./empty-chats";
import { useInterval } from "@/hooks/use-interval";
import { cn } from "@/lib/utils";

interface ChatSectionProps {
  currentUser: { id: string; image: string; name: string };
  onSelectChat: (matchId: string) => void;
  markAsRead: (matchId: string) => void;
  initialChats?: ChatPreview[];
}

interface ChatPreview {
  id: string;
  userId: string;
  profilePhoto: string | null;
  matchId: string;
  firstName?: string;
  lastMessage: {
    content: string;
    createdAt: Date;
    isRead: boolean;
    senderId: string;
  };
}

export function ChatSection({ 
  currentUser, 
  onSelectChat, 
  markAsRead,
  initialChats = []
}: ChatSectionProps) {
  const [chats, setChats] = useState<ChatPreview[]>(initialChats);
  const [isInitialLoading, setIsInitialLoading] = useState(!initialChats.length);

  const fetchChats = useCallback(async () => {
    try {
      // Only show loading state on initial load if no initialChats
      if (isInitialLoading) {
        setIsInitialLoading(true);
      }

      console.time('ChatSection - fetchChats');
      const result = await getChats();
      console.timeEnd('ChatSection - fetchChats');
      
      if (result) {
        console.time('ChatSection - state update');
        // Only update if there are actual changes
        setChats(prevChats => {
          const hasChanges = JSON.stringify(prevChats) !== JSON.stringify(result);
          console.log('Chat data changed:', hasChanges);
          return hasChanges ? result : prevChats;
        });
        console.timeEnd('ChatSection - state update');
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
    } finally {
      setIsInitialLoading(false);
    }
  }, [isInitialLoading]);

  // Initial fetch - skip immediate fetch if we have initialChats
  useEffect(() => {
    if (initialChats.length === 0) {
      fetchChats();
    } else {
      // If we have initialChats, still fetch but with a small delay
      // to ensure UI is responsive first
      const timer = setTimeout(() => {
        fetchChats();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [fetchChats, initialChats.length]);

  // Silent background updates
  useInterval(() => {
    if (!isInitialLoading) {
      fetchChats();
    }
  }, 3000);

  if (isInitialLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Spinner className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (!isInitialLoading && chats.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <EmptyChats />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-background">
      <div className="border-b border-border/10 bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      </div>
      
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {chats.map((chat, index) => (
            <div 
              key={chat.id} 
              className={cn(
                "transition-colors hover:bg-muted/50",
                // Add top border to first item to match design
                index === 0 && "border-t border-border"
              )}
            >
              <ChatPreview 
                profile={chat as ChatPreview}
                currentUser={currentUser}
                onSelect={onSelectChat}
                markAsRead={markAsRead}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
} 