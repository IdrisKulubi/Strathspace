import { Camera, Pencil, Sparkles, GraduationCap, Share2 } from "lucide-react";

export const steps = [
  {
    id: "photos",
    title: "Show Your Best Self 📸",
    description:
      "Add your cutest pics bestie! Show off that main character energy ✨",
    icon: Camera,
  },
  {
    id: "bio",
    title: "Tell Your Story 💭",
    description:
      "Let your personality shine! Share what makes you uniquely you 🦋",
    icon: Pencil,
  },
  {
    id: "interests",
    title: "Pick Your Vibes 🌟",
    description:
      "Choose at least 3 interests that match your energy! Help us find your perfect match ✨",
    icon: Sparkles,
  },
  {
    id: "details",
    title: "Share Your Details 📚",
    description:
      "Tell us a bit more about you - what you're looking for and what you study 🎓",
    icon: GraduationCap,
  },
  {
    id: "socials",
    title: "Connect Your Socials 🔗",
    description:
      "Add your social handles so your matches can find you everywhere! (totally optional) 💫",
    icon: Share2,
  },
];

export const interests = [
  "🎮 Gaming",
  "🎵 Music",
  "📚 Reading",
  "🎧 Podcasts",

  "🎨 Art",
  "🏃‍♂️ Sports",
  "🎬 Movies",
  "✈️ Travel",
  "🍳 Cooking",
  "📸 Photography",
  "🎸 Playing Music",
  "🐕 Pets",
  "🌱 Nature",
  "💻 Tech",
  "🎭 Theatre",
  
  "🎪 Events",
  "🎲 Board Games",
];

export const genders = [
  { value: "male", label: "Male 👨" },
  { value: "female", label: "Female 👩" },
  { value: "non-binary", label: "Non-binary 🌈" },
  { value: "other", label: "Other 💫" },
] as const;

export const ageRange = Array.from({ length: 8 }, (_, i) => i + 18);

// Moved ProfileFormData type from actions/profile.actions.ts
export type ProfileFormData = {
  userId: string;
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
  
  // Anonymous mode settings
  anonymous?: boolean;
  anonymousAvatar?: string;
  anonymousRevealRequested?: boolean;
  
  // Username for profile sharing
  username?: string;
};


export const AVATARS = [
  "heart", "ghost", "robot", "alien", "unicorn", 
  "tardis", "book", "coffee", "star", "music"
];
