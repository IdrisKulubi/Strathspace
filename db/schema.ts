import { relations, sql } from "drizzle-orm";
import {
  timestamp,
  pgTable,
  text,
  integer,
  boolean,
  uuid,
  json,
  primaryKey,
  index,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";
import { User } from "next-auth";

// First define all tables
export const users = pgTable(
  "user",
  {
    id: text("id").primaryKey(), 
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    role: text("role").$type<"user" | "admin">().default("user"),
    emailVerified: timestamp("emailVerified"),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastActive: timestamp("last_active").defaultNow().notNull(),
    isOnline: boolean("is_online").default(false),
    profilePhoto: text("profile_photo"),
    phoneNumber: text("phone_number").notNull(),
  },
  (table) => ({
    emailIdx: index("user_email_idx").on(table.email),
    createdAtIdx: index("user_created_at_idx").on(table.createdAt),
    lastActiveIdx: index("user_last_active_idx").on(table.lastActive),
  })
);

// Auth.js tables
export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").notNull().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// Profile modes table to track which modes are active for each user
export const profileModes = pgTable(
  "profile_modes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    datingEnabled: boolean("dating_enabled").default(false),
    friendsEnabled: boolean("friends_enabled").default(false),
    datingProfileCompleted: boolean("dating_profile_completed").default(false),
    friendsProfileCompleted: boolean("friends_profile_completed").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: uniqueIndex("profile_modes_user_id_idx").on(table.userId),
  })
);

// Extended user profiles
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    
    // Basic info (required for both modes)
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    phoneNumber: text("phone_number").notNull(),
    bio: text("bio"),
    age: integer("age"),
    gender: text("gender"),
    course: text("course"),
    yearOfStudy: integer("year_of_study"),
    profilePhoto: text("profile_photo"),
    interests: json("interests").$type<string[]>(),
    photos: json("photos").$type<string[]>(),

    // Study/Friends specific fields
    studyPreferences: json("study_preferences").$type<{
      preferredStudyTime?: string;
      studyStyle?: string;
      subjectInterests?: string[];
      groupSize?: string;
      academicGoals?: string[];
    }>(),
    academicFocus: text("academic_focus"),
    studyAvailability: json("study_availability").$type<string[]>(),
    projectInterests: json("project_interests").$type<string[]>(),
    
    // Dating specific fields
    lookingFor: text("looking_for"),
    relationshipGoals: text("relationship_goals"),
    drinkingPreference: text("drinking_preference"),
    workoutFrequency: text("workout_frequency"),
    socialMediaUsage: text("social_media_usage"),
    sleepingHabits: text("sleeping_habits"),
    personalityType: text("personality_type"),
    communicationStyle: text("communication_style"),
    loveLanguage: text("love_language"),
    zodiacSign: text("zodiac_sign"),
    
    // Social media (optional for both)
    instagram: text("instagram"),
    spotify: text("spotify"),
    snapchat: text("snapchat"),
    
    // System fields
    role: text("role").$type<"user" | "admin">().default("user"),
    isVisible: boolean("is_visible").default(true),
    lastActive: timestamp("last_active").defaultNow(),
    profileCompleted: boolean("profile_completed").default(false),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    visibilityMode: text("visibility_mode").default("standard"),
    incognitoMode: boolean("incognito_mode").default(false),
    discoveryPaused: boolean("discovery_paused").default(false),
    readReceiptsEnabled: boolean("read_receipts_enabled").default(true),
    showActiveStatus: boolean("show_active_status").default(true),
    username: text("username"),
  },
  (table) => ({
    userIdIdx: uniqueIndex("profile_user_id_idx").on(table.userId),
    usernameIdx: uniqueIndex("profile_username_idx").on(table.username),
    isVisibleIdx: index("profile_is_visible_idx").on(table.isVisible),
    genderIdx: index("profile_gender_idx").on(table.gender),
    lastActiveIdx: index("profile_last_active_idx").on(table.lastActive),
  })
);

// Swipes/Likes
export const swipes = pgTable(
  "swipes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    swiperId: text("swiper_id")
      .notNull()
      .references(() => users.id),
    swipedId: text("swiped_id")
      .notNull()
      .references(() => users.id),
    isLike: boolean("is_like").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    swiperIdx: index("swipe_swiper_idx").on(table.swiperId),
    swipedIdx: index("swipe_swiped_idx").on(table.swipedId),
    createdAtIdx: index("swipe_created_at_idx").on(table.createdAt),
    // Compound index for faster lookups
    swipeComboIdx: index("swipe_combo_idx").on(table.swiperId, table.swipedId),
  })
);

