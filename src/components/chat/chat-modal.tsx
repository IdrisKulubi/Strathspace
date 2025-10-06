"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getChats } from "@/lib/actions/chat.actions";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatPreview } from "./chat-preview";
import { EmptyChats } from "./empty-chats";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";


interface ChatSectionProps {
  currentUser: { id: string; image: string; name: string };
  onSelectChat: (matchId: string) => void;
  markAsRead?: (matchId: string) => void;
  initialChats?: ChatPreview[];
  disableNavigation?: boolean;
  selectedChatId?: string | null;
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
  initialChats = [],
  disableNavigation = false,
  selectedChatId = null,
}: ChatSectionProps) {
  const safeMarkAsRead = markAsRead ?? (() => {});
  const [chats, setChats] = useState<ChatPreview[]>(initialChats);
  const [isInitialLoading, setIsInitialLoading] = useState(!initialChats.length);
  const [isFetching, setIsFetching] = useState(false);
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState<number>(Date.now());
  const [query, setQuery] = useState("");

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

  // Periodic updates to replace real-time functionality
  useEffect(() => {
    if (!currentUser?.id) return;

    // Set up periodic fetching every 30 seconds
    const interval = setInterval(() => {
      fetchChats(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [currentUser?.id, fetchChats]);

  // Memoize the chat list to prevent unnecessary re-renders
  const chatList = useMemo(() => {
    const filtered = (chats || []).filter((c) => {
      if (!query.trim()) return true;
      const name = (c.firstName || "") + (c.id || "");
      const preview = c.lastMessage?.content || "";
      return name.toLowerCase().includes(query.toLowerCase()) || preview.toLowerCase().includes(query.toLowerCase());
    });

    return filtered.map((chat) => (
      <div key={chat.id} className="px-3 py-1">
        <ChatPreview 
          profile={chat as ChatPreview}
          currentUser={currentUser}
          onSelect={onSelectChat}
          markAsRead={safeMarkAsRead}
          disableNavigation={disableNavigation}
          isActive={selectedChatId === chat.matchId}
        />
      </div>
    ));
  }, [chats, currentUser, onSelectChat, markAsRead, query, selectedChatId, disableNavigation]);

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
    <div className="flex h-full w-full flex-col bg-[#2B1A3D] text-white">
      {/* Search bar */}
      <div className="px-3 pt-3 pb-2 border-b border-[#3D2652]/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Matches"
            className="pl-10 bg-[#3D2652] border-none text-white placeholder:text-gray-400 rounded-xl focus-visible:ring-1 focus-visible:ring-pink-500/50"
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="py-2">
          {chatList}
        </div>
      </ScrollArea>

      {isFetching && (
        <div className="absolute right-4 top-3">
          <Spinner className="h-4 w-4 text-gray-400 opacity-50" />
        </div>
      )}
    </div>
  );
} 