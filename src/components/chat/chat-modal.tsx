"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getChats } from "@/lib/actions/chat.actions";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatPreview } from "./chat-preview";
import { EmptyChats } from "./empty-chats";
import { cn } from "@/lib/utils";
import Pusher from 'pusher-js';

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
  const [isFetching, setIsFetching] = useState(false);
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState<number>(Date.now());

  // Memoize the fetch function to avoid recreation on each render
  const fetchChats = useCallback(async (force = false) => {
    try {
      // Only set loading state on initial load if no initialChats
      if (isInitialLoading) {
        setIsInitialLoading(true);
      }

      // If already fetching, or if not forced and it's been less than 5 seconds since last fetch, skip
      if (isFetching || (!force && Date.now() - lastFetchTimestamp < 5000)) {
        console.log('Skipping redundant fetch - too soon or already in progress');
        return;
      }

      setIsFetching(true);
      console.time('ChatSection - fetchChats');
      const result = await getChats();
      console.timeEnd('ChatSection - fetchChats');
      setLastFetchTimestamp(Date.now());
      
      if (result) {
        console.time('ChatSection - state update');
        // Only update if there are actual changes - deep comparison through JSON
        const currentKey = JSON.stringify(chats.map(c => ({ 
          id: c.id, 
          matchId: c.matchId,
          lastUpdate: c.lastMessage?.createdAt
        })));
        
        const newKey = JSON.stringify(result.map(c => ({ 
          id: c.id, 
          matchId: c.matchId,
          lastUpdate: c.lastMessage?.createdAt
        })));
        
        const hasChanges = currentKey !== newKey;
        console.log('Chat data changed:', hasChanges);
        
        if (hasChanges) {
          setChats(result);
        }
        console.timeEnd('ChatSection - state update');
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
    } finally {
      setIsInitialLoading(false);
      setIsFetching(false);
    }
  }, [isInitialLoading, chats, isFetching, lastFetchTimestamp]);

  // Initial fetch - skip immediate fetch if we have initialChats
  useEffect(() => {
    if (initialChats.length === 0) {
      fetchChats(true);
    } else {
      // If we have initialChats, still fetch but with a small delay
      const timer = setTimeout(() => {
        fetchChats(true);
      }, 2000); // Increased from 1000ms to 2000ms for better user experience
      return () => clearTimeout(timer);
    }
  }, [fetchChats, initialChats.length]);

  // Real-time updates via Pusher
  useEffect(() => {
    if (!currentUser?.id) return;

    // Ensure environment variables are available
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!pusherKey || !pusherCluster) {
      console.error("Pusher environment variables are not set.");
      return;
    }

    const pusherClient = new Pusher(pusherKey, {
      cluster: pusherCluster,
      authEndpoint: "/api/pusher/auth",
    });

    const channelName = `private-user-${currentUser.id}-chatlist`;
    const eventName = "chatlist-update";

    try {
      const channel = pusherClient.subscribe(channelName);
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
      channel.bind(eventName, (_data: any) => {
        setTimeout(() => fetchChats(true), 300);
      });

      channel.bind('pusher:subscription_succeeded', () => {
      });
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
      channel.bind('pusher:subscription_error', (status: any) => {
        console.error(`Failed to subscribe to ${channelName}: `, status);
      });
      
      return () => {
        pusherClient.unsubscribe(channelName);
      };
    } catch (error) {
      console.error("Error setting up Pusher subscription:", error);
    }
  }, [currentUser?.id, fetchChats]);

  // Memoize the chat list to prevent unnecessary re-renders
  const chatList = useMemo(() => {
    return chats.map((chat, index) => (
      <div 
        key={chat.id} 
        className={cn(
          "transition-colors hover:bg-muted/50",
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
    ));
  }, [chats, currentUser, onSelectChat, markAsRead]);

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
        {isFetching && (
          <div className="absolute right-4 top-3">
            <Spinner className="h-4 w-4 text-muted-foreground opacity-50" />
          </div>
        )}
      </div>
      
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {chatList}
        </div>
      </ScrollArea>
    </div>
  );
} 