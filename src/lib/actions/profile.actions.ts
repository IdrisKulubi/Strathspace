"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import { Profile, profiles, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { profileSchema } from "../validators";
import { deleteUploadThingFile } from "./upload.actions";
import { getRedisInstance } from "@/lib/redis";
import { getCachedData, setCachedData } from "../utils/redis-helpers";
import { prefetchProfileImages } from "@/lib/actions/image-prefetch";

/**
 * Invalidate profile cache when profile is updated
 */
async function invalidateProfileCache(userId: string) {
  try {
    const redis = getRedisInstance();
    if (redis) {
      // Delete profile cache
      await (await redis).del(`profile:${userId}`);
    }
    
    // Revalidate the profile page
    revalidatePath("/profile");
  } catch (error) {
    console.error("Error invalidating profile cache:", error);
    // Continue even if cache invalidation fails
  }
}

export type ProfileFormData = {
  photos: string[];
  bio: string;
  interests: string[];
  lookingFor: "friends" | "dating" | "both";
  course: string;
  yearOfStudy: number;
  instagram?: string;
  spotify?: string;
  snapchat?: string;
  gender: "male" | "female" | "non-binary" | "other";
  age: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  profilePhoto?: string;
  
  // New lifestyle attributes
  drinkingPreference?: "not_for_me" | "socially" | "frequently" | "prefer_not_to_say";
  workoutFrequency?: "never" | "sometimes" | "often" | "active";
  socialMediaUsage?: "passive_scroller" | "active_poster" | "influencer" | "minimal";
  sleepingHabits?: "night_owl" | "early_bird" | "it_varies";
  
  // New personality attributes
  personalityType?: string;
  communicationStyle?: string;
  loveLanguage?: string;
  zodiacSign?: string;
  
  // Profile visibility and privacy settings
  visibilityMode?: "standard" | "incognito";
  incognitoMode?: boolean;
  discoveryPaused?: boolean;
  readReceiptsEnabled?: boolean;
  showActiveStatus?: boolean;
  
  // Username for profile sharing
  username?: string;
};

// Add these cache keys
const CACHE_KEYS = {
  PROFILE: (userId: string) => `profile:${userId}`,
  PROFILE_PHOTOS: (userId: string) => `profile:${userId}:photos`,
} as const;

export async function getProfile() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    const cached = await getCachedData<Profile>(
      CACHE_KEYS.PROFILE(session.user.id)
    );

    // Validate cached profile structure
    if (cached && isValidProfile(cached)) {
      if (cached.photos?.length) {
        await prefetchProfileImages(cached.photos);
      }
      return cached;
    }

    // Find user by email with all user fields
    const user = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phoneNumber: users.phoneNumber,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastActive: users.lastActive,
        isOnline: users.isOnline,
        photos: users.image,
      })
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!user || user.length === 0) {
      console.error("User not found by email:", session.user.email);
      return null;
    }

    const actualUserId = user[0].id;

    // Get complete profile data
    const profile = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, actualUserId))
      .limit(1);

    // If no profile exists yet, return basic user info
    if (!profile || profile.length === 0) {
      return {
        ...user[0],
        profilePhoto: user[0].photos,
        profileCompleted: false,
      };
    }

    // Combine user and profile data
    const combinedProfile = {
      ...user[0],
      ...profile[0],
      profilePhoto: profile[0].profilePhoto || user[0].photos,
      profileCompleted: Boolean(
        profile[0].firstName &&
          profile[0].lastName &&
          profile[0].bio &&
          profile[0].age &&
          profile[0].gender &&
          profile[0].lookingFor &&
          profile[0].course &&
          profile[0].yearOfStudy &&
          profile[0].photos &&
          profile[0].isVisible &&
          profile[0].lastActive &&
          profile[0].isComplete
      ),
    };

    // Cache validated profile
    await setCachedData(
      CACHE_KEYS.PROFILE(session.user.id),
      combinedProfile,
      300
    );

    if (combinedProfile.photos?.length) {
      await prefetchProfileImages(combinedProfile.photos);
    }

    return combinedProfile;
  } catch (error) {
    console.error("Error in getProfile:", error);
    throw error;
  }
}

// Validation helper
function isValidProfile(profile: unknown): profile is Profile {
  return (
    typeof profile === "object" &&
    profile !== null &&
    "id" in profile &&
    "userId" in profile &&
    "firstName" in profile &&
    "lastName" in profile
  );
}

