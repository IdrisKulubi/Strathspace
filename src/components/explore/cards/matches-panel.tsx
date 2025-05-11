"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Profile } from "@/db/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { ProfileDetails } from "@/components/explore/cards/profile-details";

interface MatchesPanelProps {
  profiles: Profile[];
}

export function MatchesPanel({ profiles }: MatchesPanelProps) {
  const matchedProfiles = profiles.filter((profile) => profile.isMatch);

  return (
    <motion.div
      className="fixed left-4 top-[400px] bg-white/80 dark:bg-background/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-pink-100 dark:border-pink-950 z-50 w-72"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="relative">
          <h2 className="text-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            Your Matches
          </h2>
          <div className="absolute -right-7 -top-1 text-xl">✨</div>
        </div>
        <span className="text-pink-500 dark:text-pink-400 ml-auto text-sm font-medium">
          {matchedProfiles.length}
        </span>
      </div>

      <ScrollArea className="h-[200px] pr-4 -mr-4">
        <div className="space-y-3">
          {matchedProfiles.map((profile) => (
            <ProfileDetails
              key={profile.id}
              profile={profile}
              isMatch={true}
              trigger={
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group relative bg-white dark:bg-background rounded-2xl p-3 shadow-sm border border-pink-100 dark:border-pink-900 flex items-center gap-3 cursor-pointer"
                >
                  <Avatar className="h-12 w-12 border-2 border-pink-200">
                    <AvatarImage src={profile.profilePhoto || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-pink-400 to-pink-600 text-white">
                      {profile.firstName?.[0]}
                      {profile.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {profile.firstName} {profile.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {profile.course}, Year {profile.yearOfStudy}
                    </p>
                  </div>

                  <WhatsAppButton
                    phoneNumber={profile.phoneNumber || ""}
                    size="sm"
                    className="bg-green-500 rounded-full p-1.5 h-8 w-8"
                  />
                </motion.div>
              }
            />
          ))}

          {matchedProfiles.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-4 text-pink-400/80 space-y-2"
            >
              <div className="text-4xl mb-3">💫</div>
              <p className="text-sm font-medium">No matches yet</p>
              <p className="text-xs text-muted-foreground">
                Keep swiping to find your perfect match 💖
              </p>
            </motion.div>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
