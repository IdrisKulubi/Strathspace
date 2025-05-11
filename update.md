# StrathSpace Profile Enhancement Plan

## Profile Features (Tinder-Style)

### 1. Profile Completion Indicator
- Add a profile completion percentage (seen in Tinder's "29% complete")
- Visual progress bar showing completion status
- Prompt notifications for incomplete sections

#### Implementation Details
```typescript
// 1. Create a Profile Completion Calculation Service
// src/lib/utils/profile-completion.ts

// Fields to check and their weight in the total completion score
const PROFILE_SECTIONS = {
  photos: { weight: 20, min: 1 },        // 20% if at least 1 photo
  bio: { weight: 15, min: 10 },          // 15% if bio has at least 10 words
  interests: { weight: 15, min: 3 },     // 15% if at least 3 interests selected
  basicInfo: { weight: 20 },             // 20% for name, age, gender, etc.
  courseInfo: { weight: 15 },            // 15% for course and year
  lifestyle: { weight: 10 },             // 10% for lifestyle attributes (to be added)
  socialLinks: { weight: 5 },            // 5% for social links
};

// Add Profile Completion Component
// src/components/profile/profile-completion.tsx (new component)
// - Visual progress bar 
// - Percentage display
// - Clickable sections for quick navigation to incomplete areas
```

#### Database Schema Updates
```typescript
// Add these fields to the profiles table

// For lifestyle attributes section
drinkingPreference: text("drinking_preference"),  
workoutFrequency: text("workout_frequency"),
socialMediaUsage: text("social_media_usage"),
sleepingHabits: text("sleeping_habits"),

// For personality section  
personalityType: text("personality_type"),
communicationStyle: text("communication_style"),
loveLanguage: text("love_language"),
zodiacSign: text("zodiac_sign"),

// Profile visibility and privacy
visibilityMode: text("visibility_mode").default("standard"),
incognitoMode: boolean("incognito_mode").default(false),
discoveryPaused: boolean("discovery_paused").default(false),
readReceiptsEnabled: boolean("read_receipts_enabled").default(true),
showActiveStatus: boolean("show_active_status").default(true),
```

### 2. Enhanced Basic Information
- Profile photo carousel with multi-image support (5-9 photos)
- Verification badge system
- Age and location display (with distance settings)
- Allow username creation

### 3. Lifestyle Attributes
- Add lifestyle section with toggleable attributes:
  - Drinking preferences (Not for me, Social drinker, etc.)
  - Workout frequency (Sometimes, Active, Never, etc.)
  - Social media usage (Passive scroller, Influencer, etc.)
  - Sleeping habits (Night owl, Early bird, It varies)

### 4. Expanded Interests
- Interest tags with modern UI (pill-shaped selectable items)
- Categorized interests (Sports, Arts, Academic, Social)
- Allow for custom interest creation
- Option to highlight top 3 favorite interests

### 5. Improved Bio Section
- Character count with visual indicator
- Bio suggestions/templates
- Option to add Spotify anthem
- Prompt questions to help complete bio

### 6. Personality & Communication
- Add personality type indicator (MBTI, etc.)
- Communication style preferences
- Love language indicator
- Add zodiac sign selection

### 7. Account & Privacy Controls
- Visibility controls similar to Tinder's "Control Who You See" section
  - Standard/Discoverable mode
  - Incognito mode (only visible to people you like)
  - Option to temporarily pause discovery
- Reading receipt management
- Recently active status toggle

### 8. Premium Features Teaser
- Preview of premium-only features
- Profile boost option
- See who liked you feature
- Advanced filtering options

### 9. Profile Analytics
- Profile visit counter
- Swipe statistics
- Match ratio analytics
- Profile effectiveness score

### 10. Safety Features
- Block and report management
- Safety tips access
- Privacy settings controls
- Content moderation options


