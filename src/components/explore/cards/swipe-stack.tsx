/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Profile } from "@/db/schema";
import { SwipeableCard } from "./swipeable-card";
import { AnimatePresence } from "framer-motion";
import { recordSwipe, undoLastSwipe } from "@/lib/actions/explore.actions";
import { MatchModal } from "@/components/explore/modals/match-modal";

import { useToast } from "@/hooks/use-toast";
import { SidePanels } from "./side-panels";
import { NoMoreProfiles } from "../empty-state";

const PRELOAD_BUFFER_SIZE = 3;

interface SwipeStackProps {
  initialProfiles: Profile[];
  currentUserProfile: Profile;
  likedByProfiles: Profile[];
  currentUser: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
  onMatch?: (profile: Profile) => void;
}

const swipeVariants = {
  left: {
    x: -1000,
    opacity: 0,
    rotate: -30,
    transition: { duration: 0.4, ease: "easeOut" },
  },
  right: {
    x: 1000,
    opacity: 0,
    rotate: 30,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

export function SwipeStack({
  initialProfiles,
  currentUserProfile,
  likedByProfiles,
  currentUser,
}: SwipeStackProps) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [currentIndex, setCurrentIndex] = useState(initialProfiles.length - 1);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(
    null
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [swipedProfiles, setSwipedProfiles] = useState<Profile[]>([]);
  const { toast } = useToast();
  
  // Create a buffer of profiles to display
  const visibleProfiles = useMemo(() => {
    if (currentIndex < 0) return [];
    
    // Get the current profile and the next few profiles for preloading
    const buffer = [];
    for (let i = 0; i < PRELOAD_BUFFER_SIZE; i++) {
      const index = currentIndex - i;
      if (index >= 0 && profiles[index]) {
        buffer.push(profiles[index]);
      }
    }
    return buffer;
  }, [currentIndex, profiles]);

  // Prefetch images for the next few profiles
  useEffect(() => {
    const prefetchNextProfiles = async () => {
      try {
        // Dynamically import the prefetch function
        const { prefetchProfileImages } = await import("@/lib/actions/image-prefetch");
        
        // Get all photo URLs from the buffer profiles
        const photoUrls = visibleProfiles.flatMap(profile => {
          return [
            profile.profilePhoto,
            ...(profile.photos || [])
          ].filter(Boolean) as string[];
        });
        
        // Prefetch all images
        if (photoUrls.length > 0) {
          await prefetchProfileImages(photoUrls);
        }
      } catch (error) {
        console.error("Failed to prefetch profile images:", error);
      }
    };
    
    prefetchNextProfiles();
  }, [visibleProfiles]);

  const handleSwipe = useCallback(
    async (direction: "left" | "right") => {
      if (isAnimating || !profiles[currentIndex]) return;

      setIsAnimating(true);
      setSwipeDirection(direction);

      // Only record like when swiping right
      if (direction === "right") {
        const result = await recordSwipe(profiles[currentIndex].userId, "like");

        if (result.success) {
          if (result.isMatch) {
            setMatchedProfile(profiles[currentIndex]);
          } else {
            toast({
              title: "Yasss 💖",
              description: `You liked ${profiles[currentIndex].firstName}! Fingers crossed for a match`,
              variant: "default",
              className:
                "bg-gradient-to-r from-pink-500 to-purple-500 text-white border-none",
            });
          }
        }
      }

      setSwipedProfiles((prev) => [...prev, profiles[currentIndex]]);

      setTimeout(() => {
        setCurrentIndex((prev) => prev - 1);
        setSwipeDirection(null);
        setIsAnimating(false);
      }, 600);
    },
    [currentIndex, isAnimating, profiles, toast]
  );

  const handleRevert = useCallback(async () => {
    if (swipedProfiles.length === 0) return;

    const lastProfile = swipedProfiles[swipedProfiles.length - 1];
    await undoLastSwipe(lastProfile.userId);

    setProfiles((prev) => [...prev, lastProfile]);
    setSwipedProfiles((prev) => prev.slice(0, -1));
    setCurrentIndex((prev) => prev + 1);
  }, [swipedProfiles]);

  const handleLikeBack = async (profileId: string) => {
    await handleSwipe("right");
  };

  // No profiles left to show
  if (currentIndex < 0) {
    return null;
  }

  return (
    <div className="flex w-full max-w-7xl mx-auto relative min-h-screen">
      {/* Side Panel - Adjusted positioning */}
      <div className="hidden lg:block w-72 fixed left-0 top-24 h-[calc(100vh-6rem)]">
        <SidePanels
          profiles={swipedProfiles.filter((p) => p.isMatch)}
          likedByProfiles={likedByProfiles}
          onUnlike={handleRevert}
          onLikeBack={handleLikeBack}
        />
      </div>

      {/* Main Card Area - Adjusted layout */}
      <div className="flex-1 flex justify-center items-center lg:ml-52">
        <div className="w-full max-w-[450px] mx-4">
          <div className="relative h-[650px] w-full flex items-center justify-center">
            <AnimatePresence>
              {profiles[currentIndex] ? (
                <>
                  {/* Render the current profile */}
                  <SwipeableCard
                    key={profiles[currentIndex].userId}
                    profile={profiles[currentIndex] as Profile & { photos: string[] }}
                    onSwipe={handleSwipe}
                    onRevert={handleRevert}
                    active={true}
                  />
                  
                  {/* Preload the next profiles (hidden but loaded in DOM) */}
                  {visibleProfiles.slice(1).map((profile, index) => (
                    <div key={`preload-${profile.userId}`} className="hidden">
                      <SwipeableCard
                        profile={profile as Profile & { photos: string[] }}
                        onSwipe={() => {}}
                        active={false}
                      />
                    </div>
                  ))}
                </>
              ) : (
                <NoMoreProfiles
                  initialLikedProfiles={likedByProfiles}
                  currentUser={currentUserProfile}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
{/*   TO DO  specify the type of matchedProfile and currentUserProfile */}
      {matchedProfile && (
        <MatchModal
          isOpen={!!matchedProfile}
          currentUser={currentUser}
          onClose={() => setMatchedProfile(null)}
          matchedProfile={{
            ...matchedProfile,
            
          }}
          currentUserProfile={{
            ...currentUserProfile,
          }}
        />
      )}
    </div>
  );
}
