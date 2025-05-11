import { z } from "zod";

// Define lifestyle attribute enums
export const drinkingPreferenceEnum = z.enum([
  "not_for_me", 
  "socially", 
  "frequently", 
  "prefer_not_to_say"
]);

export const workoutFrequencyEnum = z.enum([
  "never", 
  "sometimes", 
  "often", 
  "active"
]);

export const socialMediaUsageEnum = z.enum([
  "passive_scroller", 
  "active_poster", 
  "influencer", 
  "minimal"
]);

export const sleepingHabitsEnum = z.enum([
  "night_owl", 
  "early_bird", 
  "it_varies"
]);

export const profileSchema = z
  .object({
    photos: z
      .array(z.string().url())
      .min(1, "You must upload at least one photo"),
    bio: z
      .string()
      .trim()
      .min(10, "Tell us a bit more about yourself"),
    interests: z
      .array(z.string().min(1, "Interest cannot be empty"))
      .min(3, "Pick at least 3 vibes that match your energy "),
    lookingFor: z.enum(["friends", "dating", "both"], {
      required_error: "Tell us what you're looking for ",
    }),
    course: z
      .string()
      .trim()
      .min(1, "Don't be shy, tell us what you study ")
      .refine((course) => course.trim() !== "", {
        message: "Course cannot be empty"
      }),
    yearOfStudy: z
      .number()
      .min(1, "Year of study must be at least 1")
      .max(5, "Which year are you in? "),
    instagram: z
      .string()
      .nullable()
      .optional()
      .transform((val) => val?.trim() || ""),
    spotify: z
      .string()
      .nullable()
      .optional()
      .transform((val) => val?.trim() || ""),
    snapchat: z
      .string()
      .nullable()
      .optional()
      .transform((val) => val?.trim() || ""),
    gender: z.enum(["male", "female", "non-binary", "other"], {
      required_error: "Please select your gender ",
    }),
    phoneNumber: z
      .string()
      .trim()
      .regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number")
      .refine((phone) => {
        const digitsOnly = phone.replace(/[^0-9]/g, '');
        return digitsOnly.length >= 10 && digitsOnly.length <= 15;
      }, {
        message: "Phone number must be between 10 and 15 digits"
      }),
    age: z
      .number()
      .min(18, "You must be at least 18 years old")
      .max(25, "Age must be between 18 and 25 "),
    firstName: z
      .string()
      .trim()
      .min(2, "First name must be at least 2 characters")
      .max(50, "First name is too long")
      .refine((name) => name.trim() !== "", {
        message: "First name cannot be empty"
      }),
    lastName: z
      .string()
      .trim()
      .min(2, "Last name must be at least 2 characters")
      .max(50, "Last name is too long")
      .refine((name) => name.trim() !== "", {
        message: "Last name cannot be empty"
      }),
    profilePhoto: z
      .string()
      .url("Please provide a valid profile photo URL")
      .optional()
      .nullable()
      .transform((val) => val?.trim() || ""),
      
    // New optional lifestyle attributes
    drinkingPreference: drinkingPreferenceEnum.optional(),
    workoutFrequency: workoutFrequencyEnum.optional(),
    socialMediaUsage: socialMediaUsageEnum.optional(),
    sleepingHabits: sleepingHabitsEnum.optional(),
    
    // New personality attributes
    personalityType: z.string().optional(),
    communicationStyle: z.string().optional(),
    loveLanguage: z.string().optional(),
    zodiacSign: z.string().optional(),
    
    // Profile visibility and privacy settings
    visibilityMode: z.enum(["standard", "incognito"]).optional().default("standard"),
    incognitoMode: z.boolean().optional().default(false),
    discoveryPaused: z.boolean().optional().default(false),
    readReceiptsEnabled: z.boolean().optional().default(true),
    showActiveStatus: z.boolean().optional().default(true),
    
    // Username for profile sharing - must be unique when provided
    username: z.string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username is too long")
      .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, periods, underscores, and hyphens")
      .nullable()
      .optional()
      .transform((val) => val && val.trim() ? val.trim() : undefined),
  })
  .refine((data) => {
    return (
      data.photos.length > 0 &&
      data.photos.every(photo => photo.trim() !== "") &&
      data.bio?.trim() !== "" &&
      data.bio?.split(/\s+/).filter(Boolean).length >= 10 &&
      data.interests.length >= 3 &&
      data.lookingFor &&
      data.course.trim() !== "" &&
      data.yearOfStudy > 0 &&
      data.phoneNumber.trim() !== ""
    );
  }, "All required fields must be filled out properly");
