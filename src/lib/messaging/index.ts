// Central export file for messaging system

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
} from '@/lib/actions/messaging.actions';

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
  updateMessageStatus as updateMessageStatusDB,
  updateMatchTimestamp,
  markConversationMessagesAsRead,
  getConversationParticipants,
  getMessageById,
  getRecentMessagesForUser
} from '@/lib/utils/messaging-db.utils';

// Validation
export {
  sendMessageSchema,
  getMessagesSchema,
  updateMessageStatusSchema,
  markConversationAsReadSchema,
  sendMessageFormSchema,
  bulkUpdateMessagesSchema,
  paginationSchema,
  searchMessagesSchema,
  messageFilterSchema,
  conversationSettingsSchema,
  validateMessageContent,
  validateUUID,
  validatePagination,
  validateMessageComprehensive,
  customValidationRules,
  type SendMessageInput,
  type GetMessagesInput,
  type UpdateMessageStatusInput,
  type MarkConversationAsReadInput,
  type SendMessageFormInput,
  type BulkUpdateMessagesInput,
  type PaginationInput,
  type SearchMessagesInput,
  type MessageFilterInput,
  type ConversationSettingsInput
} from '@/lib/validators/messaging.validators';

// Error Handling
export {
  MessagingErrorType,
  ERROR_MESSAGES,
  ERROR_CODES,
  DEFAULT_RETRY_CONFIG,
  createMessagingError,
  isRetryableError,
  normalizeError,
  createErrorResult,
  createSuccessResult,
  withErrorHandling,
  retryWithBackoff,
  validateAndExecute,
  extractFormData,
  getUserFriendlyErrorMessage,
  logError,
  createErrorResponse,
  type MessagingError,
  type RetryConfig
} from '@/lib/utils/messaging-errors.utils';

// Types
export type {
  Message,
  MessageWithSender,
  ConversationPreview,
  PaginatedMessages,
  SendMessageFormData,
  GetMessagesParams,
  UpdateMessageStatusParams,
  SendMessageResult,
  GetMessagesResult,
  GetConversationsResult,
  UpdateMessageStatusResult,
  MessagingState,
  MessagingError as MessagingErrorInterface,
  RetryConfig as RetryConfigInterface,
  MessageStatusUpdate,
  TypingIndicator,
  MessageEvent,
  MessageValidation,
  MessageStatus
} from '@/lib/types/messaging.types';

// Constants
export { MESSAGING_CONSTANTS, MESSAGE_STATUS_HIERARCHY } from '@/lib/types/messaging.types';