/**
 * TypeScript interfaces for the messaging system
 * These types extend the database schema for client-side messaging functionality
 */

import type { Message as DBMessage } from "@/db/schema";

// Message status type for better type safety
export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

// Enhanced Message interface for client-side usage
export interface Message extends Omit<DBMessage, 'status'> {
  // Override status to include client-side states
  status: MessageStatus;
  // Client-side only properties for optimistic updates and retry functionality
  isRetrying?: boolean;
  localId?: string; // Temporary ID for optimistic updates
  isOptimistic?: boolean; // Flag to indicate if this is an optimistic message
}

// Conversation interface for the conversation list
export interface Conversation {
  matchId: string;
  otherUser: {
    id: string;
    name: string;
    image?: string | null;
    isOnline: boolean;
  };
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: Date;
}

// Client state management interface
export interface MessagingState {
  conversations: Conversation[];
  activeConversation?: string;
  messages: Record<string, Message[]>; // matchId -> messages array
  isLoading: boolean;
  isSending: boolean;
  error?: string;
}

// Props interfaces for components
export interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
  onRetry?: (message: Message) => void;
}

export interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onRetry?: (message: Message) => void;
  className?: string;
}

export interface MessageInputProps {
  onSend: (content: string) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string | null;
  onConversationSelect: (matchId: string) => void;
  isLoading?: boolean;
}

// Action result types for server actions
export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Pagination types
export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}