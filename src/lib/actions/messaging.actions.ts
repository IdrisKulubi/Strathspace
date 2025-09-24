'use server'

import db from "@/db/drizzle";
import { matches, messages, users } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, or, desc, asc, lt, gt } from "drizzle-orm";
import { z } from "zod";
import { ActionResult } from "@/lib/types";
import { revalidatePath } from "next/cache";

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
  matchId: z.string().uuid("Invalid match ID"),
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

// Enhanced server actions with proper error handling and validation

/**
 * Send a new message in a conversation
 */
export async function sendMessage(
  formData: FormData
): Promise<ActionResult<MessageWithSender>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Authentication required"
      };
    }

    // Extract and validate form data
    const rawData = {
      matchId: formData.get('matchId') as string,
      content: formData.get('content') as string,
    };

    const validatedData = sendMessageSchema.parse(rawData);

    // Verify user has access to this match
    const hasAccess = await validateUserAccess(validatedData.matchId, session.user.id);
    if (!hasAccess) {
      return {
        success: false,
        error: "Unauthorized access to conversation"
      };
    }

    // Insert message into database
    const [newMessage] = await db
      .insert(messages)
      .values({
        matchId: validatedData.matchId,
        senderId: session.user.id,
        content: validatedData.content,
        status: 'sent',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

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
      return {
        success: false,
        error: "Sender information not found"
      };
    }

    const messageWithSender: MessageWithSender = {
      ...newMessage,
      status: newMessage.status as 'sent',
      sender
    };

    // Update match timestamp
    await db
      .update(matches)
      .set({ 
        lastMessageAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(matches.id, validatedData.matchId));

    // Revalidate relevant paths
    revalidatePath(`/chat/${validatedData.matchId}`);
    revalidatePath('/chat');

    return {
      success: true,
      data: messageWithSender
    };

  } catch (error) {
    console.error("Error sending message:", error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => e.message).join(", ")
      };
    }

    return {
      success: false,
      error: "Failed to send message. Please try again."
    };
  }
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
          (messages, { not, eq }) => not(eq(messages.senderId, session.user.id))
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
        status: 'read',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(messages.matchId, matchId),
          eq(messages.status, 'sent'), // Only update unread messages
          (messages, { not, eq }) => not(eq(messages.senderId, session.user.id))
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