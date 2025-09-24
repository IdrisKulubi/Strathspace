'use server'

import db from "@/db/drizzle";
import { matches, messages, users, profiles } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, or, desc } from "drizzle-orm";
import { ActionResult } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { 
  withErrorHandling, 
  createMessagingError, 
  MessagingErrorType,
  ERROR_CODES 
} from "@/lib/utils/messaging-errors.utils";

/**
 * Get conversation details for a specific match
 * Validates user access and returns match and partner information
 */
export async function getConversationFromMatch(
  matchId: string
): Promise<ActionResult<{
  match: {
    id: string;
    user1Id: string;
    user2Id: string;
    createdAt: Date;
    updatedAt: Date;
  };
  partner: {
    id: string;
    name: string;
    image?: string | null;
    firstName?: string;
    lastName?: string;
    profilePhoto?: string | null;
    anonymous?: boolean;
    anonymousAvatar?: string | null;
  };
  conversationExists: boolean;
}>> {
  return withErrorHandling(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      throw createMessagingError(
        MessagingErrorType.AUTH_ERROR,
        "Authentication required",
        ERROR_CODES.UNAUTHORIZED_ACCESS
      );
    }

    // Get match details with user information
    const match = await db.query.matches.findFirst({
      where: and(
        eq(matches.id, matchId),
        or(
          eq(matches.user1Id, session.user.id),
          eq(matches.user2Id, session.user.id)
        )
      ),
      with: {
        user1: {
          columns: {
            id: true,
            name: true,
            image: true
          },
          with: {
            profile: {
              columns: {
                firstName: true,
                lastName: true,
                profilePhoto: true,
                anonymous: true,
                anonymousAvatar: true
              }
            }
          }
        },
        user2: {
          columns: {
            id: true,
            name: true,
            image: true
          },
          with: {
            profile: {
              columns: {
                firstName: true,
                lastName: true,
                profilePhoto: true,
                anonymous: true,
                anonymousAvatar: true
              }
            }
          }
        }
      }
    });

    if (!match) {
      throw createMessagingError(
        MessagingErrorType.PERMISSION_ERROR,
        "Match not found or unauthorized access",
        ERROR_CODES.MATCH_NOT_ACCESSIBLE
      );
    }

    // Determine partner based on current user
    const isUser1 = match.user1Id === session.user.id;
    const partnerUser = isUser1 ? match.user2 : match.user1;
    const partnerProfile = isUser1 ? match.user2.profile : match.user1.profile;

    // Check if conversation has any messages
    const messageCount = await db.query.messages.findMany({
      where: eq(messages.matchId, matchId),
      columns: { id: true },
      limit: 1
    });

    const partner = {
      id: partnerUser.id,
      name: partnerUser.name,
      image: partnerUser.image,
      firstName: partnerProfile?.firstName,
      lastName: partnerProfile?.lastName,
      profilePhoto: partnerProfile?.profilePhoto,
      anonymous: partnerProfile?.anonymous,
      anonymousAvatar: partnerProfile?.anonymousAvatar
    };

    return {
      match: {
        id: match.id,
        user1Id: match.user1Id,
        user2Id: match.user2Id,
        createdAt: match.createdAt,
        updatedAt: match.updatedAt
      },
      partner,
      conversationExists: messageCount.length > 0
    };
  }, 'getConversationFromMatch');
}

/**
 * Create a conversation from a match
 * This is called when users first navigate to messaging from a match
 */
export async function createConversationFromMatch(
  matchId: string
): Promise<ActionResult<{
  conversationId: string;
  partner: {
    id: string;
    name: string;
    image?: string | null;
  };
}>> {
  return withErrorHandling(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      throw createMessagingError(
        MessagingErrorType.AUTH_ERROR,
        "Authentication required",
        ERROR_CODES.UNAUTHORIZED_ACCESS
      );
    }

    // Verify match exists and user has access
    const conversationResult = await getConversationFromMatch(matchId);
    if (!conversationResult.success) {
      throw createMessagingError(
        MessagingErrorType.PERMISSION_ERROR,
        conversationResult.error || "Failed to access match",
        ERROR_CODES.MATCH_NOT_ACCESSIBLE
      );
    }

    const { match, partner } = conversationResult.data;

    // Update match timestamp to indicate conversation activity
    await db
      .update(matches)
      .set({ 
        updatedAt: new Date()
      })
      .where(eq(matches.id, matchId));

    // Revalidate relevant paths
    revalidatePath(`/chat/${matchId}`);
    revalidatePath('/chat');
    revalidatePath('/matches');

    return {
      conversationId: matchId, // In our system, matchId is the conversationId
      partner: {
        id: partner.id,
        name: partner.name,
        image: partner.image
      }
    };
  }, 'createConversationFromMatch');
}

/**
 * Get all matches that can be converted to conversations
 * Returns matches with basic partner information
 */
