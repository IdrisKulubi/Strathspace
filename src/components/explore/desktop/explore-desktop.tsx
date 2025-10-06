

"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Profile } from "@/db/schema";
import { SwipeableCard } from "../cards/swipeable-card";
import { AnimatePresence, motion } from "framer-motion";
import { recordSwipe, undoLastSwipe, getMatches, getLikedByProfiles } from "@/lib/actions/explore.actions";
import { useToast } from "@/hooks/use-toast";
import { useInterval } from "@/hooks/use-interval";
import confetti from "canvas-confetti";
import { getChats } from "@/lib/actions/chat.actions";
import { ChatWindow } from "@/components/chat/chat-window";
import { NoMoreProfiles } from "../empty-state";
import { SwipeControls } from "../controls/swipe-controls";
import { ProfileDetailsModal } from "../profile-details-modal";
import { SimplifiedExplorePage } from './simplified-explore-page';

interface ExploreDesktopProps {
  initialProfiles: Profile[];
  currentUserProfile: Profile;
  currentUser: { id: string; image: string; name: string; email: string };
  likedProfiles: Profile[];
  likedByProfiles: Profile[];
  markAsRead: (matchId: string) => void;
}

// Define a type for the chat partner to avoid using 'any'
interface ChatPartner extends Omit<Profile, 'age'> {
  age: number | null;
  matchId?: string;
}

// Define a type that matches the ProfileDetailsModal requirements
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
  anonymous: boolean;
  anonymousAvatar?: string;
  anonymousRevealRequested: boolean;
}

// Helper: dedupe arrays by userId to avoid duplicate keys in lists
function dedupeByUserId<T extends { userId: string }>(arr: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of arr) {
    if (!map.has(item.userId)) map.set(item.userId, item);
  }
  return Array.from(map.values());
}

