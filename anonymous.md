# Anonymous Mode with Profile Blurring

## Feature Overview

Anonymous Mode allows users to interact on the platform with enhanced privacy:

- **Profile Blurring**: User photos are blurred/hidden and replaced with fun avatars
- **Matched Privacy**: Anonymous users only see and match with other anonymous users
- **Selective Information**: Basic interests and details remain visible but personally identifiable information is anonymized
- **Icebreaker Chat**: Text-only chat with guided prompts for safer initial conversations
- **Mutual Reveal**: Option to reveal full identity after mutual consent

## Implementation Steps

### 1. Database Schema Updates

```typescript
// Add to user schema in drizzle
anonymous: boolean().default(false),
anonymousAvatar: varchar(50).nullable(),
anonymousRevealRequested: boolean().default(false),
```

### 2. Server Actions Implementation

Create a new file `src/lib/actions/anonymous.actions.ts`:

```typescript
"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getRedisInstance } from "@/lib/redis";
import { db } from "@/db";
import { users, matches, chats } from "@/db/schema";
import { getCachedData, setCachedData, clearUserCache } from "@/lib/utils/redis-helpers";
import { getAuthUserId } from "@/lib/auth/helpers";
import { AVATARS } from "@/lib/constants";

// Toggle anonymous mode for a user
export async function toggleAnonymousMode(enabled: boolean) {
  const userId = await getAuthUserId();
  if (!userId) return { error: "Unauthorized" };

  try {
    await db.update(users)
      .set({ 
        anonymous: enabled,
        // Reset reveal request when disabling anonymous mode
        anonymousRevealRequested: enabled ? false : false
      })
      .where(eq(users.id, userId));
    
    // Clear cached user data
    await clearUserCache(userId);
    
    revalidatePath("/app");
    revalidatePath("/profile");
    
    return { success: true };
  } catch (error) {
    console.error("Error toggling anonymous mode:", error);
    return { error: "Failed to update anonymous mode" };
  }
}

// Set anonymous avatar
export async function setAnonymousAvatar(avatarId: string) {
  const userId = await getAuthUserId();
  if (!userId) return { error: "Unauthorized" };
  
  if (!AVATARS.includes(avatarId)) {
    return { error: "Invalid avatar selection" };
  }

  try {
    await db.update(users)
      .set({ anonymousAvatar: avatarId })
      .where(eq(users.id, userId));
    
    await clearUserCache(userId);
    revalidatePath("/profile");
    
    return { success: true };
  } catch (error) {
    console.error("Error setting avatar:", error);
    return { error: "Failed to update avatar" };
  }
}

// Request to reveal identity
export async function requestRevealIdentity(matchId: string) {
  const userId = await getAuthUserId();
  if (!userId) return { error: "Unauthorized" };

  try {
    // Find the match
    const match = await db.query.matches.findFirst({
      where: and(
        eq(matches.id, matchId),
        or(
          eq(matches.userId1, userId),
          eq(matches.userId2, userId)
        )
      )
    });

    if (!match) return { error: "Match not found" };
    
    // Get the other user's ID
    const otherUserId = match.userId1 === userId ? match.userId2 : match.userId1;
    
    // Update user's reveal request status
    await db.update(users)
      .set({ anonymousRevealRequested: true })
      .where(eq(users.id, userId));
    
    // Check if both users have requested a reveal
    const otherUser = await db.query.users.findFirst({
      where: eq(users.id, otherUserId),
      columns: { anonymousRevealRequested: true }
    });
    
    const mutualReveal = otherUser?.anonymousRevealRequested === true;
    
    if (mutualReveal) {
      // Create a reveal notification in the chat
      await db.insert(chats).values({
        matchId: matchId,
        senderId: "system",
        message: "🎭 Both users have agreed to reveal their identities! Profile photos are now visible.",
        isSystem: true,
        createdAt: new Date()
      });
    }
    
    await clearUserCache(userId);
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

// Get icebreaker prompts
export async function getIcebreakerPrompts() {
  const CACHE_KEY = "icebreaker_prompts";
  
  // Try to get from cache first
  const cached = await getCachedData<string[]>(CACHE_KEY);
  if (cached) return cached;
  
  // Default prompts if not in cache
  const prompts = [
    "What's your favorite spot on campus?",
    "Coffee or tea? And where's the best place to get it near Strathclyde?",
    "What's one Strathclyde tradition everyone should experience?",
    "Library or Union - where do you spend more time?",
    "What's your go-to Strathclyde Union snack?",
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
```

### 3. Frontend Components

