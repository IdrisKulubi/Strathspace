'use server'

import  db  from "@/db/drizzle";
import { messages } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and } from "drizzle-orm";
import { pusher } from "@/lib/pusher/server";

export async function getChatMessages(matchId: string) {
  const session = await auth();
  if (!session?.user?.id) return { messages: [], error: "Unauthorized" };

  try {
    const messageResults = await db.query.messages.findMany({
      where: eq(messages.matchId, matchId),
      orderBy: (msg, { desc }) => [desc(msg.createdAt)],
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

    return { 
      messages: messageResults.reverse(),
      error: null 
    };
  } catch (error) {
    console.error("Error fetching messages:", error);
    return { messages: [], error: "Failed to load messages" };
  }
}

export async function sendMessage(
  matchId: string,
  content: string,
  senderId: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: null, error: "Unauthorized" };
  }

  try {
    const [message] = await db
      .insert(messages)
      .values({
        id: crypto.randomUUID(),
        matchId,
        senderId,
        content,
        status: "delivered",
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    const matchDetails = await db.query.matches.findFirst({
      where: eq(messages.matchId, matchId),
      columns: { user1Id: true, user2Id: true },
    });

    if (matchDetails) {
      const eventName = "chatlist-update"; // Consistent event name
      const payload = { matchId, timestamp: new Date().toISOString(), senderId };
      try {
        await Promise.all([
          pusher.trigger(`private-user-${matchDetails.user1Id}-chatlist`, eventName, payload),
          pusher.trigger(`private-user-${matchDetails.user2Id}-chatlist`, eventName, payload)
        ]);
      } catch (pusherError) {
        console.error("Pusher trigger failed in sendMessage:", pusherError);
        // Log and continue, message sending itself succeeded.
      }
    }

    return { message, error: null };
  } catch (error) {
    console.error("Error sending message:", error);
    return { message: null, error: "Failed to send message" };
  }
}

export async function getMatchDetails(matchId: string, currentUserId: string) {
  const match = await db.query.matches.findFirst({
    where: (matches, { eq, and, or }) => and(
      eq(matches.id, matchId),
      or(
        eq(matches.user1Id, currentUserId),
        eq(matches.user2Id, currentUserId)
      )
    ),
    with: {
      user1: {
        columns: {
          id: true
        },
        with: {
          profile: true
        }
      },
      user2: {
        columns: {
          id: true
        },
        with: {
          profile: true
        }
      }
    }
  });

  if (!match) {
    throw new Error("Match not found or unauthorized");
  }

  // Determine partner based on current user
  const partner = match.user1.id === currentUserId 
    ? match.user2.profile 
    : match.user1.profile;

  return { match, partner };
}

export async function getUnreadCount(userId: string) {
  const session = await auth();
  if (!session?.user?.id) return 0;

  try {
    const result = await db.query.messages.findMany({
      where: (messages, { and, eq, not }) => and(
        eq(messages.matchId, userId),
        not(eq(messages.status, "read"))
      ),
    });

    return result.length;
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
}

export async function getChats() {
  console.time('getChats total execution');
  const session = await auth();
  if (!session?.user?.id) return [];

  try {
    // Optimized query to get matches with their participants and latest message in a single query
    console.time('getChats - optimized fetch');
    
    // First get all matches for the current user
    const matches = await db.query.matches.findMany({
      where: (matches, { or, eq }) => or(
        eq(matches.user1Id, session.user.id),
        eq(matches.user2Id, session.user.id)
      ),
      with: {
        user1: {
          with: {
            profile: {
              columns: {
                id: true,
                userId: true,
                profilePhoto: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        },
        user2: {
          with: {
            profile: {
              columns: {
                id: true,
                userId: true,
                profilePhoto: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        }
      }
    });
    
    // Get all match IDs to fetch messages in a single query
    const matchIds = matches.map(match => match.id);
    
    // Fetch the latest message for each match in a single query
    const latestMessages = await db.query.messages.findMany({
      where: (messages, { inArray }) => inArray(messages.matchId, matchIds),
      orderBy: (messages, { desc }) => [desc(messages.createdAt)],
    });
    
    // Create a map of matchId to latest message for quick lookup
    const messagesByMatchId = new Map();
    latestMessages.forEach(message => {
      if (!messagesByMatchId.has(message.matchId) || 
          new Date(message.createdAt) > new Date(messagesByMatchId.get(message.matchId).createdAt)) {
        messagesByMatchId.set(message.matchId, message);
      }
    });
    
    console.timeEnd('getChats - optimized fetch');

    // Transform to chat previews
    console.time('getChats - transform data');
    const chats = matches
      .filter(match => messagesByMatchId.has(match.id)) // Only include matches with messages
      .map(match => {
        const isUser1 = match.user1Id === session.user.id;
        const partner = isUser1 ? match.user2.profile : match.user1.profile;
        const lastMessage = messagesByMatchId.get(match.id);

        return {
          id: partner.id,
          userId: partner.userId,
          firstName: partner.firstName,
          lastName: partner.lastName,
          profilePhoto: partner.profilePhoto,
          matchId: match.id,
          lastMessage: {
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            isRead: lastMessage.status === "read",
            senderId: lastMessage.senderId
          }
        };
      })
      .sort((a, b) => {
        if (!a.lastMessage || !b.lastMessage) return 0;
        return new Date(b.lastMessage.createdAt).getTime() - 
               new Date(a.lastMessage.createdAt).getTime();
      });
    console.timeEnd('getChats - transform data');
    
    console.timeEnd('getChats total execution');
    return chats;
  } catch (error) {
    console.error("Error getting chats:", error);
    console.timeEnd('getChats total execution');
    return [];
  }
}

export async function markMessagesAsRead(matchId: string, userId: string) {
  try {
    await db.update(messages)
      .set({ status: 'read' })
      .where(
        and(
          eq(messages.matchId, matchId),
          eq(messages.senderId, userId),
          eq(messages.status, 'delivered')
        )
      );

    await pusher.trigger(`private-user-${userId}`, 'messages-read', { matchId });
    
    return { success: true };
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return { error: 'Failed to update read status' };
  }
} 