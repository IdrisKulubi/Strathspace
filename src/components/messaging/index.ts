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

// Enhanced components with infinite scroll and pagination
export { InfiniteMessageList } from "./infinite-message-list";
export { VirtualMessageList } from "./virtual-message-list";
export { EnhancedMessageList } from "./enhanced-message-list";

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