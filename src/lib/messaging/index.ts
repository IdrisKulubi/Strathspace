/**
 * Messaging System - Main Export File
 * 
 * This file exports all the messaging functionality including:
 * - Server Actions for message operations
 * - Database utilities for efficient queries
 * - Type definitions
 * - Validation schemas
 * - Error handling utilities
 */

// Server Actions
export {
  sendMessage,
  sendMessageAction,
  getMessages,
  getConversations,
  updateMessageStatus,
  markConversationAsRead,
  validateUserAccess,
  type MessageWithSender,
  type ConversationPreview,
  type PaginatedMessages
} from '../actions/messaging.actions';

// Database Utilities
export {
  validateUserMatchAccess,
  getMatchWithParticipants,
  getConversationMessages,
  getConversationMessageCount,
  getUnreadMessageCount,
  getAllUnreadCounts,
  getLatestMessagesForMatches,
  insertMessage,
  updateMessageStatus as updateMessageStatusDb,
  updateMatchTimestamp,
  markConversationMessagesAsRead,
  getConversationParticipants,
  getMessageById,
  getRecentMessagesForUser
} from '../utils/messaging-db.utils';

// Types
export type {
  Message,
  MessageWithSender as MessageWithSenderType,
  ConversationPreview as ConversationPreviewType,
  PaginatedMessages as PaginatedMessagesType,
  SendMessageFormData,
  GetMessagesParams,
  UpdateMessageStatusParams,
  SendMessageResult,
  GetMessagesResult,
  GetConversationsResult,
  UpdateMessageStatusResult,
  MessagingState,
  MessagingError,
  RetryConfig,
  MessageStatusUpdate,
  TypingIndicator,
  MessageEvent,
  MessageValidation,
  MessageStatus
} from '../types/messaging.types';

// Constants
export { MESSAGING_CONSTANTS, MESSAGE_STATUS_HIERARCHY } from '../types/messaging.types';

// Validation (if needed)
export {
  validateMessageContent,
  validateMessageComprehensive,
  messageContentSchema,
  sendMessageSchema,
  getMessagesSchema,
  updateMessageStatusSchema
} from '../validators/messaging.validators';

// Error Handling
export {
  MessagingErrorType,
  createMessagingError,
  retryWithBackoff,
  withErrorHandling,
  getUserFriendlyErrorMessage,
  validateAndExecute,
  DEFAULT_RETRY_CONFIG
} from '../utils/messaging-errors.utils';

// Hooks
export { usePeriodicMessageFetch } from '../../hooks/use-periodic-message-fetch';
export { useMessagingWithPeriodicFetch } from '../../hooks/use-messaging-with-periodic-fetch';