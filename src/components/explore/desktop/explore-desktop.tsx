"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Profile } from "@/db/schema";
import { SwipeableCard } from "../cards/swipeable-card";
import { AnimatePresence, motion } from "framer-motion";
import { 
  Heart, 
  User2, 
  Star, 
  MessageCircle, 
  Settings, 
  LogOut, 
  Undo, 
  X, 
  Info,
  Users,
  Search,
  Filter,
  Sparkles,
  MessageSquare as FeedbackIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  recordSwipe,
  undoLastSwipe,
  getMatches,
  getLikedByProfiles,
} from "@/lib/actions/explore.actions";
import { useToast } from "@/hooks/use-toast";
import { LikesModal } from "../modals/likes-modal";
import { ProfileDetailsModal } from "../profile-details-modal";
import { useInterval } from "@/hooks/use-interval";
import { handleLike } from "@/lib/actions/like.actions";
import { MatchesModal } from "../modals/matches-modal";
import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import confetti from "canvas-confetti";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { ChatSection } from "@/components/chat/chat-modal";
import { getChats } from "@/lib/actions/chat.actions";
import { ChatWindow } from "@/components/chat/chat-window";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NoMoreProfiles } from "../empty-state";
import Image from "next/image";

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
  const [showMatches, setShowMatches] = useState(false);
  const [showLikes, setShowLikes] = useState(false);
  const [isChatLoaded, setIsChatLoaded] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("discover");
  const [previewProfile, setPreviewProfile] = useState<Profile | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Initialize matches from likedProfiles where isMatch is true
  const [matches, setMatches] = useState<Profile[]>(
    initialLikedProfiles.filter((p) => p.isMatch)
  );

  // Initialize likes from likedByProfiles
  const [likes, setLikes] = useState<Profile[]>(initialLikedByProfiles);

  const { toast } = useToast();
  const unreadMessages = useUnreadMessages(currentUser.id);

  // Preload buffer for profiles
  const visibleProfiles = useMemo(() => {
    if (currentIndex < 0) return [];
    
    // Get the current profile and the next few profiles for preloading
    const buffer = [];
    for (let i = 0; i < 3; i++) {
      const index = currentIndex - i;
      if (index >= 0 && profiles[index]) {
        buffer.push(profiles[index]);
      }
    }
    return buffer;
  }, [currentIndex, profiles]);

  // Fetch and sync matches and likes
  const syncMatchesAndLikes = useCallback(async () => {
    try {
      const [matchesResult, likesResult] = await Promise.all([
        getMatches(),
        getLikedByProfiles(),
      ]);

      if (matchesResult.matches) {
        setMatches(matchesResult.matches as unknown as Profile[]);
      }

      if (likesResult.profiles) {
        // Filter out profiles that are now matches
        const newLikes = likesResult.profiles.filter(
          (profile: Profile) =>
            !matchesResult.matches?.some(
              (match) => match.userId === profile.userId
            )
        );
        setLikes(newLikes);
      }
    } catch (error) {
      console.error("Error syncing matches and likes:", error);
    }
  }, []);

  // Initial sync
  useEffect(() => {
    syncMatchesAndLikes();
  }, [syncMatchesAndLikes]);

  // Periodic sync every 30 seconds
  useInterval(syncMatchesAndLikes, 30000);

  // Sync after any swipe action
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

      const result = await recordSwipe(
        profiles[currentIndex].userId,
        direction === "right" ? "like" : "pass"
      );

      if (direction === "right") {
        if (result.isMatch) {
          const updatedProfile = {
            ...profiles[currentIndex],
            isMatch: true,
            matchId: result.matchedProfile?.id,
          } satisfies Profile;
          setMatchedProfile(updatedProfile);
          setMatches((prev) => [...prev, updatedProfile]);
          
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
      }

      setSwipedProfiles((prev) => [...prev, profiles[currentIndex]]);

      setTimeout(() => {
        setCurrentIndex((prev) => prev - 1);
        setSwipeDirection(null);
        setIsAnimating(false);
      }, 300);
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

  const handleLikeBack = async (userId: string) => {
    try {
      const result = await handleLike(userId);
      if (result.success) {
        // Remove from likes immediately
        setLikes((prev) => prev.filter((profile) => profile.userId !== userId));

        if (result.isMatch && result.matchedProfile) {
          // Add to matches immediately
          setMatches((prev) => {
            // Avoid duplicate matches
            if (prev.some((p) => p.userId === result.matchedProfile!.userId)) {
              return prev;
            }
            return [...prev, result.matchedProfile!];
          });

          // Show match modal with the matched profile
          setMatchedProfile(result.matchedProfile);

          // Trigger confetti
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });

          toast({
            title: "It's a match! ✨",
            description: "You can now chat with each other!",
            className:
              "bg-gradient-to-r from-pink-500 to-purple-500 text-white border-none",
          });
        }

        // Sync with server to ensure consistency
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

  // Preload chat data when chat icon is hovered
  const handleChatHover = useCallback(() => {
    if (!isChatLoaded) {
      // Preload chat data
      getChats().then(() => {
        setIsChatLoaded(true);
      });
    }
  }, [isChatLoaded]);

  // Handle chat selection
  const handleSelectChat = (matchId: string) => {
    setSelectedChatId(matchId);
    setActiveTab("messages");
  };

  // Handle profile view
  const handleViewProfile = (profile: Profile) => {
    setPreviewProfile(profile);
  };

  // Handle unlike action - returns a Promise with success boolean
  const handleUnlike = async (userId: string): Promise<{ success: boolean }> => {
    try {
      // Implement the unlike functionality
      await handleUnlike(userId);
      
      // Update the local state
      setLikes((prev) => prev.filter((like) => like.userId !== userId));
      
      return { success: true };
    } catch (error) {
      console.error("Error unliking profile:", error);
      return { success: false };
    }
  };

  // Convert profile to the expected type for ProfileDetailsModal
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
    };
  };

  return (
    <div className="flex h-[calc(100vh-0rem)] overflow-hidden bg-background">
      {/* Left Sidebar */}
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="hidden lg:flex flex-col w-72 border-r border-border/40 bg-gradient-to-b from-pink-50/30 to-transparent dark:from-pink-950/20 h-full shadow-md"
      >
        <div className="p-4 border-b border-border/40 bg-gradient-to-r from-pink-100/30 to-transparent dark:from-pink-950/30">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12 ring-2 ring-pink-500/30 shadow-xl">
              <AvatarImage
                src={currentUser?.image || undefined}
                alt={currentUser?.name || "User"}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-500 text-white">
                {currentUser?.name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold truncate">{currentUser?.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {currentUser?.email}
              </p>
            </div>
          </div>
        </div>
        
        <ScrollArea className="flex-1 px-2 py-4">
          <div className="space-y-1 px-2">
            <Button 
              variant={activeTab === "discover" ? "default" : "ghost"} 
              className="w-full justify-start font-medium" 
              onClick={() => setActiveTab("discover")}
              size="lg"
            >
              <Search className="mr-2 h-4 w-4" />
              Discover
            </Button>
            
            <Button 
              variant={activeTab === "matches" ? "default" : "ghost"} 
              className="w-full justify-start relative font-medium" 
              onClick={() => setActiveTab("matches")}
              size="lg"
            >
              <Heart className="mr-2 h-4 w-4 text-pink-500" />
              Matches
              {matches.length > 0 && (
                <Badge className="ml-auto bg-pink-500 hover:bg-pink-600" variant="default">
                  {matches.length}
                </Badge>
              )}
            </Button>
            
            <Button 
              variant={activeTab === "likes" ? "default" : "ghost"} 
              className="w-full justify-start relative font-medium" 
              onClick={() => setActiveTab("likes")}
              size="lg"
            >
              <Star className="mr-2 h-4 w-4 text-amber-500" />
              Likes
              {likes.length > 0 && (
                <Badge className="ml-auto bg-amber-500 hover:bg-amber-600" variant="default">
                  {likes.length}
                </Badge>
              )}
            </Button>
            
            <Button 
              variant={activeTab === "messages" ? "default" : "ghost"} 
              className="w-full justify-start relative font-medium" 
              onClick={() => setActiveTab("messages")}
              onMouseEnter={handleChatHover}
              size="lg"
            >
              <MessageCircle className="mr-2 h-4 w-4 text-blue-500" />
              Messages
              {unreadMessages.unreadCount > 0 && (
                <Badge className="ml-auto bg-blue-500 hover:bg-blue-600" variant="default">
                  {unreadMessages.unreadCount}
                </Badge>
              )}
            </Button>
          </div>
          
          <Separator className="my-6" />
          
          <div className="px-2">
            <p className="text-xs font-medium text-muted-foreground mb-3 px-3 uppercase tracking-wider">Profile</p>
            <div className="space-y-1">
              <Button 
                variant="ghost" 
                className="w-full justify-start" 
                asChild
                size="lg"
              >
                <Link href="/profile">
                  <User2 className="mr-2 h-4 w-4" />
                  Edit Profile
                </Link>
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full justify-start" 
                asChild
                size="lg"
              >
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start"
                size="lg"
                onClick={() => setShowFeedbackModal(true)}
              >
                <FeedbackIcon className="mr-2 h-4 w-4" />
                Feedback
              </Button>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          <div className="px-4 pt-2">
            <Card className="bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-transparent border border-pink-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-pink-500" />
                  <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                    All Features Unlocked!
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-xs text-muted-foreground">
                  Enjoy unlimited likes, see who likes you, and all premium features for free!
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="px-4 pt-6">
            <Button 
              variant="destructive" 
              className="w-full justify-center hover:bg-destructive/90" 
              onClick={() => signOut()}
              size="lg"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
        </ScrollArea>
      </motion.div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          {/* Hidden TabsList for accessibility - we're using the sidebar for visual navigation */}
          <TabsList className="sr-only">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="likes">Likes</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>
          
          <TabsContent value="discover" className="flex-1 p-0 m-0">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="h-full flex flex-col items-center justify-center relative bg-gradient-to-b from-pink-100/20 to-transparent dark:from-pink-950/20 pt-4"
            >
              {profiles.length > 0 && currentIndex >= 0 ? (
                <div className="relative w-full max-w-md mx-auto h-[calc(100vh-8rem)]">
                  <AnimatePresence>
                    {profiles[currentIndex] && (
                      <>
                        <SwipeableCard
                          key={profiles[currentIndex].userId}
                          profile={
                            profiles[currentIndex] as Profile & { photos?: string[] }
                          }
                          onSwipe={handleSwipe}
                          active={true}
                        />
                        
                        {/* Preload the next profiles (hidden but loaded in DOM) */}
                        {visibleProfiles.slice(1).map((profile) => (
                          <div key={`preload-${profile.userId}`} className="hidden">
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
                  
                  {/* Swipe Controls */}
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-4"
                  >
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-12 w-12 rounded-full border-2 shadow-lg bg-blue-500/20 border-blue-500 transition-transform duration-200 hover:scale-110"
                      onClick={handleRevert}
                      disabled={isAnimating || swipedProfiles.length === 0}
                    >
                      <Undo className="h-5 w-5 text-blue-500" />
                    </Button>
                    
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-14 w-14 rounded-full border-2 shadow-lg bg-red-500/20 border-red-500 transition-transform duration-200 hover:scale-110"
                      onClick={() => handleSwipe("left")}
                      disabled={isAnimating || currentIndex < 0}
                    >
                      <X className="h-6 w-6 text-red-500" />
                    </Button>
                    
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-16 w-16 rounded-full border-2 shadow-lg bg-pink-500/20 border-pink-500 transition-transform duration-200 hover:scale-110"
                      onClick={() => handleSwipe("right")}
                      disabled={isAnimating || currentIndex < 0}
                    >
                      <Heart className="h-8 w-8 text-pink-500" />
                    </Button>
                    
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-12 w-12 rounded-full border-2 shadow-lg bg-amber-500/20 border-amber-500 transition-transform duration-200 hover:scale-110"
                      onClick={() => {
                        if (profiles[currentIndex]) {
                          handleViewProfile(profiles[currentIndex]);
                        }
                      }}
                      disabled={isAnimating || currentIndex < 0}
                    >
                      <Info className="h-5 w-5 text-amber-500" />
                    </Button>
                  </motion.div>
                </div>
              ) : (
                <NoMoreProfiles
                  initialLikedProfiles={matches}
                  currentUser={currentUserProfile}
                />
              )}
            </motion.div>
          </TabsContent>
          
          <TabsContent value="matches" className="flex-1 p-6 m-0 overflow-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="max-w-6xl mx-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">Your Matches</h2>
                <Button size="sm" variant="outline" className="gap-1">
                  <Filter className="h-4 w-4" /> Filter
                </Button>
              </div>

              <ScrollArea className="h-[calc(100vh-10rem)] pr-4">
                {matches.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {matches.map((match) => (
                      <motion.div
                        key={match.userId}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileHover={{ y: -5, transition: { duration: 0.2 } }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-border/40 bg-white/50 dark:bg-black/20 backdrop-blur-sm group">
                          <div className="aspect-[3/4] relative overflow-hidden">
                            <Image 
                              src={match.profilePhoto || ''} 
                              alt={match.firstName} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                              width={100}
                              height={100}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 opacity-80 group-hover:opacity-100 transition-opacity" />
                            
                            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <Button 
                                size="icon" 
                                variant="secondary"
                                className="h-8 w-8 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/40 text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewProfile(match);
                                }}
                              >
                                <Info className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="absolute bottom-3 left-3 text-white z-10">
                              <h3 className="font-bold text-lg">{match.firstName}, {match.age}</h3>
                              <p className="text-sm opacity-90">{match.course}</p>
                            </div>
                            
                            <div className="absolute inset-x-0 bottom-0 h-16 flex items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                              <div className="w-full py-2 px-3 bg-gradient-to-t from-black/80 via-black/70 to-transparent">
                                <div className="flex justify-between">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="px-3 bg-white/10 border-white/20 text-white backdrop-blur-sm hover:bg-white/20"
                                    onClick={() => handleViewProfile(match)}
                                  >
                                    Profile
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="px-3 bg-pink-500/90 border-pink-500/50 text-white hover:bg-pink-600 backdrop-blur-sm"
                                    onClick={() => handleSelectChat(match.matchId as string)}
                                  >
                                    Message
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-pink-50/30 dark:bg-pink-950/10 rounded-xl border border-pink-200/30 dark:border-pink-900/20">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <Users className="h-16 w-16 mx-auto text-pink-400/60 mb-4" />
                      <h3 className="text-xl font-medium mb-2">No matches yet</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        Keep swiping to find your perfect match! When you and someone else both like each other, you&apos;ll see them here.
                      </p>
                      <Button 
                        variant="default" 
                        className="mt-4 bg-gradient-to-r from-pink-500 to-purple-600"
                        onClick={() => setActiveTab("discover")}
                      >
                        Start Discovering
                      </Button>
                    </motion.div>
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          </TabsContent>
          
          <TabsContent value="likes" className="flex-1 p-6 m-0 overflow-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="max-w-6xl mx-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-pink-500 bg-clip-text text-transparent">People Who Like You</h2>
                <Button size="sm" variant="outline" className="gap-1">
                  <Filter className="h-4 w-4" /> Filter
                </Button>
              </div>

              <ScrollArea className="h-[calc(100vh-10rem)] pr-4">
                {likes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {likes.map((like) => (
                      <motion.div
                        key={like.userId}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileHover={{ y: -5, transition: { duration: 0.2 } }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-border/40 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                          <div className="aspect-[3/4] relative overflow-hidden group">
                            <Image 
                              src={like.profilePhoto || ''} 
                              alt={like.firstName} 
                              className="w-full h-full object-cover"
                              width={100}
                              height={100}
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70 flex items-center justify-center">
                              <div className="text-center p-4">
                                <Heart className="h-12 w-12 text-pink-500 mx-auto mb-3 animate-pulse" />
                                <p className="text-lg font-semibold text-white">{like.firstName}, {like.age}</p>
                                <p className="text-sm text-white/80 mt-1 mb-4">{like.course}</p>
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                                  onClick={() => handleLikeBack(like.userId)}
                                >
                                  Like Back
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-amber-50/30 dark:bg-amber-950/10 rounded-xl border border-amber-200/30 dark:border-amber-900/20">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <Star className="h-16 w-16 mx-auto text-amber-400/60 mb-4" />
                      <h3 className="text-xl font-medium mb-2">No likes yet</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        When someone likes your profile, they&apos;ll appear here. Keep checking back!
                      </p>
                      <Button 
                        variant="default" 
                        className="mt-4 bg-gradient-to-r from-amber-500 to-pink-500"
                        onClick={() => setActiveTab("discover")}
                      >
                        Start Discovering
                      </Button>
                    </motion.div>
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          </TabsContent>
          
          <TabsContent value="messages" className="flex-1 p-0 m-0">
            <div className="h-full flex">
              {selectedChatId ? (
                <ChatWindow
                  matchId={selectedChatId}
                  onClose={() => setSelectedChatId(null)}
                  partner={matches.find((match) => match.matchId === selectedChatId) as ChatPartner}
                />
              ) : (
                <div className="w-full h-full">
                  <ChatSection 
                    currentUser={currentUser} 
                    onSelectChat={handleSelectChat}
                    markAsRead={markAsRead}
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Modals */}
      <MatchesModal
        isOpen={showMatches}
        onClose={() => setShowMatches(false)}
        matches={matches}
        currentUser={currentUser}
      />

      <LikesModal
        isOpen={showLikes}
        onClose={() => setShowLikes(false)}
        likes={likes}
        onUnlike={handleUnlike}
        onUpdate={syncMatchesAndLikes}
      />

      <ProfileDetailsModal
        isOpen={!!previewProfile}
        onClose={() => setPreviewProfile(null)}
        profile={convertToProfileDetailsType(previewProfile) as ProfileDetailsType}
      />
      
      {/* Feedback modal - replace with your actual FeedbackModal implementation */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Send Feedback</h3>
            <p className="text-muted-foreground mb-4">Your feedback helps us improve our service!</p>
            <div className="text-right">
              <Button variant="outline" onClick={() => setShowFeedbackModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 