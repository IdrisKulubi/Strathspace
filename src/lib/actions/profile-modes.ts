"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import { profiles, profileModes, type Profile } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type ProfileMode = "dating" | "friends";

interface ProfileModeStatus {
  datingEnabled: boolean;
  friendsEnabled: boolean;
  datingProfileCompleted: boolean;
  friendsProfileCompleted: boolean;
}

export async function getProfileModes(userId: string): Promise<ProfileModeStatus | null> {
  const modes = await db.query.profileModes.findFirst({
    where: eq(profileModes.userId, userId),
  });

  return modes || null;
}

export async function toggleProfileMode(mode: ProfileMode) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const userId = session.user.id;
  
  // Get or create profile modes
  let userModes = await db.query.profileModes.findFirst({
    where: eq(profileModes.userId, userId),
  });

  if (!userModes) {
    [userModes] = await db
      .insert(profileModes)
      .values({
        userId,
        datingEnabled: mode === "dating",
        friendsEnabled: mode === "friends",
      })
      .returning();
  } else {
    // Toggle the specified mode
    [userModes] = await db
      .update(profileModes)
      .set({
        datingEnabled: mode === "dating" ? !userModes.datingEnabled : userModes.datingEnabled,
        friendsEnabled: mode === "friends" ? !userModes.friendsEnabled : userModes.friendsEnabled,
        updatedAt: new Date(),
      })
      .where(eq(profileModes.userId, userId))
      .returning();
  }

  revalidatePath("/profile");
  return userModes;
}

export async function updateProfileCompletion(mode: ProfileMode, isCompleted: boolean) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const userId = session.user.id;
  
  // Get or create profile modes
  let userModes = await db.query.profileModes.findFirst({
    where: eq(profileModes.userId, userId),
  });

  if (!userModes) {
    [userModes] = await db
      .insert(profileModes)
      .values({
        userId,
        datingProfileCompleted: mode === "dating" ? isCompleted : false,
        friendsProfileCompleted: mode === "friends" ? isCompleted : false,
      })
      .returning();
  } else {
    // Update completion status for the specified mode
    [userModes] = await db
      .update(profileModes)
      .set({
        datingProfileCompleted: mode === "dating" ? isCompleted : userModes.datingProfileCompleted,
        friendsProfileCompleted: mode === "friends" ? isCompleted : userModes.friendsProfileCompleted,
        updatedAt: new Date(),
      })
      .where(eq(profileModes.userId, userId))
      .returning();
  }

  revalidatePath("/profile");
  return userModes;
}

export async function checkProfileRequirements(profile: Profile, mode: ProfileMode): Promise<boolean> {
  // Common required fields for both modes
  const commonFields = [
    profile.firstName,
    profile.lastName,
    profile.bio,
    profile.age,
    profile.gender,
    profile.course,
    profile.yearOfStudy,
    profile.profilePhoto,
    profile.interests?.length > 0,
  ];

  // Check if any common field is missing
  if (commonFields.some((field) => !field)) {
    return false;
  }

  if (mode === "dating") {
    // Additional dating-specific requirements
    const datingFields = [
      profile.lookingFor,
      profile.relationshipGoals,
      profile.personalityType,
      profile.communicationStyle,
    ];
    return datingFields.every((field) => !!field);
  } else {
    // Additional friends/study-specific requirements
    const friendsFields = [
      profile.studyPreferences,
      profile.academicFocus,
      profile.studyAvailability?.length > 0,
    ];
    return friendsFields.every((field) => !!field);
  }
} 