"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getConversations, markConversationAsRead } from "@/lib/actions/messaging.actions";
import type { ConversationPreview } from "@/lib/actions/messaging.actions";

interface UseConversationNavigationReturn {
  conversations: ConversationPreview[];
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;
  selectConversation: (matchId: string) => void;
  refreshConversations: () => Promise<void>;
  markAsRead: (matchId: string) => Promise<void>;
}

/**
 * Hook for managing conversation navigation and state
 * Handles conversation selection, URL navigation, and state management
 */
export function useConversationNavigation(): UseConversationNavigationReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get active conversation from URL params
  const activeConversationId = searchParams.get('conversation') || null;

  /**
   * Fetch conversations from the server
   */
  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await getConversations();
      
      if (result.success && result.data) {
        setConversations(result.data);
      } else {
        setError(result.error || "Failed to load conversations");
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setError("Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Select a conversation and navigate to it
   */
  const selectConversation = useCallback((matchId: string) => {
    // Update URL to reflect selected conversation
    const params = new URLSearchParams(searchParams.toString());
    params.set('conversation', matchId);
    router.push(`?${params.toString()}`, { scroll: false });
    
    // Mark conversation as read when selected
    markAsRead(matchId);
  }, [router, searchParams]);

  /**
   * Mark a conversation as read
   */
  const markAsRead = useCallback(async (matchId: string) => {
    try {
      await markConversationAsRead(matchId);
      
      // Update local state to reflect read status
      setConversations(prev => 
        prev.map(conv => 
          conv.matchId === matchId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    } catch (err) {
      console.error("Error marking conversation as read:", err);
    }
  }, []);

  /**
   * Refresh conversations (for manual refresh or periodic updates)
   */
  const refreshConversations = useCallback(async () => {
    await fetchConversations();
  }, [fetchConversations]);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Auto-refresh conversations every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchConversations]);

  return {
    conversations,
    activeConversationId,
    isLoading,
    error,
    selectConversation,
    refreshConversations,
    markAsRead,
  };
}