export async function updateProfile(data: ProfileFormData) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return { success: false, error: "Not authenticated" };
    }

    // Find user by email
    const user = await db
      .select({
        id: users.id,
        email: users.email,
        phoneNumber: users.phoneNumber,
      })
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!user || user.length === 0) {
      return { success: false, error: "User not found" };
    }

    const actualUserId = user[0].id;

    // Transform social fields and username before validation
    const processedData = {
      ...data,
      instagram: data.instagram ?? "",
      spotify: data.spotify ?? "",
      snapchat: data.snapchat ?? "",
      username: data.username?.trim() || undefined, // Ensure empty/null username becomes undefined
    };

    // Validate the processed data
    const validatedData = await profileSchema.safeParseAsync(processedData);
    if (!validatedData.success) {
      console.error("Validation errors:", validatedData.error);
      return {
        success: false,
        error: "Check your phone number  😢",
      };
    }

    // Update the profile using validated data
    const updatedProfile = await db
      .update(profiles)
      .set({
        firstName: processedData.firstName,
        lastName: processedData.lastName,
        phoneNumber: processedData.phoneNumber,
        bio: processedData.bio,
        interests: processedData.interests,
        lookingFor: processedData.lookingFor,
        course: processedData.course,
        yearOfStudy: processedData.yearOfStudy,
        instagram: processedData.instagram,
        spotify: processedData.spotify,
        snapchat: processedData.snapchat,
        gender: processedData.gender,
        age: processedData.age,
        photos: processedData.photos,
        profilePhoto: processedData.profilePhoto,
        updatedAt: new Date(),
        
        // New lifestyle attributes
        drinkingPreference: processedData.drinkingPreference,
        workoutFrequency: processedData.workoutFrequency,
        socialMediaUsage: processedData.socialMediaUsage,
        sleepingHabits: processedData.sleepingHabits,
        
        // New personality attributes
        personalityType: processedData.personalityType,
        communicationStyle: processedData.communicationStyle,
        loveLanguage: processedData.loveLanguage,
        zodiacSign: processedData.zodiacSign,
        
        // Profile visibility and privacy settings
        visibilityMode: processedData.visibilityMode || "standard",
        incognitoMode: processedData.incognitoMode || false,
        discoveryPaused: processedData.discoveryPaused || false,
        readReceiptsEnabled: processedData.readReceiptsEnabled !== undefined 
          ? processedData.readReceiptsEnabled 
          : true,
        showActiveStatus: processedData.showActiveStatus !== undefined 
          ? processedData.showActiveStatus 
          : true,
          
        // Username (if provided)
        ...(processedData.username && { username: processedData.username }),
      })
      .where(eq(profiles.userId, actualUserId))
      .returning();

    // Invalidate cache if present
    await invalidateProfileCache(actualUserId);

    if (!updatedProfile || updatedProfile.length === 0) {
      return { success: false, error: "Failed to update profile" };
    }

    return { success: true };
  } catch (error) {
    console.error("Profile update error:", error);
    return {
      success: false,
      error: "An error occurred while updating your profile",
    };
  }
}

export async function submitProfile(data: ProfileFormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Validate data against schema
    const validationResult = profileSchema.safeParse(data);
    if (!validationResult.success) {
      console.error("Validation errors:", validationResult.error);
      return {
        success: false,
        error: "Invalid profile data",
        validationErrors: validationResult.error.errors,
      };
    }

    // First check if profile exists
    const existingProfile = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, session.user.id))
      .limit(1);

    const profileData = {
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      photos: data.photos,
      bio: data.bio,
      interests: data.interests,
      lookingFor: data.lookingFor,
      course: data.course,
      yearOfStudy: data.yearOfStudy,
      instagram: data.instagram || "",
      spotify: data.spotify || "",
      snapchat: data.snapchat || "",
      gender: data.gender,
      age: data.age,
      profilePhoto: data.profilePhoto || data.photos[0],
      updatedAt: new Date(),
      profileCompleted: true,
      isComplete: true,
      
      // Include new fields
      drinkingPreference: data.drinkingPreference,
      workoutFrequency: data.workoutFrequency,
      socialMediaUsage: data.socialMediaUsage,
      sleepingHabits: data.sleepingHabits,
      personalityType: data.personalityType,
      communicationStyle: data.communicationStyle,
      loveLanguage: data.loveLanguage,
      zodiacSign: data.zodiacSign,
      visibilityMode: data.visibilityMode || "standard",
      incognitoMode: data.incognitoMode || false,
      discoveryPaused: data.discoveryPaused || false,
      readReceiptsEnabled: data.readReceiptsEnabled !== undefined 
        ? data.readReceiptsEnabled 
        : true,
      showActiveStatus: data.showActiveStatus !== undefined 
        ? data.showActiveStatus 
        : true,
      username: data.username?.trim() || undefined, // Ensure empty/null username becomes undefined
    };

    // Create or update profile
    if (!existingProfile || existingProfile.length === 0) {
      // Create new profile
      await db.insert(profiles).values({
        ...profileData,
        userId: session.user.id,
        isVisible: true,
        lastActive: new Date(),
      });
    } else {
      // Update existing profile
      await db
        .update(profiles)
        .set(profileData)
        .where(eq(profiles.userId, session.user.id));
    }

    // Invalidate any cached data
    await invalidateProfileCache(session.user.id);

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Error creating/updating profile:", error);
    return {
      success: false,
      error: "An error occurred while saving profile",
    };
  }
}

export async function updateProfilePhoto(photoUrl: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    await db
      .update(profiles)
      .set({ profilePhoto: photoUrl })
      .where(eq(profiles.userId, session.user.id));

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Error updating profile photo:", error);
    return {
      success: false,
      error: "Failed to update profile photo. Please try again 😢",
    };
  }
}

export async function removePhoto(photoUrl: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    const profile = await getProfile();
    if (!profile) {
      return {
        success: false,
        error: "Profile not found",
      };
    }

    // Ensure at least one photo remains
    if (!Array.isArray(profile.photos) || profile.photos.length <= 1) {
      return {
        success: false,
        error: "You must keep at least one photo 📸",
      };
    }

    const updatedPhotos = profile.photos.filter((p: string) => p !== photoUrl);
    await db
      .update(profiles)
      .set({ photos: updatedPhotos })
      .where(eq(profiles.userId, session.user.id));

    // Delete the photo from storage
    await deleteUploadThingFile(photoUrl);

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Error removing photo:", error);
    return {
      success: false,
      error: "Failed to remove photo. Please try again😢",
    };
  }
}
