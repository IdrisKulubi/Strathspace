// Enhanced TypeScript types for messaging system

export interface Message {
  id: string;
  content: string;
  matchId: string;
  senderId: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  // Client-side only fields for optimistic updates
  isRetrying?: boolean;
  localId?: string;
}

export interface MessageWithSender extends Message {
  sender: {
    id: string;
    name: string;
    image?: string | null;
  };
}

export interface ConversationPreview {
  matchId: string;
  otherUser: {
    id: string;
    name: string;
    image?: string | null;
    isOnline: boolean;
  };
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: Date;
    status: 'sent' | 'delivered' | 'read';
  };
  unreadCount: number;
  updatedAt: Date;
}

export interface PaginatedMessages {
  messages: MessageWithSender[];
  hasMore: boolean;
  nextCursor?: string;
  totalCount: number;
}

// Form data types for server actions
export interface SendMessageFormData {
  matchId: string;
  content: string;
}

export interface GetMessagesParams {
  matchId: string;
  limit?: number;
  before?: string; // cursor for pagination
}

export interface UpdateMessageStatusParams {
  messageId: string;
  status: 'delivered' | 'read';
}

// Action result types
export interface SendMessageResult {
  success: boolean;
  data?: MessageWithSender;
  error?: string;
}

export interface GetMessagesResult {
  success: boolean;
  data?: PaginatedMessages;
  error?: string;
}

export interface GetConversationsResult {
  success: boolean;
  data?: ConversationPreview[];
  error?: string;
}

export interface UpdateMessageStatusResult {
  success: boolean;
  data?: { success: boolean };
  error?: string;
}

// Client-side state management types
export interface MessagingState {
  conversations: ConversationPreview[];
  activeConversation?: string;
  messages: Record<string, MessageWithSender[]>; // matchId -> messages
  isLoading: boolean;
  isSending: boolean;
  error?: string;
  // Pagination state
  messagesPagination: Record<string, {
    hasMore: boolean;
    nextCursor?: string;
    isLoadingMore: boolean;
  }>;
}

// Error types for better error handling
export interface MessagingError {
  type: 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'AUTH_ERROR' | 'PERMISSION_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  code?: string;
  retryable: boolean;
}

// Retry configuration
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // in milliseconds
  maxDelay: number;
  backoffFactor: number;
}

// Message status update event types
export interface MessageStatusUpdate {
  messageId: string;
  status: 'delivered' | 'read';
  timestamp: Date;
}

// Typing indicator types
export interface TypingIndicator {
  matchId: string;
  userId: string;
  isTyping: boolean;
  timestamp: Date;
}

// Real-time event types (for future WebSocket implementation)
export interface MessageEvent {
  type: 'NEW_MESSAGE' | 'MESSAGE_STATUS_UPDATE' | 'TYPING_START' | 'TYPING_STOP';
  matchId: string;
  data: MessageWithSender | MessageStatusUpdate | TypingIndicator;
}

// Validation schemas as types (for client-side validation)
export interface MessageValidation {
  content: {
    minLength: number;
    maxLength: number;
    required: boolean;
  };
  matchId: {
    format: 'uuid';
    required: boolean;
  };
}

// Constants for messaging system
export const MESSAGING_CONSTANTS = {
  MESSAGE_MAX_LENGTH: 1000,
  MESSAGE_MIN_LENGTH: 1,
  PAGINATION_DEFAULT_LIMIT: 50,
  PAGINATION_MAX_LIMIT: 100,
  FETCH_INTERVAL: 4000, // 4 seconds
  TYPING_TIMEOUT: 3000, // 3 seconds
  RETRY_CONFIG: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  } as RetryConfig
} as const;

// Message status hierarchy (for determining which status takes precedence)
export const MESSAGE_STATUS_HIERARCHY = {
  'failed': 0,
  'sending': 1,
  'sent': 2,
  'delivered': 3,
  'read': 4
} as const;

export type MessageStatus = keyof typeof MESSAGE_STATUS_HIERARCHY;