export function ExploreDesktop({
  initialProfiles,
  currentUser,
  currentUserProfile,
  markAsRead,
  likedProfiles: initialLikedProfiles,
  likedByProfiles: initialLikedByProfiles,
}: ExploreDesktopProps) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [currentIndex, setCurrentIndex] = useState(initialProfiles.length - 1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [swipedProfiles, setSwipedProfiles] = useState<Profile[]>([]);
  const [isChatLoaded, setIsChatLoaded] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("discover");
  const [previewProfile, setPreviewProfile] = useState<Profile | null>(null);
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

const [matches, setMatches] = useState<Profile[]>(
    dedupeByUserId(initialLikedProfiles.filter((p) => p.isMatch))
  );

  const [likes, setLikes] = useState<Profile[]>(initialLikedByProfiles);

  const { toast } = useToast();

  const visibleProfiles = useMemo(() => {
    if (currentIndex < 0) return [];


    const buffer = [];
    for (let i = 0; i < 5; i++) {
      const index = currentIndex - i;
      if (index >= 0 && profiles[index]) {
        buffer.push(profiles[index]);
      }
    }
    return buffer;
  }, [currentIndex, profiles]);

  const syncMatchesAndLikes = useCallback(async () => {
    try {
      const [matchesResult, likesResult] = await Promise.all([
        getMatches(),
        getLikedByProfiles(),
      ]);

      if (matchesResult.matches) {
        const newMatches = matchesResult.matches as unknown as Profile[];

        const currentMatchesKey = matches.map(m => m.userId).sort().join(',');
        const newMatchesKey = newMatches.map(m => m.userId).sort().join(',');

        if (currentMatchesKey !== newMatchesKey) {
setMatches(dedupeByUserId(newMatches));
}
      }

      if (likesResult.profiles) {
        const filteredLikes = likesResult.profiles.filter(
          (profile: Profile) =>
            !matchesResult.matches?.some(
              (match) => match.userId === profile.userId
            )
        );

        // Deduplicate filteredLikes by userId
        const uniqueFilteredLikes = filteredLikes.reduce((acc, current) => {
          if (!acc.some(item => item.userId === current.userId)) {
            acc.push(current);
          }
          return acc;
        }, [] as Profile[]);

        // Only update if there's a difference
        const currentLikesKey = likes.map(l => l.userId).sort().join(',');
        const newLikesKey = uniqueFilteredLikes.map(l => l.userId).sort().join(',');

        if (currentLikesKey !== newLikesKey) {
          setLikes(uniqueFilteredLikes);
        }
      }
    } catch (error) {
      console.error("Error syncing matches and likes:", error);
    }
  }, [matches, likes]);

  // Initial sync
  useEffect(() => {
    syncMatchesAndLikes();
  }, [syncMatchesAndLikes]);

  useInterval(syncMatchesAndLikes, 30000);

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

      // Start recording the swipe immediately but don't await it
      const swipePromise = recordSwipe(
        profiles[currentIndex].userId,
        direction === "right" ? "like" : "pass"
      );

      // Reduce the animation time for faster transitions
      setTimeout(() => {
        setCurrentIndex((prev) => prev - 1);
        setSwipeDirection(null);
        setIsAnimating(false);
      }, 150); // Reduced from 300ms to 150ms for faster transitions

      // Process the result after the animation has started
      const result = await swipePromise;

      if (direction === "right") {
        setSwipedProfiles((prev) => [...prev, profiles[currentIndex]]);

        if (result.isMatch) {
          const updatedProfile = {
            ...profiles[currentIndex],
            isMatch: true,
            matchId: result.matchedProfile?.id,
          } satisfies Profile;
          setMatchedProfile(updatedProfile);
setMatches((prev) => dedupeByUserId([...prev, updatedProfile]));

          // Trigger confetti
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.3, x: 0.5 },
          });

          toast({
            title: "It's a match ✨",
            description: `You matched with ${updatedProfile.firstName}! Start chatting now!`,
            className: "bg-gradient-to-r from-pink-500 to-purple-500 text-white border-none",
          });
        } else {
          toast({
            title: "Yasss 💖",
            description: `You liked ${profiles[currentIndex].firstName}! Fingers crossed for a match!`,
            variant: "default",
            className:
              "bg-gradient-to-r from-pink-500 to-purple-500 text-white border-none",
          });
        }
      } else {
        setSwipedProfiles((prev) => [...prev, profiles[currentIndex]]);
      }
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

    toast({
      title: "Time Machine Activated ⏰",
      description: "Brought back the last profile for another chance",
      variant: "default",
      className:
        "bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-none",
    });
  }, [swipedProfiles, toast]);

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

  useInterval(() => {
    if (isChatLoaded && activeTab === "messages") {
      console.time('Background chat update');
      getChats().then((result) => {
        const currentChatsKey = cachedChats.map(c => `${c.matchId}-${c.lastMessage.createdAt}`).join(',');
        const newChatsKey = result.map(c => `${c.matchId}-${c.lastMessage.createdAt}`).join(',');

        if (currentChatsKey !== newChatsKey) {
          console.log('Chat data changed, updating state');
          setCachedChats(result);
        } else {
          console.log('No chat data changes detected');
        }
        console.timeEnd('Background chat update');
      }).catch(error => {
        console.error('Error updating chat data:', error);
        console.timeEnd('Background chat update');
      });
    }
  }, 30000);

  const handleSelectChat = (matchId: string) => {
    console.time('Chat selection');
    setSelectedChatId(matchId);
    setActiveTab("messages");
    console.timeEnd('Chat selection');
  };

  const handleViewProfile = (profile: Profile) => {
    setPreviewProfile(profile);
  };


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
      anonymous: profile.anonymous || false,
      anonymousAvatar: profile.anonymousAvatar || undefined,
      anonymousRevealRequested: profile.anonymousRevealRequested || false
    };
  };

  return (
    <SimplifiedExplorePage
      matches={matches}
      likesSent={swipedProfiles} // Or a new state for likes sent
      chats={cachedChats}
      currentUser={currentUser}
      currentUserProfile={currentUserProfile}
      onSelectChat={handleSelectChat}
      onViewProfile={handleViewProfile}
      markAsRead={markAsRead}
    >
      {activeTab === 'discover' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="h-full flex flex-col items-center justify-center relative bg-gradient-to-b from-pink-100/20 to-transparent dark:from-pink-950/20 pt-4"
        >
          {profiles.length > 0 && currentIndex >= 0 ? (
            <div className="relative w-full max-w-[340px] mx-auto h-[calc(100vh-6rem)] mb-16">
              {/* Remove debug element in production */}
              {process.env.NODE_ENV !== 'production' && (
                <div className="fixed top-0 left-0 bg-white p-2 text-xs z-[999]" style={{ pointerEvents: 'none' }}>
                  Debug: {profiles[currentIndex]?.firstName} | Swipeable ({currentIndex + 1}/{profiles.length})
                </div>
              )}

              <AnimatePresence>
                {profiles[currentIndex] && (
                  (() => {

                    return (
                      <>
                        <div className="w-full h-full relative" style={{ touchAction: 'manipulation' }}>
                          <SwipeableCard
                            key={profiles[currentIndex].userId}
                            profile={
                              profiles[currentIndex] as Profile & { photos?: string[] }
                            }
                            onSwipe={(direction) => {
                              console.log('[ExploreDesktop] Swipe detected:', direction);
                              console.log('[ExploreDesktop] Troubleshooting Swiper props issue');
                              handleSwipe(direction);
                            }}
                            active={true}
                            customStyles={{
                              card: "w-full h-full rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900",
                              image: "h-full w-full object-cover",
                              info: "absolute bottom-0 left-0 right-0 p-5 pb-20 bg-gradient-to-t from-black/80 via-black/50 to-transparent text-white",
                              name: "text-2xl font-bold mb-1",
                              details: "text-sm opacity-90 mb-3",
                              bio: "text-sm opacity-80 line-clamp-3",
                            }}
                          />
                        </div>

                        {visibleProfiles.slice(1).map((profile, idx) => (
                          <div
                            key={`preload-${profile.userId}`}
                            className={idx < 2 ? "absolute inset-0 opacity-0 pointer-events-none" : "hidden"}
                          >
                            <SwipeableCard
                              profile={profile as Profile & { photos: string[] }}
                              onSwipe={() => { }}
                              active={false}
                              customStyles={{
                                card: "w-full h-full rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900",
                                image: "h-full w-full object-cover",
                                info: "absolute bottom-0 left-0 right-0 p-5 pb-20 bg-gradient-to-t from-black/80 via-black/50 to-transparent text-white",
                                name: "text-2xl font-bold mb-1",
                                details: "text-sm opacity-90 mb-3",
                                bio: "text-sm opacity-80 line-clamp-3 mb-3",
                              }}
                            />
                          </div>
                        ))}
                      </>
                    );
                  })()
                )}
              </AnimatePresence>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="absolute -bottom-16 left-0 right-0"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <SwipeControls
                  onSwipeLeft={() => {
                    handleSwipe("left");
                  }}
                  onSwipeRight={() => {
                    handleSwipe("right");
                  }}
                  onUndo={() => {
                    handleRevert();
                  }}
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
                  currentProfileId={profiles[currentIndex]?.userId}
                  className="mx-auto max-w-md px-6 py-4"
                />
              </motion.div>
            </div>
          ) : (
            <NoMoreProfiles
              initialLikedProfiles={matches}
              currentUser={currentUserProfile}
            />
          )}
        </motion.div>
      )}
      {activeTab === 'messages' && selectedChatId && (
        <ChatWindow
          matchId={selectedChatId}
          onClose={() => setSelectedChatId(null)}
          partner={matches.find((match) => match.matchId === selectedChatId) as ChatPartner}
          currentUserProfile={currentUserProfile}
        />
      )}
      <ProfileDetailsModal
        isOpen={!!previewProfile}
        onClose={() => setPreviewProfile(null)}
        profile={convertToProfileDetailsType(previewProfile) as ProfileDetailsType}
      />
    </SimplifiedExplorePage>
  );
}
