"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import type { Profile } from "@/db/schema";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChatButton } from "@/components/chat/chat-button";

interface MobileMatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  currentUser: { id: string };
}

export function MobileMatchesModal({
  isOpen,
  onClose,
  profiles,
  currentUser,
}: MobileMatchesModalProps) {
  const matchedProfiles = profiles.filter((p) => p.isMatch);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] px-0">
        <SheetHeader className="px-4 mb-6">
          <SheetTitle className="flex items-center justify-between">
            <div className="relative">
              <span className="text-xl font-bold bg-gradient-to-r from-purple-500 to-purple-700 bg-clip-text text-transparent">
                Your Matches
              </span>
              <span className="absolute -right-7 -top-1 text-xl">💘</span>
            </div>
            <span className="text-purple-500 text-sm font-medium">
              {matchedProfiles.length}
            </span>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(80vh-8rem)] px-4">
          <div className="space-y-4">
            <AnimatePresence>
              {matchedProfiles.map((profile) => (
                <motion.div
                  key={profile.userId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between bg-white/50 dark:bg-background/50 p-3 rounded-2xl border border-purple-100 dark:border-purple-900"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14 border-2 border-purple-200 dark:border-purple-800">
                      <AvatarImage src={profile.profilePhoto || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-400 to-purple-600 text-white">
                        {profile.firstName?.[0]}
                        {profile.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-medium">
                        {profile.firstName} {profile.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {profile.course} • {profile.yearOfStudy}
                      </p>
                    </div>
                  </div>
                 
                  <ChatButton
                    matchId={profile.matchId || ""}
                    currentUserId={currentUser.id}
                    unreadCount={profile.unreadMessages || 0}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {matchedProfiles.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-purple-400/80 space-y-3"
              >
                <div className="text-5xl mb-4">💫</div>
                <p className="text-base font-medium">No matches yet</p>
                <p className="text-sm text-muted-foreground">
                  Keep swiping to find your perfect match! 💖
                </p>
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
