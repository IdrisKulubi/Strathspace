/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Profile } from "@/db/schema";
import { SwipeableCard } from "../cards/swipeable-card";
import { AnimatePresence } from "framer-motion";
import { Heart, User2, Star, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  recordSwipe,
  undoLastSwipe,
  getMatches,
  getLikedByProfiles,
} from "@/lib/actions/explore.actions";
import { useToast } from "@/hooks/use-toast";
import { EmptyMobileView } from "../cards/empty-mobile";
import { LikesModal } from "../modals/likes-modal";
import { ProfilePreviewModal } from "../modals/profile-preview-modal";
import { useInterval } from "@/hooks/use-interval";
import { handleLike } from "@/lib/actions/like.actions";
import { MatchesModal } from "../modals/matches-modal";
import { FeedbackModal } from "@/components/shared/feedback-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { SwipeControls } from "../controls/swipe-controls";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { ChatSection } from "@/components/chat/chat-modal";
import { getChats } from "@/lib/actions/chat.actions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChatWindow } from "@/components/chat/chat-window";
import { getStalkers } from "@/lib/actions/stalker.actions";
import { Badge } from "@/components/ui/badge";
import { MobileNavbar } from "./mobile-navbar";
import { Suspense } from "react";
import dynamic from "next/dynamic";

interface ExploreMobileV2Props {
  initialProfiles: Profile[];
  currentUserProfile: Profile;
  currentUser: { id: string; image: string; name: string };
  likedProfiles: Profile[];
  likedByProfiles: Profile[];
  markAsRead: (matchId: string) => void;  
}

// Dynamically import LikesModalServer with client-side rendering (no SSR)
const LikesModalServer = dynamic(
  () => import("../modals/likes-modal-server"),
  { ssr: false }
);

