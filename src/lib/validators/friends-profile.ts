import { z } from "zod";

export const friendsProfileSchema = z.object({
  // Basic Info (Required)
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  bio: z.string().min(30, "Bio must be at least 30 characters"),
  age: z.number().min(18, "Must be at least 18").max(25, "Must be 25 or younger"),
  gender: z.string().min(1, "Please select your gender"),
  course: z.string().min(1, "Please enter your course"),
  yearOfStudy: z.number().min(1, "Please select your year of study").max(5),
  
  // Study Preferences (Required)
  studyPreferences: z.object({
    preferredStudyTime: z.string().min(1, "Please select your preferred study time"),
    studyStyle: z.string().min(1, "Please select your study style"),
    subjectInterests: z.array(z.string()).min(1, "Please select at least one subject"),
    groupSize: z.string().min(1, "Please select preferred group size"),
    academicGoals: z.array(z.string()).min(1, "Please select at least one goal"),
  }),
  academicFocus: z.string().min(1, "Please specify your academic focus"),
  studyAvailability: z.array(z.string()).min(1, "Please select at least one availability slot"),
  projectInterests: z.array(z.string()).min(1, "Please select at least one project interest"),
  
  // General Interests (Required)
  interests: z.array(z.string()).min(3, "Please select at least 3 interests"),
  
  // Photos (Optional)
  photos: z.array(z.string()).optional(),
  profilePhoto: z.string().optional(),
  
  // Social Media (Optional)
  instagram: z.string().optional(),
  spotify: z.string().optional(),
  snapchat: z.string().optional(),
});

export type FriendsProfileFormData = z.infer<typeof friendsProfileSchema>; 