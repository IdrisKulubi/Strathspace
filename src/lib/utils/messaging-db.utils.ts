// Database query utilities for messaging operations

import db from "@/db/drizzle";
import { matches, messages, users } from "@/db/schema";
import { eq, and, or, desc, asc, lt, gt, count, inArray, not } from "drizzle-orm";
import type { MessageWithSender, ConversationPreview } from "@/lib/types/messaging.types";

/**
 * Validate if a user has access to a specific match/conversation
 */
export async function validateUserMatchAccess(
  matchId: string, 
  userId: string
): Promise<boolean> {
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
    console.error("Error validating user match access:", error);
    return false;
  }
}

/**
 * Get match details with participant information
 */
export async function getMatchWithParticipants(matchId: string) {
  try {
    const match = await db.query.matches.findFirst({
      where: eq(matches.id, matchId),
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
      }
    });

    return match;
  } catch (error) {
    console.error("Error fetching match with participants:", error);
    return null;
  }
}

/**
 * Get messages for a conversation with efficient pagination
 */
export async function getConversationMessages(
  matchId: string,
  limit: number = 50,
  beforeCursor?: string
) {
  try {
    // Build where conditions
    let whereConditions = eq(messages.matchId, matchId);
    
    if (beforeCursor) {
      whereConditions = and(
        whereConditions,
        lt(messages.createdAt, new Date(beforeCursor))
      );
    }

    // Fetch messages with sender information
    const messageResults = await db.query.messages.findMany({
      where: whereConditions,
      orderBy: [desc(messages.createdAt)],
      limit: limit + 1, // Fetch one extra to check if there are more
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
    const hasMore = messageResults.length > limit;
    const messagesToReturn = hasMore ? messageResults.slice(0, -1) : messageResults;

    // Reverse to get chronological order (oldest first)
    const orderedMessages = messagesToReturn.reverse();

    return {
      messages: orderedMessages as MessageWithSender[],
      hasMore,
      nextCursor: hasMore ? messageResults[messageResults.length - 2]?.createdAt.toISOString() : undefined
    };
  } catch (error) {
    console.error("Error fetching conversation messages:", error);
    return {
      messages: [],
      hasMore: false,
      nextCursor: undefined
    };
  }
}

/**
 * Get total message count for a conversation
 */
export async function getConversationMessageCount(matchId: string): Promise<number> {
  try {
    const result = await db
      .select({ count: count() })
      .from(messages)
      .where(eq(messages.matchId, matchId));

    return result[0]?.count || 0;
  } catch (error) {
    console.error("Error getting conversation message count:", error);
    return 0;
  }
}

/**
 * Get unread message count for a specific match and user
 */
export async function getUnreadMessageCount(
  matchId: string, 
  userId: string
): Promise<number> {
  try {
    const result = await db
      .select({ count: count() })
      .from(messages)
      .where(
        and(
          eq(messages.matchId, matchId),
          eq(messages.status, 'sent'), // Unread messages have 'sent' status
          not(eq(messages.senderId, userId)) // Don't count user's own messages
        )
      );

    return result[0]?.count || 0;
  } catch (error) {
    console.error("Error getting unread message count:", error);
    return 0;
  }
}

/**
 * Get all unread message counts for a user across all conversations
 */
export async function getAllUnreadCounts(userId: string): Promise<Map<string, number>> {
  try {
    // First get all matches for the user
    const userMatches = await db.query.matches.findMany({
      where: or(
        eq(matches.user1Id, userId),
        eq(matches.user2Id, userId)
      ),
      columns: { id: true }
    });

    const matchIds = userMatches.map(match => match.id);
    const unreadCounts = new Map<string, number>();

    if (matchIds.length === 0) {
      return unreadCounts;
    }

    // Get unread counts for each match in a single query
    const unreadMessages = await db
      .select({
        matchId: messages.matchId,
        count: count()
      })
      .from(messages)
      .where(
        and(
          inArray(messages.matchId, matchIds),
          eq(messages.status, 'sent'),
          not(eq(messages.senderId, userId))
        )
      )
      .groupBy(messages.matchId);

    // Convert to map
    unreadMessages.forEach(({ matchId, count }) => {
      unreadCounts.set(matchId, count);
    });

    return unreadCounts;
  } catch (error) {
    console.error("Error getting all unread counts:", error);
    return new Map();
  }
}

/**
 * Get latest message for each conversation
 */
export async function getLatestMessagesForMatches(
  matchIds: string[]
): Promise<Map<string, MessageWithSender>> {
  try {
    if (matchIds.length === 0) {
      return new Map();
    }

    const latestMessages = await db.query.messages.findMany({
      where: inArray(messages.matchId, matchIds),
      orderBy: [desc(messages.createdAt)],
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

    // Create map of latest messages by match ID
    const messagesByMatchId = new Map<string, MessageWithSender>();
    latestMessages.forEach(message => {
      if (!messagesByMatchId.has(message.matchId) || 
          new Date(message.createdAt) > new Date(messagesByMatchId.get(message.matchId)!.createdAt)) {
        messagesByMatchId.set(message.matchId, message as MessageWithSender);
      }
    });

    return messagesByMatchId;
  } catch (error) {
    console.error("Error getting latest messages for matches:", error);
    return new Map();
  }
}

/**
 * Insert a new message with proper error handling
 */
export async function insertMessage(
  matchId: string,
  senderId: string,
  content: string
) {
  try {
    const [newMessage] = await db
      .insert(messages)
      .values({
        matchId,
        senderId,
        content,
        status: 'sent',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return newMessage;
  } catch (error) {
    console.error("Error inserting message:", error);
    throw new Error("Failed to insert message");
  }
}

/**
 * Update message status with validation
 */
export async function updateMessageStatus(
  messageId: string,
  status: 'delivered' | 'read'
) {
  try {
    const [updatedMessage] = await db
      .update(messages)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(messages.id, messageId))
      .returning();

    return updatedMessage;
  } catch (error) {
    console.error("Error updating message status:", error);
    throw new Error("Failed to update message status");
  }
}

/**
 * Update match timestamp when a new message is sent
 */
export async function updateMatchTimestamp(matchId: string) {
  try {
    await db
      .update(matches)
      .set({ 
        lastMessageAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(matches.id, matchId));
  } catch (error) {
    console.error("Error updating match timestamp:", error);
    // Don't throw here as this is not critical for message sending
  }
}

/**
 * Mark multiple messages as read in a conversation
 */
export async function markConversationMessagesAsRead(
  matchId: string,
  userId: string
) {
  try {
    const updatedMessages = await db
      .update(messages)
      .set({ 
        status: 'read',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(messages.matchId, matchId),
          eq(messages.status, 'sent'), // Only update unread messages
          not(eq(messages.senderId, userId)) // Don't update user's own messages
        )
      )
      .returning({ id: messages.id });

    return updatedMessages.length;
  } catch (error) {
    console.error("Error marking conversation messages as read:", error);
    throw new Error("Failed to mark messages as read");
  }
}

/**
 * Get conversation participants for a match
 */
export async function getConversationParticipants(matchId: string) {
  try {
    const match = await db.query.matches.findFirst({
      where: eq(matches.id, matchId),
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
      }
    });

    if (!match) {
      return null;
    }

    return {
      user1: match.user1,
      user2: match.user2
    };
  } catch (error) {
    console.error("Error getting conversation participants:", error);
    return null;
  }
}

/**
 * Check if a message exists and get its details
 */
export async function getMessageById(messageId: string) {
  try {
    const message = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
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

    return message as MessageWithSender | undefined;
  } catch (error) {
    console.error("Error getting message by ID:", error);
    return undefined;
  }
}

/**
 * Get recent messages across all conversations for a user (for notifications)
 */
export async function getRecentMessagesForUser(
  userId: string,
  limit: number = 10
): Promise<MessageWithSender[]> {
  try {
    // Get user's matches
    const userMatches = await db.query.matches.findMany({
      where: or(
        eq(matches.user1Id, userId),
        eq(matches.user2Id, userId)
      ),
      columns: { id: true }
    });

    const matchIds = userMatches.map(match => match.id);

    if (matchIds.length === 0) {
      return [];
    }

    // Get recent messages from all conversations
    const recentMessages = await db.query.messages.findMany({
      where: and(
        inArray(messages.matchId, matchIds),
        not(eq(messages.senderId, userId)) // Exclude user's own messages
      ),
      orderBy: [desc(messages.createdAt)],
      limit,
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

    return recentMessages as MessageWithSender[];
  } catch (error) {
    console.error("Error getting recent messages for user:", error);
    return [];
  }
}