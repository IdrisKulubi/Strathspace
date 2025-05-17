"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { SwipeCard } from "../cards/swipe-card";
import { SwipeControls } from "../controls/swipe-controls";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Heart, User2 } from "lucide-react";
import type { Profile } from "@/db/schema";
import { MobileCrushesModal } from "../cards/mobile-crushes-modal";
import { MatchModal } from "../modals/match-modal";
import { useToast } from "@/hooks/use-toast";
import { recordSwipe, undoLastSwipe } from "@/lib/actions/explore.actions";
import { MobileLikes } from "./mobile-likes";
import { MobileViewMore } from "./mobile-view-more";
import { EmptyMobileView } from "../cards/empty-mobile";

interface ExploreMobileProps {
  initialProfiles: Profile[];
  likedProfiles: Profile[];
  likedByProfiles: Profile[];
  currentUser: { id: string };
  currentUserProfile: Profile;
}

export function ExploreMobile({
  initialProfiles,
  likedProfiles: initialLikedProfiles,
  likedByProfiles: initialLikedByProfiles,
  currentUser,
  currentUserProfile,
}: ExploreMobileProps) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [likedProfiles, setLikedProfiles] =
    useState<Profile[]>(initialLikedProfiles);
  const [likedByProfiles, setLikedByProfiles] = useState<Profile[]>(
    initialLikedByProfiles
  );
  const [showCrushes, setShowCrushes] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [currentSwipeDirection, setCurrentSwipeDirection] = useState<
    "left" | "right" | null
  >(null);
  const [swipedProfiles, setSwipedProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const { toast } = useToast();

  const handleSwipe = async (direction: "left" | "right", profile: Profile) => {
    setCurrentSwipeDirection(direction);
    const swipeType = direction === "right" ? "like" : "pass";

    const result = await recordSwipe(profile.userId, swipeType);

    if (!result.success) {
      toast({
        variant: "destructive",
        description: result.error || "Couldn't record swipe 😅",
      });
      return;
    }

    setTimeout(() => {
      if (direction === "right") {
        const updatedProfile = {
          ...profile,
          isMatch: result.isMatch ?? null,
        } satisfies Profile;
        setLikedProfiles((prev) => [...prev, updatedProfile]);
        if (result.isMatch) {
          setMatchedProfile(updatedProfile);
          setShowMatch(true);
        }
      }
      setSwipedProfiles((prev) => [...prev, profile]);
      setProfiles((prev) => prev.slice(0, -1));
      setCurrentSwipeDirection(null);
    }, 200);
  };

  const handleUndo = async () => {
    if (swipedProfiles.length === 0) return;

    const lastSwiped = swipedProfiles[swipedProfiles.length - 1];
    const result = await undoLastSwipe(lastSwiped.userId);

    if (result.success) {
      setProfiles((prev) => [...prev, lastSwiped]);
      setSwipedProfiles((prev) => prev.slice(0, -1));
      setLikedProfiles((prev) =>
        prev.filter((p) => p.userId !== lastSwiped.userId)
      );
      toast({
        title: "Undo successful",
        description: "Your last swipe has been undone",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to undo swipe. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShare = () => {
    // You can add share tracking logic here if needed
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/30 to-white dark:from-pink-950/30 dark:to-background">
      {/* Mobile Navigation */}

      {/* Top Controls - Only show when there are profiles */}
      {profiles.length > 0 && (
        <div className="fixed top-[56px] left-0 right-0 z-40 bg-white/50 dark:bg-background/50 backdrop-blur-sm border-b border-pink-100 dark:border-pink-900">
          <div className="px-6 py-3 flex items-center justify-between">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" className="relative">
                  <Heart className="h-6 w-6 text-pink-500" />
                  {likedByProfiles.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-medium bg-pink-500 text-white rounded-full">
                      {likedByProfiles.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full sm:w-[400px] p-0">
                <div className="p-6 space-y-4">
                  <SheetTitle className="text-xl font-bold text-pink-500 flex items-center gap-2">
                    Likes You <span className="text-2xl">💘</span>
                  </SheetTitle>
                  <SheetDescription className="text-muted-foreground">
                    These people have a crush on you, Swipe right if you like
                    them back ✨
                  </SheetDescription>
                  <MobileLikes
                    profiles={likedByProfiles}
                    onLikeBack={async (profileId) => {
                      const profile = likedByProfiles.find(
                        (p) => p.userId === profileId
                      );
                      if (profile) {
                        const updatedProfile = {
                          ...profile,
                          isMatch: true,
                        } satisfies Profile;
                        setMatchedProfile(updatedProfile);
                        setShowMatch(true);
                        setLikedByProfiles((prev) =>
                          prev.filter((p) => p.userId !== profileId)
                        );
                      }
                      return { isMatch: true };
                    }}
                    onViewProfile={(profile) => setSelectedProfile(profile)}
                  />
                </div>
              </SheetContent>
            </Sheet>

            <Button
              variant="ghost"
              onClick={() => setShowCrushes(true)}
              className="relative"
            >
              <User2 className="h-6 w-6 text-pink-500" />
              {likedProfiles.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-medium bg-pink-500 text-white rounded-full">
                  {likedProfiles.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {profiles.length > 0 ? (
        <>
          {/* Card Stack - Adjusted top padding for new layout */}
          <div className="pt-[112px] pb-24 px-4">
            <div className="relative h-[calc(100vh-220px)] w-full">
              <AnimatePresence mode="popLayout">
                {profiles.map((profile, index) => (
                  <SwipeCard
                    key={`${profile.userId}-${index}`}
                    profile={profile}
                    active={index === profiles.length - 1}
                    onSwipe={(dir) => handleSwipe(dir, profile)}
                    animate={
                      index === profiles.length - 1
                        ? currentSwipeDirection
                        : undefined
                    }
                    variants={{
                      right: {
                        x: "120%",
                        y: -30,
                        rotate: 20,
                        opacity: 0,
                        transition: { duration: 0.2 },
                      },
                      left: {
                        x: "-120%",
                        y: -30,
                        rotate: -20,
                        opacity: 0,
                        transition: { duration: 0.2 },
                      },
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-background/80 backdrop-blur-lg border-t border-pink-600 dark:border-pink-500">
            <div className="px-6 py-4">
              <SwipeControls
                onSwipeLeft={() =>
                  profiles.length > 0 &&
                  handleSwipe("left", profiles[profiles.length - 1])
                }
                onSwipeRight={() =>
                  profiles.length > 0 &&
                  handleSwipe("right", profiles[profiles.length - 1])
                }
                onUndo={handleUndo}
                disabled={swipedProfiles.length === 0}
              />
            </div>
          </div>
        </>
      ) : (
        <EmptyMobileView
          currentUser={currentUser}
          onShare={handleShare}
        
        
        />
      )}

      {/* Modals */}
      <MobileCrushesModal
        isOpen={showCrushes}
        onClose={() => setShowCrushes(false)}
        profiles={likedProfiles}
        onUnlike={async (profileId) => {
          const result = await undoLastSwipe(profileId);
          if (result.success) {
            setLikedProfiles((prev) =>
              prev.filter((p) => p.userId !== profileId)
            );
            toast({
              title: "Profile unliked",
              description: "The profile has been removed from your likes",
            });
          } else {
            toast({
              title: "Error",
              description: "Failed to unlike profile. Please try again.",
              variant: "destructive",
            });
          }
        }}
      />

      {showMatch && matchedProfile && (
        <MatchModal
          isOpen={showMatch}
          currentUserProfile={currentUserProfile}
          onClose={() => setShowMatch(false)}
          matchedProfile={matchedProfile}
          currentUser={currentUser}
        />
      )}

      {selectedProfile && (
        <MobileViewMore
          profile={selectedProfile}
          isOpen={!!selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onLike={() => {
            const profileId = selectedProfile.userId;
            const profile = likedByProfiles.find((p) => p.userId === profileId);
            if (profile) {
              const updatedProfile = {
                ...profile,
                isMatch: true,
              } satisfies Profile;
              setMatchedProfile(updatedProfile);
              setShowMatch(true);
              setLikedByProfiles((prev) =>
                prev.filter((p) => p.userId !== profileId)
              );
              setSelectedProfile(null);
            }
          }}
        />
      )}
    </div>
  );
}
