/**
 * Messaging components exports
 * Core UI components for the database-driven messaging system
 */

export { MessageBubble } from "./message-bubble";
export { MessageList } from "./message-list";
export { MessageInput } from "./message-input";
export { ConversationList } from "./conversation-list";
export { MessageListContainer } from "./message-list-container";
export { MessageInputContainer } from "./message-input-container";
export { MessagingContainer } from "./messaging-container";
export { MessagingErrorBoundary, MessagingErrorFallback } from "./messaging-error-boundary";

// Re-export types for convenience
export type {
  Message,
  MessageStatus,
  Conversation,
  MessagingState,
  MessageBubbleProps,
  MessageListProps,
  MessageInputProps,
  ConversationListProps,
  ActionResult,
  PaginationParams,
  PaginatedResponse,
} from "@/lib/messaging/types";