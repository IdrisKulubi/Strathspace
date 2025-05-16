import { ProfileFormData } from "../constants";

// Define sections and their weights in the overall completion percentage
export const PROFILE_SECTIONS = {
  photos: { weight: 20, min: 1 },        // 20% if at least 1 photo
  bio: { weight: 15, min: 10 },          // 15% if bio has at least 10 words
  interests: { weight: 15, min: 3 },     // 15% if at least 3 interests selected
  basicInfo: { weight: 20 },             // 20% for name, age, gender, etc.
  courseInfo: { weight: 10 },            // 10% for course and year
  lifestyle: { weight: 10 },             // 10% for lifestyle attributes (to be added)
  personalityInfo: { weight: 5 },        // 5% for personality attributes
  socialLinks: { weight: 5 },            // 5% for social links
};

// Type for incomplete sections
export type IncompleteSection = {
  id: string;
  label: string;
  completed: boolean;
  weight: number;
};

/**
 * Calculate the profile completion percentage and identify incomplete sections
 */
export function calculateProfileCompletion(profile: Partial<ProfileFormData>): {
  percentage: number;
  incompleteSections: IncompleteSection[];
} {
  let completionScore = 0;
  const incompleteSections: IncompleteSection[] = [];

  // Photos section
  const hasPhotos = profile.photos && profile.photos.length >= PROFILE_SECTIONS.photos.min;
  completionScore += hasPhotos ? PROFILE_SECTIONS.photos.weight : 0;
  
  if (!hasPhotos) {
    incompleteSections.push({
      id: "photos",
      label: "Add Photos",
      completed: false,
      weight: PROFILE_SECTIONS.photos.weight,
    });
  }

  // Bio section
  const hasBio = profile.bio && profile.bio.split(/\s+/).filter(Boolean).length >= PROFILE_SECTIONS.bio.min;
  completionScore += hasBio ? PROFILE_SECTIONS.bio.weight : 0;
  
  if (!hasBio) {
    incompleteSections.push({
      id: "bio",
      label: "Complete Bio",
      completed: false,
      weight: PROFILE_SECTIONS.bio.weight,
    });
  }

  // Interests section
  const hasInterests = profile.interests && profile.interests.length >= PROFILE_SECTIONS.interests.min;
  completionScore += hasInterests ? PROFILE_SECTIONS.interests.weight : 0;
  
  if (!hasInterests) {
    incompleteSections.push({
      id: "interests",
      label: "Add Interests",
      completed: false,
      weight: PROFILE_SECTIONS.interests.weight,
    });
  }

  // Basic info section
  const hasBasicInfo = !!(
    profile.firstName && 
    profile.lastName && 
    profile.age && 
    profile.gender && 
    profile.phoneNumber
  );
  
  completionScore += hasBasicInfo ? PROFILE_SECTIONS.basicInfo.weight : 0;
  
  if (!hasBasicInfo) {
    incompleteSections.push({
      id: "basicInfo",
      label: "Basic Information",
      completed: false,
      weight: PROFILE_SECTIONS.basicInfo.weight,
    });
  }

  // Course info section
  const hasCourseInfo = !!(
    profile.course && 
    profile.yearOfStudy && 
    profile.lookingFor
  );
  
  completionScore += hasCourseInfo ? PROFILE_SECTIONS.courseInfo.weight : 0;
  
  if (!hasCourseInfo) {
    incompleteSections.push({
      id: "courseInfo",
      label: "Course & Preferences",
      completed: false,
      weight: PROFILE_SECTIONS.courseInfo.weight,
    });
  }

  // Lifestyle attributes section
  const hasLifestyleAttributes = !!(
    profile.drinkingPreference || 
    profile.workoutFrequency || 
    profile.socialMediaUsage || 
    profile.sleepingHabits
  );
  
  // Award points proportionally based on how many lifestyle attributes are filled
  let lifestyleCompletionPercent = 0;
  if (profile.drinkingPreference) lifestyleCompletionPercent += 25;
  if (profile.workoutFrequency) lifestyleCompletionPercent += 25;
  if (profile.socialMediaUsage) lifestyleCompletionPercent += 25;
  if (profile.sleepingHabits) lifestyleCompletionPercent += 25;
  
  const lifestyleScore = (PROFILE_SECTIONS.lifestyle.weight * lifestyleCompletionPercent) / 100;
  completionScore += lifestyleScore;
  
  if (!hasLifestyleAttributes) {
    incompleteSections.push({
      id: "lifestyle",
      label: "Lifestyle Attributes",
      completed: false,
      weight: PROFILE_SECTIONS.lifestyle.weight,
    });
  }

  // Personality attributes section
  const hasPersonalityAttributes = !!(
    profile.personalityType || 
    profile.communicationStyle || 
    profile.loveLanguage || 
    profile.zodiacSign
  );
  
  // Award points proportionally based on how many personality attributes are filled
  let personalityCompletionPercent = 0;
  if (profile.personalityType) personalityCompletionPercent += 25;
  if (profile.communicationStyle) personalityCompletionPercent += 25;
  if (profile.loveLanguage) personalityCompletionPercent += 25;
  if (profile.zodiacSign) personalityCompletionPercent += 25;
  
  const personalityScore = (PROFILE_SECTIONS.personalityInfo.weight * personalityCompletionPercent) / 100;
  completionScore += personalityScore;
  
  if (!hasPersonalityAttributes) {
    incompleteSections.push({
      id: "personality",
      label: "Personality & Communication",
      completed: false,
      weight: PROFILE_SECTIONS.personalityInfo.weight,
    });
  }

  // Social links section
  const hasSocialLinks = !!(
    (profile.instagram && profile.instagram.trim() !== "") || 
    (profile.spotify && profile.spotify.trim() !== "") || 
    (profile.snapchat && profile.snapchat.trim() !== "")
  );
  
  completionScore += hasSocialLinks ? PROFILE_SECTIONS.socialLinks.weight : 0;
  
  if (!hasSocialLinks) {
    incompleteSections.push({
      id: "socialLinks",
      label: "Social Links",
      completed: false,
      weight: PROFILE_SECTIONS.socialLinks.weight,
    });
  }

  return {
    percentage: Math.round(completionScore),
    incompleteSections,
  };
}

/**
 * Generate a helpful message based on the profile completion percentage
 */
export function getCompletionMessage(percentage: number): string {
  if (percentage < 30) {
    return "Just getting started! Add more details to stand out.";
  } else if (percentage < 60) {
    return "Good progress! Add more to increase your matches.";
  } else if (percentage < 90) {
    return "Almost there! Just a few more touches.";
  } else {
    return "Amazing profile! You're ready to match!";
  }
} 