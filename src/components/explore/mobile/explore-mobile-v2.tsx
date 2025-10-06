/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Profile } from "@/db/schema";
import { SimpleSwipeableCard } from "../cards/simple-swipeable-card";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, User2, Star, MessageCircle, RotateCcw, X, Sparkles, Settings, LogOut } from "lucide-react";
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
import { ProfileDetailsModal } from "../profile-details-modal";
import { useInterval } from "@/hooks/use-interval";
import { handleLike } from "@/lib/actions/like.actions";
import { MatchesModal } from "../modals/matches-modal";
import { MatchesModalWithMessaging } from "../modals/matches-modal-with-messaging";
import { FeedbackModal } from "@/components/shared/feedback-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { MatchToMessageNav } from "@/components/messaging/match-to-message-nav";
import { getStalkers } from "@/lib/actions/stalker.actions";
import { Badge } from "@/components/ui/badge";
import { MobileNavbar } from "./mobile-navbar";
import { Suspense } from "react";
import dynamic from "next/dynamic";

// Add a type definition for ProfileDetailsType
interface ProfileDetailsType {
  firstName?: string;
  age?: number;  
  course?: string;
  yearOfStudy?: number;
  bio?: string;
  interests?: string[];
  photos?: string[];
  profilePhoto?: string;
  lookingFor?: string;
  anonymous?: boolean;
  anonymousAvatar?: string;
  anonymousRevealRequested?: boolean;
}

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
  currentUserProfile,
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
  const searchParams = useSearchParams();

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

  // Preload chat data on component mount and handle query parameters
  useEffect(() => {
    // Check if we should open matches modal from query param
    const showParam = searchParams.get('show');
    if (showParam === 'matches') {
      setShowMatches(true);
      // Clear the query param after opening the modal
      window.history.replaceState({}, '', '/matches');
    }
    
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
  }, [isChatLoaded, searchParams]);

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
        // First filter out profiles that are already matches
        const filteredLikes = likesResult.profiles.filter(
          (profile: Profile) =>
            !matchesResult.matches?.some(
              (match) => match.userId === profile.userId
            )
        );
        
        // Deduplicate likes by userId to prevent React key conflicts
        const uniqueLikes = filteredLikes.reduce((acc: Profile[], current: Profile) => {
          if (!acc.some(profile => profile.userId === current.userId)) {
            acc.push(current);
          }
          return acc;
        }, []);
        
        setLikes(uniqueLikes);
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

  // Add convertToProfileDetailsType function
  const convertToProfileDetailsType = (profile: Profile | null): ProfileDetailsType | null => {
    if (!profile) return null;
    
    return {
      firstName: profile.firstName,
      age: profile.age !== null ? profile.age : undefined,
      course: profile.course || undefined,
      yearOfStudy: profile.yearOfStudy !== null ? profile.yearOfStudy : undefined,
      bio: profile.bio || undefined,
      interests: profile.interests || undefined,
      photos: profile.photos || undefined,
      profilePhoto: profile.profilePhoto || undefined,
      lookingFor: profile.lookingFor || undefined,
      anonymous: profile.anonymous || undefined,
      anonymousAvatar: profile.anonymousAvatar || undefined,
      anonymousRevealRequested: profile.anonymousRevealRequested || undefined
    };
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
            currentUserProfile={currentUserProfile}
            matchId={selectedChatId}
            onClose={() => setSelectedChatId(null)}
            partner={matches.find((match) => match.matchId === selectedChatId) as Profile}
          />
        </div>
      )}

      <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden bg-gradient-to-b from-pink-50 to-white dark:from-gray-900 dark:to-gray-950 pt-12">
        {profiles.length > 0 ? (
          <>
            {/* Card Container - Better spacing and alignment */}
            <div className="relative w-full h-[calc(100vh-16rem)] max-w-sm mx-auto px-4">
              <AnimatePresence mode="popLayout">
                {visibleProfiles.map((profile, index) => {
                  const isActive = index === 0;
                  const zIndex = visibleProfiles.length - index;
                  const scale = 1 - index * 0.03;
                  const yOffset = index * 6;

                  return (
                    <motion.div
                      key={profile.userId}
                      className="absolute inset-0"
                      style={{ 
                        zIndex,
                        scale,
                        y: yOffset
                      }}
                      initial={{ scale: 0.8, opacity: 0, y: 50 }}
                      animate={{ 
                        scale, 
                        opacity: isActive ? 1 : 0.8, 
                        y: yOffset 
                      }}
                      exit={{ 
                        scale: 0.8, 
                        opacity: 0, 
                        y: -50,
                        transition: { duration: 0.2 }
                      }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 300, 
                        damping: 30 
                      }}
                    >
                      <SimpleSwipeableCard
                        profile={profile as Profile & { photos?: string[] }}
                        onSwipe={isActive ? handleSwipe : () => {}}
                        active={isActive}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Modern Swipe Controls - Better positioned and styled */}
            <div className="fixed bottom-20 left-0 right-0 px-6 z-50">
              <div className="flex items-center justify-center gap-4 max-w-sm mx-auto">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-full border-2 border-blue-300 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all duration-200 shadow-lg"
                  onClick={handleRevert}
                  disabled={swipedProfiles.length === 0 || isAnimating}
                >
                  <RotateCcw className="h-5 w-5 text-blue-500" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-14 w-14 rounded-full border-2 border-red-300 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-all duration-200 hover:scale-110 shadow-lg"
                  onClick={() => handleSwipe("left")}
                  disabled={isAnimating || currentIndex < 0}
                >
                  <X className="h-6 w-6 text-red-500" strokeWidth={2.5} />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-16 w-16 rounded-full border-2 border-pink-300 hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-pink-950 transition-all duration-200 hover:scale-110 shadow-xl bg-white dark:bg-gray-800"
                  onClick={() => handleSwipe("right")}
                  disabled={isAnimating || currentIndex < 0}
                >
                  <Heart className="h-7 w-7 text-pink-500 fill-pink-500" strokeWidth={2} />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-14 w-14 rounded-full border-2 border-yellow-300 hover:border-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-950 transition-all duration-200 hover:scale-110 shadow-lg"
                  onClick={() => {
                    toast({
                      title: "⭐ Super Like Coming Soon!",
                      description: "This feature will be available soon",
                      className: "bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-none",
                    });
                  }}
                  disabled={isAnimating}
                >
                  <Sparkles className="h-6 w-6 text-yellow-500 fill-yellow-500" strokeWidth={2} />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950 transition-all duration-200 shadow-lg"
                  onClick={() => {
                    toast({
                      title: "⚙️ Settings",
                      description: "Settings panel coming soon",
                      className: "bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-none",
                    });
                  }}
                >
                  <Settings className="h-5 w-5 text-purple-500" />
                </Button>
              </div>
            </div>

            {/* Bottom Navigation - Modern design with better spacing */}
            <div className="fixed bottom-0 left-0 right-0 h-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-around items-center h-20 px-4 max-w-md mx-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMatches(true)}
                  className="relative flex flex-col items-center gap-1 h-16 w-16 rounded-xl hover:bg-pink-50 dark:hover:bg-pink-950/20"
                >
                  <Heart className="h-6 w-6 text-pink-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Matches</span>
                  {!hasLoadedMatches ? (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-pink-500/30 animate-pulse" />
                  ) : (
                    matches.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-xs bg-pink-500 text-white font-medium">
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
                  className="relative flex flex-col items-center gap-1 h-16 w-16 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/20"
                >
                  <MessageCircle className="h-6 w-6 text-blue-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Chat</span>
                  {unreadMessages.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative flex flex-col items-center gap-1 h-16 w-16 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Avatar className="h-6 w-6 ring-2 ring-gray-200 dark:ring-gray-700">
                        <AvatarImage
                          src={currentUser?.image || undefined}
                          alt={currentUser?.name || "User"}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-500 text-white text-xs">
                          {currentUser?.name?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Profile</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 p-2 backdrop-blur-lg bg-white/95 dark:bg-gray-900/95 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl"
                  >
                    <DropdownMenuItem asChild>
                      <Link
                        href="/profile"
                        className="flex items-center px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                      >
                        <User2 className="mr-2 h-4 w-4 text-gray-600 dark:text-gray-400" />
                        <span>Edit Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="flex items-center px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors duration-200 mt-1"
                      onClick={() => signOut()}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLikes(true)}
                  className="relative flex flex-col items-center gap-1 h-16 w-16 rounded-xl hover:bg-yellow-50 dark:hover:bg-yellow-950/20"
                >
                  <Star className="h-6 w-6 text-yellow-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Likes</span>
                  {!hasLoadedLikes ? (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-yellow-500/30 animate-pulse" />
                  ) : (
                    likes.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-xs bg-yellow-500 text-white font-medium">
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
            onShare={() => {}}
            currentUser={currentUser}
          />
        )}

        {/* Modals */}
        <MatchesModalWithMessaging
          isOpen={showMatches}
          onClose={() => setShowMatches(false)}
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

        <ProfileDetailsModal
          isOpen={!!previewProfile}
          onClose={() => setPreviewProfile(null)}
          profile={convertToProfileDetailsType(previewProfile) || {}}
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
