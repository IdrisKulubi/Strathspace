// Validation schemas for messaging operations

import { z } from "zod";

// Message content validation
export const messageContentSchema = z
  .string()
  .trim()
  .min(1, "Message cannot be empty")
  .max(1000, "Message is too long (max 1000 characters)")
  .refine(
    (content) => content.replace(/\s+/g, ' ').trim().length > 0,
    "Message cannot contain only whitespace"
  );

// UUID validation helper
const uuidSchema = z
  .string()
  .uuid("Invalid ID format");

// Send message validation
export const sendMessageSchema = z.object({
  matchId: uuidSchema.describe("Match ID"),
  content: messageContentSchema.describe("Message content")
});

// Get messages validation
export const getMessagesSchema = z.object({
  matchId: uuidSchema.describe("Match ID"),
  limit: z
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(50)
    .describe("Number of messages to fetch"),
  before: z
    .string()
    .datetime("Invalid cursor format")
    .optional()
    .describe("Cursor for pagination (ISO datetime string)")
});

// Update message status validation
export const updateMessageStatusSchema = z.object({
  messageId: uuidSchema.describe("Message ID"),
  status: z
    .enum(['delivered', 'read'], {
      errorMap: () => ({ message: "Status must be 'delivered' or 'read'" })
    })
    .describe("New message status")
});

// Mark conversation as read validation
export const markConversationAsReadSchema = z.object({
  matchId: uuidSchema.describe("Match ID")
});

// Form data validation for server actions
export const sendMessageFormSchema = z.object({
  matchId: z
    .string()
    .min(1, "Match ID is required")
    .uuid("Invalid match ID format"),
  content: messageContentSchema
});

// Bulk message operations validation
export const bulkUpdateMessagesSchema = z.object({
  messageIds: z
    .array(uuidSchema)
    .min(1, "At least one message ID is required")
    .max(50, "Cannot update more than 50 messages at once"),
  status: z.enum(['delivered', 'read'])
});

// Pagination parameters validation
export const paginationSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .optional(),
  cursor: z
    .string()
    .datetime()
    .optional()
});

// Search messages validation
export const searchMessagesSchema = z.object({
  matchId: uuidSchema,
  query: z
    .string()
    .trim()
    .min(1, "Search query cannot be empty")
    .max(100, "Search query is too long"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20)
});

// Message filtering validation
export const messageFilterSchema = z.object({
  matchId: uuidSchema.optional(),
  senderId: uuidSchema.optional(),
  status: z.enum(['sending', 'sent', 'delivered', 'read', 'failed']).optional(),
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
  hasAttachments: z.boolean().optional()
}).refine(
  (data) => {
    if (data.fromDate && data.toDate) {
      return data.fromDate <= data.toDate;
    }
    return true;
  },
  {
    message: "From date must be before or equal to to date",
    path: ["fromDate"]
  }
);

// Conversation settings validation
export const conversationSettingsSchema = z.object({
  matchId: uuidSchema,
  settings: z.object({
    notifications: z.boolean().default(true),
    readReceipts: z.boolean().default(true),
    typing: z.boolean().default(true)
  })
});

// Export types inferred from schemas
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type GetMessagesInput = z.infer<typeof getMessagesSchema>;
export type UpdateMessageStatusInput = z.infer<typeof updateMessageStatusSchema>;
export type MarkConversationAsReadInput = z.infer<typeof markConversationAsReadSchema>;
export type SendMessageFormInput = z.infer<typeof sendMessageFormSchema>;
export type BulkUpdateMessagesInput = z.infer<typeof bulkUpdateMessagesSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchMessagesInput = z.infer<typeof searchMessagesSchema>;
export type MessageFilterInput = z.infer<typeof messageFilterSchema>;
export type ConversationSettingsInput = z.infer<typeof conversationSettingsSchema>;

// Validation helper functions
export function validateMessageContent(content: string): { isValid: boolean; error?: string } {
  try {
    messageContentSchema.parse(content);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        isValid: false, 
        error: error.errors[0]?.message || "Invalid message content" 
      };
    }
    return { isValid: false, error: "Validation failed" };
  }
}

export function validateUUID(id: string): { isValid: boolean; error?: string } {
  try {
    uuidSchema.parse(id);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        isValid: false, 
        error: error.errors[0]?.message || "Invalid ID format" 
      };
    }
    return { isValid: false, error: "Validation failed" };
  }
}

export function validatePagination(params: unknown): { 
  isValid: boolean; 
  data?: PaginationInput; 
  error?: string 
} {
  try {
    const data = paginationSchema.parse(params);
    return { isValid: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        isValid: false, 
        error: error.errors.map(e => e.message).join(", ")
      };
    }
    return { isValid: false, error: "Validation failed" };
  }
}

// Custom validation rules
export const customValidationRules = {
  // Check if message content is not just emojis or special characters
  hasSubstantiveContent: (content: string): boolean => {
    const textOnly = content.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
    return textOnly.trim().length > 0;
  },

  // Check if message is not spam (repeated characters)
  isNotSpam: (content: string): boolean => {
    const repeatedPattern = /(.)\1{10,}/; // More than 10 repeated characters
    return !repeatedPattern.test(content);
  },

  // Check if message doesn't contain too many line breaks
  hasReasonableFormatting: (content: string): boolean => {
    const lineBreaks = (content.match(/\n/g) || []).length;
    return lineBreaks <= 10; // Max 10 line breaks
  },

  // Validate message rate limiting (client-side check)
  isWithinRateLimit: (lastMessageTime: Date, minInterval: number = 1000): boolean => {
    return Date.now() - lastMessageTime.getTime() >= minInterval;
  }
};

// Comprehensive message validation
export function validateMessageComprehensive(
  content: string,
  options: {
    checkSubstantive?: boolean;
    checkSpam?: boolean;
    checkFormatting?: boolean;
  } = {}
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Basic validation
  const basicValidation = validateMessageContent(content);
  if (!basicValidation.isValid && basicValidation.error) {
    errors.push(basicValidation.error);
  }

  // Additional validations
  if (options.checkSubstantive && !customValidationRules.hasSubstantiveContent(content)) {
    errors.push("Message must contain meaningful text content");
  }

  if (options.checkSpam && !customValidationRules.isNotSpam(content)) {
    errors.push("Message appears to be spam (too many repeated characters)");
  }

  if (options.checkFormatting && !customValidationRules.hasReasonableFormatting(content)) {
    errors.push("Message has too many line breaks");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}