Create a new file `src/components/anonymous/AnonymousToggle.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { 
  toggleAnonymousMode,
  setAnonymousAvatar 
} from "@/lib/actions/anonymous.actions";
import { Icons } from "@/components/ui/icons";
import { toast } from "sonner";

export function AnonymousToggle({ 
  initialState = false,
  currentAvatar = null 
}: { 
  initialState?: boolean;
  currentAvatar?: string | null;
}) {
  const [isAnonymous, setIsAnonymous] = useState(initialState);
  const [isPending, setIsPending] = useState(false);
  
  const handleToggle = async (checked: boolean) => {
    setIsPending(true);
    
    try {
      const result = await toggleAnonymousMode(checked);
      
      if (result.error) {
        toast.error(result.error);
        return;
      }
      
      setIsAnonymous(checked);
      toast.success(checked ? 
        "Anonymous mode enabled! Your profile is now private." : 
        "Anonymous mode disabled. Your profile is now visible."
      );
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsPending(false);
    }
  };
  
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold">Anonymous Mode</h2>
          <p className="text-sm text-muted-foreground">
            Hide your identity and only match with other anonymous users
          </p>
        </div>
        <Switch
          checked={isAnonymous}
          onCheckedChange={handleToggle}
          disabled={isPending}
        />
      </div>
      
      {isAnonymous && <AvatarSelector currentAvatar={currentAvatar} />}
    </div>
  );
}

function AvatarSelector({ currentAvatar }: { currentAvatar: string | null }) {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);
  const [isPending, setIsPending] = useState(false);
  
  const avatars = [
    "heart", "ghost", "robot", "alien", "unicorn", 
    "tardis", "book", "coffee", "star", "music"
  ];
  
  const handleSelectAvatar = async (avatar: string) => {
    setIsPending(true);
    
    try {
      const result = await setAnonymousAvatar(avatar);
      
      if (result.error) {
        toast.error(result.error);
        return;
      }
      
      setSelectedAvatar(avatar);
      toast.success("Avatar updated successfully!");
    } catch (error) {
      toast.error("Failed to update avatar");
    } finally {
      setIsPending(false);
    }
  };
  
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Select your anonymous avatar</h3>
      <div className="grid grid-cols-5 gap-2">
        {avatars.map((avatar) => (
          <button
            key={avatar}
            className={`p-2 rounded-md border ${
              selectedAvatar === avatar 
                ? "border-primary bg-primary/10" 
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => handleSelectAvatar(avatar)}
            disabled={isPending}
          >
            <div className="w-10 h-10 flex items-center justify-center">
              <Icons.avatars[avatar] className="w-8 h-8" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

Create `src/components/anonymous/RevealRequestButton.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from "@/components/ui/alert-dialog";
import { Icons } from "@/components/ui/icons";
import { requestRevealIdentity } from "@/lib/actions/anonymous.actions";
import { toast } from "sonner";

export function RevealRequestButton({ 
  matchId,
  hasRequested = false,
}: { 
  matchId: string;
  hasRequested?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(hasRequested);
  const [isPending, setIsPending] = useState(false);
  
  const handleRequest = async () => {
    setIsPending(true);
    
    try {
      const result = await requestRevealIdentity(matchId);
      
      if (result.error) {
        toast.error(result.error);
        setOpen(false);
        return;
      }
      
      setRequested(true);
      
      if (result.mutualReveal) {
        toast.success("Profiles revealed! You both can now see each other's photos.");
      } else {
        toast.success("Request sent! Waiting for the other person to agree.");
      }
      
      setOpen(false);
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsPending(false);
    }
  };
  
  return (
    <>
      <Button
        variant={requested ? "outline" : "default"}
        size="sm"
        onClick={() => setOpen(true)}
        disabled={requested}
        className="gap-1.5"
      >
        {requested ? (
          <>
            <Icons.check className="w-3.5 h-3.5" />
            Requested
          </>
        ) : (
          <>
            <Icons.eye className="w-3.5 h-3.5" />
            Reveal Identity
          </>
        )}
      </Button>
      
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reveal your identity?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send a request to reveal your profile photo and identity.
              Your profile will only be revealed if both you and your match agree.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRequest} disabled={isPending}>
              {isPending ? (
                <>
                  <Icons.spinner className="w-4 h-4 mr-2 animate-spin" />
                  Requesting...
                </>
              ) : (
                "Send Request"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

### 4. Constants and Types

Add to `src/lib/constants.ts`:

```typescript
export const AVATARS = [
  "heart", "ghost", "robot", "alien", "unicorn", 
  "tardis", "book", "coffee", "star", "music"
];
```

### 5. Middleware Updates

Ensure the matching algorithm in `explore.actions.ts` filters for anonymous users when anonymous mode is enabled:

```typescript
// Add this logic to the getSwipableProfiles function
if (currentUser.anonymous) {
  // Only include anonymous users in the results
  baseQuery = baseQuery.where(eq(users.anonymous, true));
} else {
  // Non-anonymous users only see other non-anonymous users
  baseQuery = baseQuery.where(eq(users.anonymous, false));
}
```

### 6. Icebreaker Integration

Add the icebreaker functionality to chat UI components to display prompts for anonymous users.

## Features

1. **Enhanced Privacy**
   - Profile photos are hidden or blurred
   - Customizable avatars including Strathspace-themed options
   - Text-only initial conversations

2. **Matched Experience**
   - Anonymous users only see other anonymous users
   - Basic information like interests and "vibe" remains visible
   - Real names replaced with usernames or initials

3. **Icebreaker Chat System**
   - Pre-set prompts specific to Strathclyde campus life
   - Text-only "Icebreaker Zone" for initial conversations
   - Safety-focused communication

4. **Mutual Reveal System**
   - "Reveal Now" option requires both users to consent
   - Gradual transition from anonymous to identified
   - System notifications when reveals are complete

## Benefits for Campus Users

- Provides privacy for students concerned about being seen by classmates
- Creates a playful, mysterious experience like a "digital masquerade ball"
- Encourages meaningful conversations based on interests rather than appearance
- Aligns with Gen Z privacy concerns while maintaining an inclusive platform
- Perfect for campus events like Freshers' Week

## Integration Points

1. **Profile Settings**: Add Anonymous Mode toggle in user settings
2. **Matching Algorithm**: Update to filter for anonymous/non-anonymous users
3. **Chat Interface**: Add Icebreaker prompt system for anonymous chats
4. **Profile Cards**: Update to show avatars instead of photos for anonymous users
5. **Reveal System**: Implement mutual consent mechanism for identity reveals
