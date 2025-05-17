"use server";

import { eq, and, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { profiles, matches, messages } from "@/db/schema";
import { getCachedData, setCachedData, clearUserCache } from "@/lib/utils/redis-helpers";
import db from "@/db/drizzle";
import { AVATARS } from "@/lib/constants";
import { auth } from "@/auth";


export async function toggleAnonymousMode(enabled: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    await db.update(profiles)
      .set({ 
        anonymous: enabled,
        anonymousRevealRequested: enabled ? false : false
      })
      .where(eq(profiles.userId, session.user.id));
    
    // Clear cached user data
    await clearUserCache(session.user.id);
    
    revalidatePath("/app");
    revalidatePath("/explore");
    revalidatePath("/profile");
    
    return { success: true };
  } catch (error) {
    console.error("Error toggling anonymous mode:", error);
    return { error: "Failed to update anonymous mode" };
  }
}


export async function setAnonymousAvatar(avatarId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  
  if (!AVATARS.includes(avatarId)) {
    return { error: "Invalid avatar selection" };
  }

  try {
    // Update the profiles table (not users)
    await db.update(profiles)
      .set({ anonymousAvatar: avatarId })
      .where(eq(profiles.userId, session.user.id));
    
      await clearUserCache(session.user.id);
    revalidatePath("/profile");
    revalidatePath("/explore");
    
    return { success: true };
  } catch (error) {
    console.error("Error setting avatar:", error);
    return { error: "Failed to update avatar" };
  }
}


export async function requestRevealIdentity(matchId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    // Find the match
    const match = await db.query.matches.findFirst({
      where: and(
        eq(matches.id, matchId),
        or(
          eq(matches.user1Id, session.user.id),
          eq(matches.user2Id, session.user.id)
        )
      )
    });

    if (!match) return { error: "Match not found" };
    
    const otherUserId = match.user1Id === session.user.id ? match.user2Id : match.user1Id;
    
    await db.update(profiles)
      .set({ anonymousRevealRequested: true })
      .where(eq(profiles.userId, session.user.id));
    
    const otherUserProfile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, otherUserId),
      columns: { anonymousRevealRequested: true }
    });
    
    const mutualReveal = otherUserProfile?.anonymousRevealRequested === true;
    
    if (mutualReveal) {
   
      await db.insert(messages).values({
        content: "🎭 Both users have agreed to reveal their identities! Profile photos are now visible.",
        matchId: matchId,
        senderId: session.user.id, 
        status: "sent",
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    await clearUserCache(session.user.id);
    revalidatePath(`/chat/${matchId}`);
    
    return { 
      success: true, 
      mutualReveal 
    };
  } catch (error) {
    console.error("Error requesting identity reveal:", error);
    return { error: "Failed to process reveal request" };
  }
}


export async function getIcebreakerPrompts() {
  const CACHE_KEY = "icebreaker_prompts";
  
  const cached = await getCachedData<string[]>(CACHE_KEY);
  if (cached) return cached;
  
  const prompts = [
    "What's your favorite spot on campus?",
    "Coffee or tea? And where's the best place to get it near Strathmore?",
    "What's one Strathmore tradition everyone should experience?",
    "Library or Union - where do you spend more time?",
    "What's your go-to Strathmore Union snack?",
    "If you could change one thing about campus, what would it be?",
    "What's your favorite course you've taken so far?",
    "Early bird or night owl for studying?",
    "What's your ideal weekend in Glasgow look like?",
    "If you could have dinner with any Strathclyde professor, who would it be?"
  ];
  
  // Cache for future use
  await setCachedData(CACHE_KEY, prompts, 86400); // Cache for 24 hours
  
  return prompts;
}

export async function isAnonymousMatch(matchId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  
  try {
    const match = await db.query.matches.findFirst({
      where: eq(matches.id, matchId),
      with: {
        user1: { 
          with: {
            profile: {
              columns: { anonymous: true }
            }
          }
        },
        user2: { 
          with: {
            profile: {
              columns: { anonymous: true }
            }
          }
        }
      }
    });
    
    if (!match) return { error: "Match not found" };
    
    // A match is anonymous if both users have anonymous mode enabled in their profiles
    const isAnonymous = match.user1.profile?.anonymous && match.user2.profile?.anonymous;
    
    return { 
      success: true,
      isAnonymous
    };
  } catch (error) {
    console.error("Error checking anonymous match:", error);
    return { error: "Failed to check match status" };
  }
}

/**
 * Get random icebreaker prompt
 */
export async function getRandomIcebreaker() {
  try {
    const prompts = await getIcebreakerPrompts();
    const randomIndex = Math.floor(Math.random() * prompts.length);
    return { 
      success: true,
      prompt: prompts[randomIndex]
    };
  } catch (error) {
    console.error("Error getting random icebreaker:", error);
    return { error: "Failed to get icebreaker prompt" };
  }
} 