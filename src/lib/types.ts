export interface Profile {
  firstName: string;
  lastName: string;
  course: string;
  yearOfStudy: number;
  bio: string;
  gender: string;
  location: string;
  interests: string[];
  userId: string;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  phoneNumber: string;
  dateOfBirth: Date;
  profilePhoto: string | null;
  
}
export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Re-export messaging types for convenience
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
  MessageStatus
} from './types/messaging.types';