export async function getMatchesForMessaging(): Promise<ActionResult<Array<{
  matchId: string;
  partner: {
    id: string;
    name: string;
    image?: string | null;
    firstName?: string;
    lastName?: string;
    profilePhoto?: string | null;
    anonymous?: boolean;
    anonymousAvatar?: string | null;
  };
  hasMessages: boolean;
  lastMessageAt?: Date;
  createdAt: Date;
}>>> {
  return withErrorHandling(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      throw createMessagingError(
        MessagingErrorType.AUTH_ERROR,
        "Authentication required",
        ERROR_CODES.UNAUTHORIZED_ACCESS
      );
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
            image: true
          },
          with: {
            profile: {
              columns: {
                firstName: true,
                lastName: true,
                profilePhoto: true,
                anonymous: true,
                anonymousAvatar: true
              }
            }
          }
        },
        user2: {
          columns: {
            id: true,
            name: true,
            image: true
          },
          with: {
            profile: {
              columns: {
                firstName: true,
                lastName: true,
                profilePhoto: true,
                anonymous: true,
                anonymousAvatar: true
              }
            }
          }
        }
      },
      orderBy: [desc(matches.updatedAt)]
    });

    // Get match IDs to check for messages
    const matchIds = userMatches.map(match => match.id);
    
    if (matchIds.length === 0) {
      return [];
    }

    // Get latest message for each match to determine if conversation exists
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

    // Transform matches to messaging format
    const matchesForMessaging = userMatches.map(match => {
      const isUser1 = match.user1Id === session.user.id;
      const partnerUser = isUser1 ? match.user2 : match.user1;
      const partnerProfile = isUser1 ? match.user2.profile : match.user1.profile;
      const lastMessage = messagesByMatchId.get(match.id);

      return {
        matchId: match.id,
        partner: {
          id: partnerUser.id,
          name: partnerUser.name,
          image: partnerUser.image,
          firstName: partnerProfile?.firstName,
          lastName: partnerProfile?.lastName,
          profilePhoto: partnerProfile?.profilePhoto,
          anonymous: partnerProfile?.anonymous,
          anonymousAvatar: partnerProfile?.anonymousAvatar
        },
        hasMessages: !!lastMessage,
        lastMessageAt: lastMessage?.createdAt,
        createdAt: match.createdAt
      };
    });

    return matchesForMessaging;
  }, 'getMatchesForMessaging');
}

/**
 * Navigate from match to messaging
 * This function handles the transition from match view to messaging
 */
export async function navigateToMessaging(
  matchId: string
): Promise<ActionResult<{
  conversationId: string;
  redirectPath: string;
}>> {
  return withErrorHandling(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      throw createMessagingError(
        MessagingErrorType.AUTH_ERROR,
        "Authentication required",
        ERROR_CODES.UNAUTHORIZED_ACCESS
      );
    }

    // Verify match access and get conversation details
    const conversationResult = await getConversationFromMatch(matchId);
    if (!conversationResult.success) {
      throw createMessagingError(
        MessagingErrorType.PERMISSION_ERROR,
        conversationResult.error || "Failed to access match",
        ERROR_CODES.MATCH_NOT_ACCESSIBLE
      );
    }

    // Create/initialize conversation if needed
    const createResult = await createConversationFromMatch(matchId);
    if (!createResult.success) {
      throw createMessagingError(
        MessagingErrorType.DATABASE_ERROR,
        createResult.error || "Failed to initialize conversation",
        ERROR_CODES.MESSAGE_SEND_FAILED
      );
    }

    return {
      conversationId: matchId,
      redirectPath: `/chat/${matchId}`
    };
  }, 'navigateToMessaging');
}

/**
 * Check if user has access to a specific match
 * Used for authorization in messaging components
 */
export async function validateMatchAccess(
  matchId: string
): Promise<ActionResult<{
  hasAccess: boolean;
  match?: {
    id: string;
    user1Id: string;
    user2Id: string;
  };
}>> {
  return withErrorHandling(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        hasAccess: false
      };
    }

    const match = await db.query.matches.findFirst({
      where: and(
        eq(matches.id, matchId),
        or(
          eq(matches.user1Id, session.user.id),
          eq(matches.user2Id, session.user.id)
        )
      ),
      columns: {
        id: true,
        user1Id: true,
        user2Id: true
      }
    });

    return {
      hasAccess: !!match,
      match: match || undefined
    };
  }, 'validateMatchAccess');
}

/**
 * Get conversation statistics for a match
 * Returns message count, last activity, etc.
 */
export async function getConversationStats(
  matchId: string
): Promise<ActionResult<{
  messageCount: number;
  lastMessageAt?: Date;
  unreadCount: number;
  partnerName: string;
}>> {
  return withErrorHandling(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      throw createMessagingError(
        MessagingErrorType.AUTH_ERROR,
        "Authentication required",
        ERROR_CODES.UNAUTHORIZED_ACCESS
      );
    }

    // Validate access first
    const accessResult = await validateMatchAccess(matchId);
    if (!accessResult.success || !accessResult.data.hasAccess) {
      throw createMessagingError(
        MessagingErrorType.PERMISSION_ERROR,
        "Unauthorized access to match",
        ERROR_CODES.MATCH_NOT_ACCESSIBLE
      );
    }

    // Get conversation details
    const conversationResult = await getConversationFromMatch(matchId);
    if (!conversationResult.success) {
      throw createMessagingError(
        MessagingErrorType.DATABASE_ERROR,
        "Failed to get conversation details",
        ERROR_CODES.MESSAGE_SEND_FAILED
      );
    }

    const { partner } = conversationResult.data;

    // Get message statistics
    const allMessages = await db.query.messages.findMany({
      where: eq(messages.matchId, matchId),
      columns: {
        id: true,
        createdAt: true,
        senderId: true,
        status: true
      },
      orderBy: [desc(messages.createdAt)]
    });

    // Calculate unread count (messages not sent by current user that are unread)
    const unreadMessages = allMessages.filter(msg => 
      msg.senderId !== session.user.id && msg.status !== 'read'
    );

    const lastMessage = allMessages[0];

    return {
      messageCount: allMessages.length,
      lastMessageAt: lastMessage?.createdAt,
      unreadCount: unreadMessages.length,
      partnerName: partner.firstName || partner.name
    };
  }, 'getConversationStats');
}