'use server'

import { randomUUID } from "crypto";
import db from "@/db/drizzle";
import { matches, messages, users } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, or, desc, asc, lt, gt, not } from "drizzle-orm";
import { z } from "zod";
import { ActionResult } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { 
  withErrorHandling, 
  createMessagingError, 
  MessagingErrorType,
  ERROR_CODES 
} from "@/lib/utils/messaging-errors.utils";

// Enhanced TypeScript types for messaging
export interface MessageWithSender {
  id: string;
  content: string;
  matchId: string;
  senderId: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  sender: {
    id: string;
    name: string;
    image?: string | null;
  };
  // Client-side only fields
  isRetrying?: boolean;
  localId?: string;
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

// Validation schemas
const sendMessageSchema = z.object({
  matchId: z.string().min(1, "Match ID is required"),
  content: z.string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(1000, "Message is too long (max 1000 characters)")
});

const getMessagesSchema = z.object({
  matchId: z.string().uuid("Invalid match ID"),
  limit: z.number().min(1).max(100).default(50),
  before: z.string().optional(), // cursor for pagination
});

const updateMessageStatusSchema = z.object({
  messageId: z.string().uuid("Invalid message ID"),
  status: z.enum(['delivered', 'read'])
});

// Database query utilities
export async function validateUserAccess(matchId: string, userId: string): Promise<boolean> {
  try {
    const match = await db.query.matches.findFirst({
      where: and(
        eq(matches.id, matchId),
        or(
          eq(matches.user1Id, userId),
          eq(matches.user2Id, userId)
        )
      ),
      columns: { id: true }
    });
    
    return !!match;
  } catch (error) {
    console.error("Error validating user access:", error);
    return false;
  }
}

/**
 * Enhanced validation that also returns match details
 */
export async function validateUserMatchAccess(matchId: string, userId: string): Promise<{
  hasAccess: boolean;
  match?: {
    id: string;
    user1Id: string;
    user2Id: string;
    createdAt: Date;
    updatedAt: Date;
  };
}> {
  try {
    const match = await db.query.matches.findFirst({
      where: and(
        eq(matches.id, matchId),
        or(
          eq(matches.user1Id, userId),
          eq(matches.user2Id, userId)
        )
      ),
      columns: {
        id: true,
        user1Id: true,
        user2Id: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    return {
      hasAccess: !!match,
      match: match || undefined
    };
  } catch (error) {
    console.error("Error validating user match access:", error);
    return { hasAccess: false };
  }
}

// Enhanced server actions with proper error handling and validation

/**
 * Send a new message in a conversation
 */
export async function sendMessage(
  formData: FormData
): Promise<ActionResult<MessageWithSender>> {
  return withErrorHandling(async () => {
    console.log('🔧 SendMessage server action called');
    
    const session = await auth();
    console.log('🔧 Session check:', { hasSession: !!session, userId: session?.user?.id });
    
    if (!session?.user?.id) {
      console.log('❌ No session or user ID');
      throw createMessagingError(
        MessagingErrorType.AUTH_ERROR,
        "Authentication required",
        ERROR_CODES.UNAUTHORIZED_ACCESS
      );
    }

    // Extract and validate form data
    const rawData = {
      matchId: formData.get('matchId') as string,
      content: formData.get('content') as string,
    };
    
    console.log('🔧 Raw form data:', { 
      matchId: rawData.matchId, 
      contentLength: rawData.content?.length,
      formDataKeys: Array.from(formData.keys())
    });

    let validatedData;
    try {
      validatedData = sendMessageSchema.parse(rawData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw createMessagingError(
          MessagingErrorType.VALIDATION_ERROR,
          error.errors.map(e => e.message).join(", "),
          ERROR_CODES.INVALID_MESSAGE_CONTENT
        );
      }
      throw error;
    }

    // Verify user has access to this match
    const hasAccess = await validateUserAccess(validatedData.matchId, session.user.id);
    if (!hasAccess) {
      throw createMessagingError(
        MessagingErrorType.PERMISSION_ERROR,
        "Unauthorized access to conversation",
        ERROR_CODES.MATCH_NOT_ACCESSIBLE
      );
    }

    // Insert message into database
    let newMessage;
    try {
      console.log('🔧 Inserting message into database:', {
        matchId: validatedData.matchId,
        senderId: session.user.id,
        contentLength: validatedData.content.length
      });
      
      // Generate a UUID for the message ID
      const messageId = randomUUID();
      
      [newMessage] = await db
        .insert(messages)
        .values({
          id: messageId,
          matchId: validatedData.matchId,
          senderId: session.user.id,
          content: validatedData.content,
          status: 'sent'
          // Let createdAt and updatedAt use their default values
        })
        .returning();
        
      console.log('🔧 Message inserted successfully:', { id: newMessage.id });
    } catch (error) {
      console.error('🔧 Database insert error:', error);
      throw createMessagingError(
        MessagingErrorType.DATABASE_ERROR,
        `Failed to save message to database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ERROR_CODES.MESSAGE_SEND_FAILED
      );
    }

    // Get sender information for the response
    const sender = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        id: true,
        name: true,
        image: true
      }
    });

    if (!sender) {
      throw createMessagingError(
        MessagingErrorType.DATABASE_ERROR,
        "Sender information not found",
        ERROR_CODES.MESSAGE_SEND_FAILED
      );
    }

    const messageWithSender: MessageWithSender = {
      ...newMessage,
      status: newMessage.status as 'sent',
      sender
    };

    // Update match timestamp
    try {
      console.log('🔧 Updating match timestamp...');
      await db
        .update(matches)
        .set({ 
          lastMessageAt: new Date()
          // Let updatedAt use its default value
        })
        .where(eq(matches.id, validatedData.matchId));
      console.log('🔧 Match timestamp updated successfully');
    } catch (error) {
      // Non-critical error - message was sent successfully
      console.warn("Failed to update match timestamp:", error);
    }

    // Revalidate relevant paths
    try {
      revalidatePath(`/chat/${validatedData.matchId}`);
      revalidatePath('/chat');
    } catch (error) {
      // Non-critical error - message was sent successfully
      console.warn("Failed to revalidate paths:", error);
    }

    return messageWithSender;
  }, 'sendMessage');
}

/**
 * Alternative sendMessage function with direct parameters
 */
export async function sendMessageAction(
  matchId: string,
  content: string
): Promise<ActionResult<MessageWithSender>> {
  const formData = new FormData();
  formData.append('matchId', matchId);
  formData.append('content', content);
  
  return sendMessage(formData);
}

/**
 * Get messages for a conversation with pagination
 */
export async function getMessages(
  matchId: string,
  limit: number = 50,
  before?: string
): Promise<ActionResult<PaginatedMessages>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Authentication required"
      };
    }

    // Validate input
    const validatedData = getMessagesSchema.parse({ matchId, limit, before });

    // Verify user has access to this match
    const hasAccess = await validateUserAccess(validatedData.matchId, session.user.id);
    if (!hasAccess) {
      return {
        success: false,
        error: "Unauthorized access to conversation"
      };
    }

    // Build query conditions
    let whereConditions = eq(messages.matchId, validatedData.matchId);
    
    if (validatedData.before) {
      // For cursor-based pagination, get messages before the cursor
      whereConditions = and(
        whereConditions,
        lt(messages.createdAt, new Date(validatedData.before))
      );
    }

    // Fetch messages with sender information
    const messageResults = await db.query.messages.findMany({
      where: whereConditions,
      orderBy: [desc(messages.createdAt)],
      limit: validatedData.limit + 1, // Fetch one extra to check if there are more
      with: {
        sender: {
          columns: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });

    // Check if there are more messages
    const hasMore = messageResults.length > validatedData.limit;
    const messages_to_return = hasMore ? messageResults.slice(0, -1) : messageResults;

    // Reverse to get chronological order (oldest first)
    const orderedMessages = messages_to_return.reverse();

    // Get total count for this conversation
    const totalCountResult = await db.query.messages.findMany({
      where: eq(messages.matchId, validatedData.matchId),
      columns: { id: true }
    });

    const result: PaginatedMessages = {
      messages: orderedMessages.map(msg => ({
        ...msg,
        status: msg.status as 'sent' | 'delivered' | 'read'
      })),
      hasMore,
      nextCursor: hasMore ? messageResults[messageResults.length - 2]?.createdAt.toISOString() : undefined,
      totalCount: totalCountResult.length
    };

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error("Error fetching messages:", error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => e.message).join(", ")
      };
    }

    return {
      success: false,
      error: "Failed to load messages. Please try again."
    };
  }
}

/**
 * Get user's conversations with last message and unread count
 */
export async function getConversations(): Promise<ActionResult<ConversationPreview[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Authentication required"
      };
    }

    // Get all matches for the current user
    const userMatches = await db.query.matches.findMany({
      where: or(
        eq(matches.user1Id, session.user.id),
        eq(matches.user2Id, session.user.id)
      ),
      with: {
        user1: {
          columns: {
            id: true,
            name: true,
            image: true,
            isOnline: true
          }
        },
        user2: {
          columns: {
            id: true,
            name: true,
            image: true,
            isOnline: true
          }
        }
      },
      orderBy: [desc(matches.lastMessageAt)]
    });

    // Get match IDs to fetch latest messages and unread counts
    const matchIds = userMatches.map(match => match.id);
    
    if (matchIds.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    // Get latest message for each match
    const latestMessages = await db.query.messages.findMany({
      where: (messages, { inArray }) => inArray(messages.matchId, matchIds),
      orderBy: [desc(messages.createdAt)]
    });

    // Create map of latest messages by match ID
    const messagesByMatchId = new Map<string, typeof latestMessages[0]>();
    latestMessages.forEach(message => {
      if (!messagesByMatchId.has(message.matchId) || 
          new Date(message.createdAt) > new Date(messagesByMatchId.get(message.matchId)!.createdAt)) {
        messagesByMatchId.set(message.matchId, message);
      }
    });

    // Get unread counts for each match
    const unreadCounts = new Map<string, number>();
    for (const matchId of matchIds) {
      const unreadMessages = await db.query.messages.findMany({
        where: and(
          eq(messages.matchId, matchId),
          eq(messages.status, 'sent'), // Unread messages have 'sent' status
          // Only count messages not sent by current user
          not(eq(messages.senderId, session.user.id))
        ),
        columns: { id: true }
      });
      unreadCounts.set(matchId, unreadMessages.length);
    }

    // Transform to conversation previews
    const conversations: ConversationPreview[] = userMatches
      .filter(match => messagesByMatchId.has(match.id)) // Only include matches with messages
      .map(match => {
        const isUser1 = match.user1Id === session.user.id;
        const otherUser = isUser1 ? match.user2 : match.user1;
        const lastMessage = messagesByMatchId.get(match.id);
        const unreadCount = unreadCounts.get(match.id) || 0;

        return {
          matchId: match.id,
          otherUser: {
            id: otherUser.id,
            name: otherUser.name,
            image: otherUser.image,
            isOnline: otherUser.isOnline || false
          },
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            content: lastMessage.content,
            senderId: lastMessage.senderId,
            createdAt: lastMessage.createdAt,
            status: lastMessage.status as 'sent' | 'delivered' | 'read'
          } : undefined,
          unreadCount,
          updatedAt: match.updatedAt || match.createdAt
        };
      })
      .sort((a, b) => {
        // Sort by last message time, most recent first
        const aTime = a.lastMessage?.createdAt || a.updatedAt;
        const bTime = b.lastMessage?.createdAt || b.updatedAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

    return {
      success: true,
      data: conversations
    };

  } catch (error) {
    console.error("Error fetching conversations:", error);
    return {
      success: false,
      error: "Failed to load conversations. Please try again."
    };
  }
}

/**
 * Update message status (for read receipts)
 */
export async function updateMessageStatus(
  messageId: string,
  status: 'delivered' | 'read'
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Authentication required"
      };
    }

    // Validate input
    const validatedData = updateMessageStatusSchema.parse({ messageId, status });

    // Get the message to verify access
    const message = await db.query.messages.findFirst({
      where: eq(messages.id, validatedData.messageId),
      with: {
        sender: {
          columns: { id: true }
        }
      }
    });

    if (!message) {
      return {
        success: false,
        error: "Message not found"
      };
    }

    // Verify user has access to this message's match
    const hasAccess = await validateUserAccess(message.matchId, session.user.id);
    if (!hasAccess) {
      return {
        success: false,
        error: "Unauthorized access"
      };
    }

    // Don't allow users to update status of their own messages
    if (message.senderId === session.user.id) {
      return {
        success: false,
        error: "Cannot update status of your own messages"
      };
    }

    // Only allow status progression (sent -> delivered -> read)
    const currentStatus = message.status as 'sent' | 'delivered' | 'read';
    const statusOrder = { 'sent': 0, 'delivered': 1, 'read': 2 };
    
    if (statusOrder[validatedData.status] <= statusOrder[currentStatus]) {
      // Status is not progressing, but this is not an error - just return success
      return {
        success: true,
        data: { success: true }
      };
    }

    // Update message status
    await db
      .update(messages)
      .set({ 
        status: validatedData.status,
        updatedAt: new Date()
      })
      .where(eq(messages.id, validatedData.messageId));

    // Revalidate relevant paths
    revalidatePath(`/chat/${message.matchId}`);

    return {
      success: true,
      data: { success: true }
    };

  } catch (error) {
    console.error("Error updating message status:", error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => e.message).join(", ")
      };
    }

    return {
      success: false,
      error: "Failed to update message status. Please try again."
    };
  }
}

/**
 * Mark all messages in a conversation as read
 */
export async function markConversationAsRead(
  matchId: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Authentication required"
      };
    }

    // Verify user has access to this match
    const hasAccess = await validateUserAccess(matchId, session.user.id);
    if (!hasAccess) {
      return {
        success: false,
        error: "Unauthorized access to conversation"
      };
    }

    // Mark all unread messages as read (only messages not sent by current user)
    await db
      .update(messages)
      .set({ 
        status: 'read'
        // Let updatedAt use its default value
      })
      .where(
        and(
          eq(messages.matchId, matchId),
          eq(messages.status, 'sent'), // Only update unread messages
          not(eq(messages.senderId, session.user.id)) // Don't mark own messages as read
        )
      );

    // Revalidate relevant paths
    revalidatePath(`/chat/${matchId}`);
    revalidatePath('/chat');

    return {
      success: true,
      data: { success: true }
    };

  } catch (error) {
    console.error("Error marking conversation as read:", error);
    return {
      success: false,
      error: "Failed to mark messages as read. Please try again."
    };
  }
}

/**
 * Batch update message statuses for multiple messages
 * Used during periodic fetches to sync status updates efficiently
 */
export async function batchUpdateMessageStatuses(
  updates: Array<{ messageId: string; status: 'delivered' | 'read' }>
): Promise<ActionResult<{ updatedCount: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Authentication required"
      };
    }

    if (updates.length === 0) {
      return {
        success: true,
        data: { updatedCount: 0 }
      };
    }

    let updatedCount = 0;

    // Process updates in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      for (const update of batch) {
        try {
          // Validate each update
          const validatedData = updateMessageStatusSchema.parse(update);
          
          // Get the message to verify access and current status
          const message = await db.query.messages.findFirst({
            where: eq(messages.id, validatedData.messageId),
            columns: {
              id: true,
              matchId: true,
              senderId: true,
              status: true
            }
          });

          if (!message) {
            continue; // Skip if message not found
          }

          // Verify user has access to this message's match
          const hasAccess = await validateUserAccess(message.matchId, session.user.id);
          if (!hasAccess) {
            continue; // Skip if no access
          }

          // Don't allow users to update status of their own messages
          if (message.senderId === session.user.id) {
            continue; // Skip own messages
          }

          // Only allow status progression
          const currentStatus = message.status as 'sent' | 'delivered' | 'read';
          const statusOrder = { 'sent': 0, 'delivered': 1, 'read': 2 };
          
          if (statusOrder[validatedData.status] <= statusOrder[currentStatus]) {
            continue; // Skip if not progressing
          }

          // Update message status
          await db
            .update(messages)
            .set({ 
              status: validatedData.status,
              updatedAt: new Date()
            })
            .where(eq(messages.id, validatedData.messageId));

          updatedCount++;

        } catch (updateError) {
          console.error(`Error updating message ${update.messageId}:`, updateError);
          // Continue with other updates
        }
      }
    }

    return {
      success: true,
      data: { updatedCount }
    };

  } catch (error) {
    console.error("Error batch updating message statuses:", error);
    return {
      success: false,
      error: "Failed to update message statuses. Please try again."
    };
  }
}

/**
 * Auto-mark messages as delivered when they are fetched by the recipient
 * This simulates delivery receipts in a polling-based system
 */
export async function markMessagesAsDelivered(
  matchId: string
): Promise<ActionResult<{ deliveredCount: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Authentication required"
      };
    }

    // Verify user has access to this match
    const hasAccess = await validateUserAccess(matchId, session.user.id);
    if (!hasAccess) {
      return {
        success: false,
        error: "Unauthorized access to conversation"
      };
    }

    // Mark messages as delivered (only messages sent by other user that are still 'sent')
    const result = await db
      .update(messages)
      .set({ 
        status: 'delivered',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(messages.matchId, matchId),
          eq(messages.status, 'sent'),
          (messages, { not, eq }) => not(eq(messages.senderId, session.user.id))
        )
      )
      .returning({ id: messages.id });

    return {
      success: true,
      data: { deliveredCount: result.length }
    };

  } catch (error) {
    console.error("Error marking messages as delivered:", error);
    return {
      success: false,
      error: "Failed to mark messages as delivered. Please try again."
    };
  }
}