export function ExploreMobileV2({
  initialProfiles,
  currentUser,
  markAsRead,
  likedProfiles: initialLikedProfiles,
  likedByProfiles: initialLikedByProfiles,
}: ExploreMobileV2Props) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [currentIndex, setCurrentIndex] = useState(initialProfiles.length - 1);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(
    null
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [swipedProfiles, setSwipedProfiles] = useState<Profile[]>([]);
  const [showMatches, setShowMatches] = useState(false);
  const [showLikes, setShowLikes] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isChatLoaded, setIsChatLoaded] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showChatList, setShowChatList] = useState(false);
  // Add loading states for matches and likes
  const [isMatchesLoading, setIsMatchesLoading] = useState(true);
  const [isLikesLoading, setIsLikesLoading] = useState(true);
  // Add a state for cached chat data with proper typing
  const [cachedChats, setCachedChats] = useState<Array<{
    id: string;
    userId: string;
    firstName?: string;
    lastName?: string;
    profilePhoto: string | null;
    matchId: string;
    lastMessage: {
      content: string;
      createdAt: Date;
      isRead: boolean;
      senderId: string;
    };
  }>>([]);

  // Initialize matches from likedProfiles where isMatch is true
  const [matches, setMatches] = useState<Profile[]>(
    initialLikedProfiles.filter((p) => p.isMatch)
  );

  // Initialize likes from likedByProfiles
  const [likes, setLikes] = useState<Profile[]>(initialLikedByProfiles);

  const [previewProfile, setPreviewProfile] = useState<Profile | null>(null);
  const { toast } = useToast();
  const unreadMessages = useUnreadMessages(currentUser.id);

  // Preload buffer for profiles - Improved to load more profiles in advance
  const visibleProfiles = useMemo(() => {
    if (currentIndex < 0) return [];
    
    // Get the current profile and the next few profiles for preloading
    // Preload 5 profiles for better performance
    const buffer = [];
    for (let i = 0; i < 5; i++) {
      const index = currentIndex - i;
      if (index >= 0 && profiles[index]) {
        buffer.push(profiles[index]);
      }
    }
    return buffer;
  }, [currentIndex, profiles]);

  // Preload chat data on component mount
  useEffect(() => {
    if (!isChatLoaded) {
      console.time('Initial chat data preloading');
      getChats().then((result) => {
        console.timeEnd('Initial chat data preloading');
        console.log('Initial preloaded chat data size:', result.length);
        setCachedChats(result);
        setIsChatLoaded(true);
      }).catch(error => {
        console.error('Error preloading chat data:', error);
        console.timeEnd('Initial chat data preloading');
      });
    }
  }, [isChatLoaded]);

  // Periodically refresh chat data in the background
  useInterval(() => {
    if (isChatLoaded) {
      // Silent background refresh
      getChats().then((result) => {
        setCachedChats(result);
      }).catch(error => {
        console.error('Error refreshing chat data:', error);
      });
    }
  }, 30000); 

  // Add new states for loading indicators
  const [hasLoadedMatches, setHasLoadedMatches] = useState(false);
  const [hasLoadedLikes, setHasLoadedLikes] = useState(false);

  // Fetch and sync matches and likes
  const syncMatchesAndLikes = useCallback(async () => {
    try {
      setIsMatchesLoading(true);
      setIsLikesLoading(true);
      const [matchesResult, likesResult] = await Promise.all([
        getMatches(),
        getLikedByProfiles(),
      ]);

      if (matchesResult.matches) {
        setMatches(matchesResult.matches as unknown as Profile[]);
        setIsMatchesLoading(false);
        setHasLoadedMatches(true);
      }

      if (likesResult.profiles) {
        const newLikes = likesResult.profiles.filter(
          (profile: Profile) =>
            !matchesResult.matches?.some(
              (match) => match.userId === profile.userId
            )
        );
        setLikes(newLikes);
        setIsLikesLoading(false);
        setHasLoadedLikes(true);
      }
    } catch (error) {
      console.error("Error syncing matches and likes:", error);
      setIsMatchesLoading(false);
      setIsLikesLoading(false);
      setHasLoadedMatches(true);
      setHasLoadedLikes(true);
    }
  }, []);

  // Only sync on mount and when a change is detected
  useEffect(() => {
    syncMatchesAndLikes();
  }, [syncMatchesAndLikes]);

  useEffect(() => {
    if (swipedProfiles.length > 0) {
      syncMatchesAndLikes();
    }
  }, [swipedProfiles, syncMatchesAndLikes]);

  const handleSwipe = useCallback(
    async (direction: "left" | "right") => {
      if (isAnimating || !profiles[currentIndex]) return;

      setIsAnimating(true);
      setSwipeDirection(direction);

      const swipePromise = recordSwipe(
        profiles[currentIndex].userId,
        direction === "right" ? "like" : "pass"
      );

      setTimeout(() => {
        setCurrentIndex((prev) => prev - 1);
        setSwipeDirection(null);
        setIsAnimating(false);
      }, 150);

      const result = await swipePromise;

      if (direction === "right") {
        setSwipedProfiles((prev) => [...prev, profiles[currentIndex]]);
        
        if (result.isMatch && result.matchedProfile) {
          setMatches((prev) => {
            if (prev.some((p) => p.userId === result.matchedProfile!.userId)) {
              return prev;
            }
            return [...prev, result.matchedProfile!];
          });

          setMatchedProfile(result.matchedProfile);
        }
      } else {
        setSwipedProfiles((prev) => [...prev, profiles[currentIndex]]);
      }
    },
    [currentIndex, isAnimating, profiles]
  );

  const handleRevert = useCallback(async () => {
    if (swipedProfiles.length === 0) return;

    const lastProfile = swipedProfiles[swipedProfiles.length - 1];
    await undoLastSwipe(lastProfile.userId);

    setProfiles((prev) => [...prev, lastProfile]);
    setSwipedProfiles((prev) => prev.slice(0, -1));
    setCurrentIndex((prev) => prev + 1);

    toast({
      title: "Time Machine Activated ⏰",
      description: "Brought back the last profile for another chance",
      variant: "default",
      className:
        "bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-none",
    });
  }, [swipedProfiles, toast]);

  const handleLikeBack = async (userId: string) => {
    try {
      const result = await handleLike(userId);
      if (result.success) {
        setLikes((prev) => prev.filter((profile) => profile.userId !== userId));

        if (result.isMatch && result.matchedProfile) {
          setMatches((prev) => {
            if (prev.some((p) => p.userId === result.matchedProfile!.userId)) {
              return prev;
            }
            return [...prev, result.matchedProfile!];
          });

          setMatchedProfile(result.matchedProfile);

          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });

          toast({
            title: "It's a match ✨",
            description: "You can now chat with each other",
            className:
              "bg-gradient-to-r from-pink-500 to-purple-500 text-white border-none",
          });
        }

        await syncMatchesAndLikes();
      }
      return result;
    } catch (error) {
      console.error("Error in handleLikeBack:", error);
      toast({
        title: "Oops! 🙈",
        description: "Something went wrong while matching. Try again!",
        variant: "destructive",
      });
      return { success: false };
    }
  };

  const handleUnlike = async (
    userId: string
  ): Promise<{ success: boolean }> => {
    try {
      const response = await fetch(`/api/profile/unlike`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUserId: userId }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setLikes((prev) => prev.filter((profile) => profile.userId !== userId));
        setMatches((prev) =>
          prev.filter((profile) => profile.userId !== userId)
        );

        syncMatchesAndLikes();
      }
      return result;
    } catch (error) {
      console.error("Error in handleUnlike:", error);
      return { success: false };
    }
  };

  const handleChatHover = useCallback(() => {
    if (!isChatLoaded) {
      console.time('Chat data preloading');
      getChats().then((result) => {
        console.timeEnd('Chat data preloading');
        console.log('Preloaded chat data size:', JSON.stringify(result).length, 'bytes');
        setCachedChats(result);
        setIsChatLoaded(true);
      }).catch(error => {
        console.error('Error preloading chat data:', error);
        console.timeEnd('Chat data preloading');
      });
    }
  }, [isChatLoaded]);

  useEffect(() => {
    const handleCloseChatSection = () => {
      setShowChat(false);
    };

    window.addEventListener('closeChatSection', handleCloseChatSection);

    return () => {
      window.removeEventListener('closeChatSection', handleCloseChatSection);
    };
  }, []);

  const handleSelectChat = (matchId: string) => {
    setSelectedChatId(matchId);
    setShowChatList(false);
  };

  return (
    <div className="relative h-full">
        <MobileNavbar />
      <Sheet open={showChatList} onOpenChange={setShowChatList}>
        <SheetContent side="right" className="w-full sm:w-[400px] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Messages</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-4rem)] overflow-hidden">
            <ChatSection 
              currentUser={currentUser} 
              onSelectChat={handleSelectChat}
              markAsRead={markAsRead}
              initialChats={cachedChats}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Chat Window Overlay */}
      {selectedChatId && (
        <div className="fixed inset-0 z-50 bg-background animate-slide-in">
          <ChatWindow
            matchId={selectedChatId}
            onClose={() => setSelectedChatId(null)}
            partner={matches.find((match) => match.matchId === selectedChatId) as Profile}
          />
        </div>
      )}

      <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden bg-background pt-12">
        {profiles.length > 0 ? (
          <>
            {/* Make card edge-to-edge on mobile */}
            <div className="relative w-full max-w-full mx-0" style={{ height: 'calc(100vh - 56px - 50px - 56px)' }}>
              <AnimatePresence>
                {profiles[currentIndex] && (
                  <>
                    <div className="w-full h-full relative" style={{ touchAction: 'manipulation' }}>
                      <SwipeableCard
                        key={profiles[currentIndex].userId}
                        profile={
                          profiles[currentIndex] as Profile & { photos?: string[] }
                        }
                        onSwipe={handleSwipe}
                        active={true}
                      />
                    </div>
                    
                    {/* Preload the next profiles (hidden but loaded in DOM) */}
                    {visibleProfiles.slice(1).map((profile, idx) => (
                      <div 
                        key={`preload-${profile.userId}-${idx}`} 
                        className={idx < 2 ? "absolute inset-0 opacity-0 pointer-events-none" : "hidden"}
                      >
                        <SwipeableCard
                          profile={profile as Profile & { photos: string[] }}
                          onSwipe={() => {}}
                          active={false}
                        />
                      </div>
                    ))}
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Swipe Controls - Fixed at bottom - SMALLER FOR MOBILE */}
            <div className="fixed bottom-12 left-0 right-0 px-4 pb-4 z-50 flex justify-center">
              <SwipeControls
                onSwipeLeft={() => handleSwipe("left")}
                onSwipeRight={() => handleSwipe("right")}
                onUndo={handleRevert}
                onSuperLike={() => {
                  toast({
                    title: "bestie wait ⭐️✨",
                    description:
                      "super likes coming soon & they're gonna be lit fr fr 🔥",
                    className:
                      "bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-none",
                  });
                }}
                disabled={isAnimating || currentIndex < 0}
                className="mx-auto max-w-lg scale-90 sm:scale-100"
                currentProfileId={profiles[currentIndex]?.userId}
              />
            </div>

            {/* Bottom Navigation - evenly spaced icons */}
            <div className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border/50">
              <div className="flex justify-between items-center h-16 px-6 max-w-md mx-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMatches(true)}
                  className="relative"
                >
                  <Heart className="h-6 w-6 text-pink-500" />
                  {!hasLoadedMatches ? (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-pink-500/30 animate-pulse" />
                  ) : (
                    matches.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-xs bg-pink-500 text-white">
                        {matches.length}
                      </span>
                    )
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowChatList(true)}
                  onMouseEnter={handleChatHover}
                  className="relative"
                >
                  <MessageCircle className="h-6 w-6 text-blue-500" />
                  {unreadMessages.unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative hover:bg-accent/50 transition-colors duration-200"
                    >
                      <Avatar className="h-8 w-8 ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-200">
                        <AvatarImage
                          src={currentUser?.image || undefined}
                          alt={currentUser?.name || "User"}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-500 text-white">
                          {currentUser?.name?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 p-2 backdrop-blur-lg bg-white/90 dark:bg-gray-950/90 border border-border/50 shadow-lg shadow-primary/5"
                  >
                    <DropdownMenuItem asChild>
                      <Link
                        href="/profile"
                        className="flex items-center px-3 py-2 rounded-md hover:bg-accent/80 transition-colors duration-200"
                      >
                        <User2 className="mr-2 h-4 w-4 text-primary" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="flex items-center px-3 py-2 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors duration-200 mt-1"
                      onClick={() => signOut()}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <FeedbackModal />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLikes(true)}
                  className="relative"
                >
                  <Star className="h-6 w-6 text-yellow-500" />
                  {!hasLoadedLikes ? (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-yellow-500/30 animate-pulse" />
                  ) : (
                    likes.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-xs bg-yellow-500 text-white">
                        {likes.length}
                      </span>
                    )
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyMobileView
            likedProfiles={matches}
            onShare={() => {}}
            onUnlike={async () => {}}
            currentUser={currentUser}
          />
        )}

        {/* Modals */}
        <MatchesModal
          isOpen={showMatches}
          onClose={() => setShowMatches(false)}
          matches={matches}
          currentUser={currentUser}
        />

        {/* Replace with server component */}
        <Suspense fallback={null}>
          {showLikes && (
            <LikesModalServer
              isOpen={showLikes}
              onClose={() => setShowLikes(false)}
              onUpdate={syncMatchesAndLikes}
            />
          )}
        </Suspense>

        <ProfilePreviewModal
          isOpen={!!previewProfile}
          onClose={() => setPreviewProfile(null)}
          profile={previewProfile}
        />
      </div>
    </div>
  );
}

function StalkersCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      const newCount = await getStalkers();
      setCount(newCount.length);
    };
    updateCount();
    const interval = setInterval(updateCount, 10000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <Badge 
      variant="destructive" 
      className="absolute -top-2 -right-2 animate-pulse"
    >
      {count}
    </Badge>
  );
}
