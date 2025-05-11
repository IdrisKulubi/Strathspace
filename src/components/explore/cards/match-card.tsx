"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Profile } from "@/db/schema";
import { Heart, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

interface MatchCardProps {
  profile: Profile;
  onLikeBack: (userId: string) => Promise<void>;
  onUnlike: (userId: string) => Promise<void>;
  isProcessing?: boolean;
}

export function MatchCard({
  profile,
  onLikeBack,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onUnlike,
  isProcessing,
}: MatchCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
        className="group relative bg-white dark:bg-background rounded-xl p-3 shadow-sm border border-purple-100 dark:border-purple-900 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Profile Info Section */}
          <div
            className="flex items-center gap-3 flex-1 cursor-pointer z-10"
            onClick={() => setShowDetails(true)}
          >
            <Avatar className="h-12 w-12 border-2 border-purple-200 dark:border-purple-800">
              <AvatarImage src={profile.profilePhoto || profile.photos?.[0] || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-purple-600 text-white">
                {profile.firstName?.[0]}
                {profile.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-medium">{profile.firstName}</h3>
              <p className="text-sm text-muted-foreground">
                {profile.course?.trim().slice(0, 3)} • Year{" "}
                {profile.yearOfStudy}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 z-20">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onLikeBack(profile.userId)}
              disabled={isProcessing}
              className="hover:bg-pink-100/50 dark:hover:bg-pink-950/50 text-pink-500 dark:text-pink-400"
            >
              {isProcessing ? (
                <span className="flex items-center gap-1.5">
                  <span className="animate-spin">⌛</span>
                  <span className="text-xs">Loading...</span>
                </span>
              ) : (
                <>
                  <Heart className="h-4 w-4 mr-1.5" />
                  <span className="text-xs">Like Back</span>
                </>
              )}
            </Button>

            {/* TODO: Add unlike button */}
            {/* <Button
              size="sm"
              variant="ghost"
              onClick={() => onUnlike(profile.userId)}
              disabled={isProcessing}
              className="hover:bg-rose-100/50 dark:hover:bg-rose-950/50 text-rose-500 dark:text-rose-400 min-w-[40px] p-2"
            >
              <X className="h-4 w-4" />
            </Button> */}
          </div>
        </div>
      </motion.div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md bg-gradient-to-b from-white to-purple-50 dark:from-background dark:to-purple-950/20">
          <DialogHeader>
            <DialogTitle className="text-center mb-4 text-2xl bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-purple-400 dark:from-purple-400 dark:to-purple-200 font-bold">
              Profile Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Photos Gallery */}
            <div className="relative h-72 overflow-hidden rounded-xl ring-2 ring-purple-200 dark:ring-purple-800 shadow-lg">
              <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory h-full">
                {profile.photos?.map((photo, i) => (
                  <div
                    key={i}
                    className="relative flex-none w-full snap-center"
                  >
                    <Image
                      src={photo}
                      alt={`${profile.firstName}'s photo ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute bottom-2 right-2">
                      <Badge
                        variant="secondary"
                        className="bg-black/50 text-white backdrop-blur-sm"
                      >
                        {i + 1}/{profile.photos?.length}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-4 px-1">
              <div>
                <h3 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-purple-400 dark:from-purple-400 dark:to-purple-200">
                  {profile.firstName} {profile.lastName}
                </h3>
                <p className="text-muted-foreground font-medium">
                  {profile.course} • Year {profile.yearOfStudy}
                </p>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="bg-purple-50/50 dark:bg-purple-950/20 p-3 rounded-lg">
                  <h4 className="text-sm font-medium mb-1 text-purple-600 dark:text-purple-300">
                    About
                  </h4>
                  <p className="text-sm text-muted-foreground">{profile.bio}</p>
                </div>
              )}

              {/* Interests */}
              {profile.interests && profile.interests.length > 0 && (
                <div className="bg-purple-50/50 dark:bg-purple-950/20 p-3 rounded-lg">
                  <h4 className="text-sm font-medium mb-2 text-purple-600 dark:text-purple-300">
                    Interests
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests?.map((interest, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/50 dark:hover:bg-purple-800/50 transition-colors"
                      >
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
