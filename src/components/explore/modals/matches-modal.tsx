"use client";

import { Dialog, DialogContent ,DialogHeader,DialogTitle} from "@/components/ui/dialog";
import { Profile } from "@/db/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { ProfilePreviewModal } from "./profile-preview-modal";
import Link from "next/link";

interface MatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: Profile[];
  currentUser: { id: string };
}

export function MatchesModal({
  isOpen,
  onClose,
  matches,
}: MatchesModalProps) {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  // Enhanced validation and filtering logic
  const validMatches = useMemo(() => 
    matches
      .filter(profile => 
        profile.firstName?.trim() && 
        profile.lastName?.trim() && 
        profile.course?.trim() && 
        profile.yearOfStudy
      )
      .filter((profile, index, self) =>
        index === self.findIndex(p => 
          p.matchId === profile.matchId
        )
      )
      .sort((a, b) => {
        // Sort by most recent matches first
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return 0;
      }),
    [matches]
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md p-4">
          <DialogHeader>
            <DialogTitle>
              Your Matches
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between mb-6">
            <div className="relative">
              <span className="text-xl font-bold bg-gradient-to-r from-purple-500 to-purple-700 bg-clip-text text-transparent">
                Your Matches
              </span>
              <span className="absolute -right-7 -top-1 text-xl">💘</span>
            </div>
            <span className="text-purple-500 text-sm font-medium">
              {validMatches.length}
            </span>
          </div>

          <ScrollArea className="h-[70vh]">
            <div className="space-y-4">
              <AnimatePresence>
                {validMatches.map((profile) => (
                  <motion.div
                    key={`${profile.userId}-${profile.matchId}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex flex-col bg-white/50 dark:bg-background/50 p-4 rounded-2xl border border-purple-100 dark:border-purple-900 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                    onClick={() => setSelectedProfile(profile)}
                  >
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16 border-2 border-purple-200 dark:border-purple-800 transition-transform hover:scale-105">
                        <AvatarImage 
                          src={profile.profilePhoto || undefined} 
                          alt={`${profile.firstName}'s profile photo`}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-purple-600 text-white text-lg">
                          {profile.firstName?.[0]}
                          {profile.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {profile.firstName} 
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {profile.course?.slice(0,6) || "N/A"} • Year {profile.yearOfStudy}
                            </p>
                          </div>
                          <Button
                            asChild
                            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-md hover:shadow-lg transition-all duration-300 gap-2 px-4 rounded-xl border border-pink-200 dark:border-purple-800"
                          >
                            <Link
                              href={`/chat/${profile.matchId}`}
                              className="flex items-center whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MessageCircle className="h-4 w-4 mr-1" />
                              Chat
                            </Link>
                          </Button>
                        </div>
                        
                        {/* Additional Profile Details */}
                        <div className="mt-3 space-y-2">
                       
                          
                         
                          
                        
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {validMatches.length === 0 && (
                <EmptyState
                  icon="💝"
                  title="No matches yet"
                  description="Keep swiping to find your perfect match!"
                />
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ProfilePreviewModal
        isOpen={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
        profile={selectedProfile}
      />
    </>
  );
}