// Matches
export const matches = pgTable(
  "matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user1Id: text("user1_id")
      .notNull()
      .references(() => users.id),
    user2Id: text("user2_id")
      .notNull()
      .references(() => users.id),
    user1Typing: boolean("user1_typing").default(false),
    user2Typing: boolean("user2_typing").default(false),
    lastMessageAt: timestamp("last_message_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("match_users_idx").on(table.user1Id, table.user2Id),
    lastMessageIdx: index("last_message_idx").on(table.lastMessageAt),
  })
);

export const feedbacks = pgTable("feedbacks", {
  id: text("id").primaryKey().notNull(),
  name: text("name"),
  phoneNumber: text("phone_number"),
  message: text("message").notNull(),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Messages
export const messages = pgTable(
  "messages",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    content: text("content").notNull(),
    matchId: uuid("match_id")
      .references(() => matches.id)
      .notNull(),
    senderId: text("sender_id")
      .references(() => users.id)
      .notNull(),
    status: text("status", { enum: ["sent", "delivered", "read"] })
      .default("sent")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    matchIdIdx: index("match_id_idx").on(table.matchId),
    senderIdIdx: index("sender_id_idx").on(table.senderId),
    createdAtIdx: index("created_at_idx").on(table.createdAt)
  })
);

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  })
}));

// Blocks
export const blocks = pgTable("blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  blockerId: text("blocker_id")
    .notNull()
    .references(() => users.id),
  blockedId: text("blocked_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Starred Profiles
export const starredProfiles = pgTable("starred_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  starredId: text("starred_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reports
export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reporterId: text("reporter_id")
    .notNull()
    .references(() => users.id),
  reportedUserId: text("reported_user_id")
    .notNull()
    .references(() => users.id),
  reason: text("reason").notNull(),
  status: text("status").$type<"PENDING" | "RESOLVED">().default("PENDING"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  adminNotes: text("admin_notes"),
}, (table) => ({
  reportedIdx: index("reported_user_idx").on(table.reportedUserId),
  statusIdx: index("report_status_idx").on(table.status),
}));

// Profile Views
export const profileViews = pgTable("profile_views", {
  id: uuid("id").defaultRandom().primaryKey(),
  viewerId: text("viewer_id")
    .notNull()
    .references(() => users.id),
  viewedId: text("viewed_id")
    .notNull()
    .references(() => users.id),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
  source: text("source").$type<"VIEW_MORE" | "PROFILE_CARD" | "SEARCH" | "MATCHES">().default("VIEW_MORE"),
  viewDuration: integer("view_duration"), // Duration in seconds
}, (table) => ({
  viewerIdx: index("profile_views_viewer_idx").on(table.viewerId),
  viewedIdx: index("profile_views_viewed_idx").on(table.viewedId),
  viewedAtIdx: index("profile_views_viewed_at_idx").on(table.viewedAt),
}));

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  sentSwipes: many(swipes, { relationName: "swiperRelation" }),
  receivedSwipes: many(swipes, { relationName: "swipedRelation" }),
  matches1: many(matches, { relationName: "user1Relation" }),
  matches2: many(matches, { relationName: "user2Relation" }),
  starredProfiles: many(starredProfiles, {
    relationName: "userStarredProfiles",
  }),
  reports: many(reports, { relationName: "userReports" }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  messages: many(messages, { relationName: "matchMessages" }),
  user1: one(users, {
    fields: [matches.user1Id],
    references: [users.id],
  }),
  user2: one(users, {
    fields: [matches.user2Id],
    references: [users.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, {
    fields: [reports.reporterId],
    references: [users.id],
  }),
  reportedUser: one(users, {
    fields: [reports.reportedUserId],
    references: [users.id],
  }),
}));

export const profileViewsRelations = relations(profileViews, ({ one }) => ({
  viewer: one(users, {
    fields: [profileViews.viewerId],
    references: [users.id],
    relationName: "profileViewer",
  }),
  viewed: one(users, {
    fields: [profileViews.viewedId],
    references: [users.id],
    relationName: "profileViewed",
  }),
}));

// Define relations
export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
  modes: one(profileModes, {
    fields: [profiles.userId],
    references: [profileModes.userId],
  }),
}));

export const profileModesRelations = relations(profileModes, ({ one }) => ({
  profile: one(profiles, {
    fields: [profileModes.userId],
    references: [profiles.userId],
  }),
  user: one(users, {
    fields: [profileModes.userId],
    references: [users.id],
  }),
}));

// Update Profile type
export type Profile = typeof profiles.$inferSelect & {
  modes?: typeof profileModes.$inferSelect;
  isMatch?: boolean;
  userId: string;
  unreadMessages?: number;
  matchId?: string;
};

// Export the Message type if needed
export type Message = typeof messages.$inferSelect;


export type ProfileView = typeof profileViews.$inferSelect;

