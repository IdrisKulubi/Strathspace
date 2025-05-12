/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Profile } from "@/db/schema";
import { Card } from "@/components/ui/card";
import ImageSlider from "../controls/ImageSlider";
import { ChevronDown, Info, X, Heart } from 'lucide-react';
import { ProfileDetailsModal } from '../profile-details-modal';
import { trackProfileView } from "@/lib/actions/stalker.actions";
import { useAction } from "next-safe-action/hooks";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const initInteractionTroubleshooter = () => {
  if (process.env.NODE_ENV !== 'production') {
  }
  return () => {};
};

interface SwipeableCardProps {
  profile: Profile & {
    photos?: string[];
    drinkingPreference?: string | null;
    workoutFrequency?: string | null;
    socialMediaUsage?: string | null;
    sleepingHabits?: string | null;
    personalityType?: string | null;
    communicationStyle?: string | null;
    loveLanguage?: string | null;
    zodiacSign?: string | null;
  };
  onSwipe: (direction: "left" | "right") => void;
  onRevert?: () => void;
  active: boolean;
  customStyles?: {
    card?: string;
    image?: string;
    info?: string;
    name?: string;
    details?: string;
    bio?: string;
    interests?: string;
    interest?: string;
  };
}

export function SwipeableCard({
  profile,
  onSwipe,
  active,
  customStyles = {},
}: SwipeableCardProps) {
  const [exitX, setExitX] = useState(0);
  const [showExtraInfo, setShowExtraInfo] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  const leftTextOpacity = useTransform(x, [-200, -100, 0], [1, 0.5, 0]);
  const rightTextOpacity = useTransform(x, [0, 100, 200], [0, 0.5, 1]);
  const [showDetails, setShowDetails] = useState(false);
  const { execute: trackView } = useAction(trackProfileView as any);
  
  const qualities = useMemo(() => [
    profile.course && `Studies ${profile.course}`,
    profile.yearOfStudy && `Year ${profile.yearOfStudy}`,
    profile.gender,
    profile.lookingFor && `Looking for ${profile.lookingFor}`,
  ].filter(Boolean) as string[], [profile.course, profile.yearOfStudy, profile.gender, profile.lookingFor]);

  const lifestyleAndPersonalityFields = useMemo(() => [
    { key: 'drinkingPreference', label: "Drinks", icon: "🍷" },
    { key: 'workoutFrequency', label: "Workout", icon: "🏋️" },
    { key: 'socialMediaUsage', label: "Social Media", icon: "📱" },
    { key: 'sleepingHabits', label: "Sleeps", icon: "😴" },
    { key: 'personalityType', label: "Personality", icon: "🧠" },
    { key: 'communicationStyle', label: "Communicates", icon: "💬" },
    { key: 'loveLanguage', label: "Love Language", icon: "❤️" },
    { key: 'zodiacSign', label: "Zodiac", icon: "✨" },
  ], []);

  const lifestyleAndPersonalityInfo = useMemo(() => {
    return lifestyleAndPersonalityFields
      .map(field => ({
        ...field,
        value: profile[field.key as keyof Profile] as string | undefined | null,
      }))
      .filter(info => info.value && info.value.trim() !== "");
  }, [profile, lifestyleAndPersonalityFields]);

  const remainingQualities = useMemo(() => qualities.slice(2), [qualities]);
  const hasBio = useMemo(() => profile.bio && profile.bio.trim() !== "", [profile.bio]);
  const hasInterests = useMemo(() => profile.interests && profile.interests.length > 0, [profile.interests]);

  const itemsHiddenCount = useMemo(() => {
      let count = 0;
      if (hasBio) count++;
      if (hasInterests) count++;
      count += remainingQualities.length;
      count += lifestyleAndPersonalityInfo.length;
      return count;
  }, [hasBio, hasInterests, remainingQualities, lifestyleAndPersonalityInfo]);

  const viewMoreBadgeText = showExtraInfo ? "Hide Details" :
                           (itemsHiddenCount > 0 ? `View ${itemsHiddenCount} More` : "View Details");

  const showViewMoreBadge = itemsHiddenCount > 0 || 
                            (showExtraInfo && (hasBio || hasInterests || remainingQualities.length > 0 || lifestyleAndPersonalityInfo.length > 0));

  const handleSlideChange = useCallback((index: number) => {
    setActiveImageIndex(index);
  }, []);

  useEffect(() => {
    if (active) {
      const cleanup = initInteractionTroubleshooter();
      return cleanup;
    }
  }, [active]);

  useEffect(() => {
    if (active) {
      // Log active state if needed
    }
  }, [active, profile.userId]);

  const handleDragEnd = (
    event: MouseEvent | TouchEvent,
    info: { offset: { x: number } }
  ) => {
    if (info.offset.x < -100) {
      animate(x, -400, { type: "spring", damping: 80, stiffness: 250, duration: 0.3, ease: "easeOut" });
      onSwipe("left");
    } else if (info.offset.x > 100) {
      animate(x, 400, { type: "spring", damping: 80, stiffness: 250, duration: 0.3, ease: "easeOut" });
      onSwipe("right");
    } else {
      animate(x, 0, { type: "spring", stiffness: 250, damping: 80, duration: 0.3 });
    }
  };

  const handleButtonSwipe = useCallback((direction: "left" | "right") => {
    const targetX = direction === "left" ? -400 : 400;
    animate(x, targetX, {
      type: "spring", damping: 80, stiffness: 250, duration: 0.3, ease: "easeOut",
      onComplete: () => { setExitX(targetX); onSwipe(direction); },
    });
  }, [x, onSwipe]);

  useEffect(() => { 
    if (!active) return;
    const key = `handleSwipe_${profile.userId}`;
    (window as any)[key] = handleButtonSwipe;
    return () => { delete (window as any)[key]; };
  }, [active, handleButtonSwipe, profile.userId]);

  useEffect(() => {
    if (!active) return;
    if (profile.photos) profile.photos.forEach(p => { if (p) new window.Image().src = p; });
    if (profile.profilePhoto) new window.Image().src = profile.profilePhoto;
    const unsubscribe = x.on("change", (latest) => {
      if (latest <= -150) { setExitX(-400); onSwipe("left"); }
      else if (latest >= 150) { setExitX(400); onSwipe("right"); }
    });
    return () => unsubscribe();
  }, [active, onSwipe, x, profile.photos, profile.profilePhoto]);

 

  useEffect(() => {
    if (showDetails) trackView(profile.userId);
  }, [showDetails, profile.userId, trackView]);

  const toggleExtraInfo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowExtraInfo(!showExtraInfo);
  };

  if (!active) return null;

  return (
    <motion.div className="relative h-full w-full">
      <motion.div
        style={{ x, rotate, opacity, position: "absolute", width: "100%", height: "100%" }}
        drag={active ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        animate={{ x: exitX }}
        transition={{ type: "spring", damping: 40, stiffness: 400, duration: 0.3 }}
        className="touch-none will-change-transform"
      >
        <Card className={`relative w-full h-full overflow-hidden rounded-3xl shadow-xl ${customStyles.card || ''}`}>
          <div className="absolute inset-0 z-0">
            <ImageSlider 
              slug={[profile.profilePhoto || "", ...(profile.photos || [])].filter(Boolean)}
              className={customStyles.image || "h-full object-cover"}
              onSlideChange={handleSlideChange}
            />
          </div>
          
          <motion.div style={{ opacity: leftTextOpacity }} className="absolute top-1/3 left-6 rotate-[-15deg] pointer-events-none z-20">
            <div className="flex items-center justify-center w-24 h-24 rounded-full border-4 border-red-500 bg-white/20 backdrop-blur-md">
              <X className="w-12 h-12 text-red-500" />
            </div>
          </motion.div>
          
          <motion.div style={{ opacity: rightTextOpacity }} className="absolute top-1/3 right-6 rotate-[15deg] pointer-events-none z-20">
            <div className="flex items-center justify-center w-24 h-24 rounded-full border-4 border-green-500 bg-white/20 backdrop-blur-md">
              <Heart className="w-12 h-12 text-green-500" />
            </div>
          </motion.div>
          
          {profile.photos && profile.photos.length > 0 && (
            <div className="absolute top-3 left-0 right-0 z-30 flex justify-center gap-1">
              {[profile.profilePhoto, ...(profile.photos || [])].filter(Boolean).map((_, i) => (
                <div key={i} className={`h-1 ${i === activeImageIndex ? 'bg-pink-500 w-8' : 'bg-white/50 w-6'} rounded-sm transition-all duration-300`} />
              ))}
            </div>
          )}
          
          <div className="absolute top-4 right-4 z-30 cursor-pointer" style={{ pointerEvents: 'auto' }}>
            <button
              onClick={toggleExtraInfo}
              className={cn(
                "p-2 rounded-full backdrop-blur-sm transition-all duration-200",
                showExtraInfo ? "bg-pink-500/70 hover:bg-pink-500/90 text-white ring-2 ring-pink-300/30" : "bg-black/30 hover:bg-black/50 text-white"
              )}
              aria-label="View more profile information" type="button"
            >
              <Info className={cn("h-5 w-5", showExtraInfo && "animate-pulse")} />
            </button>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent text-white z-10" style={{ pointerEvents: 'auto' }}>
            <div className="p-6 pb-3">
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-2xl font-bold tracking-tight">{profile.firstName}, <span className="text-2xl">{profile.age || 18}</span></h3>
                {/* TODO: Add verified badge */}
              </div>
              <p className="text-base text-white/80">{profile.course}</p>
            </div>
            
            <div className="px-6 pb-1 flex flex-wrap gap-2 items-center">
              {qualities.slice(0, 2).map((quality, index) => (
                <Badge key={index} variant="outline" className="bg-gray-500 hover:bg-white/20  border-white/20 text-white text-xs py-1 rounded-full">
                  {quality}
                </Badge>
              ))}
              
              {showViewMoreBadge && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs py-1 px-2.5 cursor-pointer flex items-center gap-1 rounded-full",
                    showExtraInfo && "bg-white/20"
                  )}
                  onClick={toggleExtraInfo}
                >
                  {viewMoreBadgeText}
                  <ChevronDown className={cn("h-3 w-3 transition-transform duration-200 ml-0.5", showExtraInfo && "rotate-180")} />
                </Badge>
              )}
            </div>
            
            <AnimatePresence>
              {showExtraInfo && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pt-3 pb-2 space-y-3">
                    {hasBio && (
                      <div>
                        <h4 className="text-[13px] font-semibold text-white/70 mb-0.5">About</h4>
                        <p className="text-sm text-white/80 leading-relaxed line-clamp-3">{profile.bio}</p>
                      </div>
                    )}
                    
                    {hasInterests && (
                      <div className="pt-1.5">
                        <h4 className="text-[13px] font-semibold text-white/70 mb-1">Interests</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.interests!.map((interest, idx) => (
                            <Badge key={idx} variant="outline" className="bg-purple-500/20 border-purple-400/30 text-white/90 text-xs py-0.5 px-2 rounded-full">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {remainingQualities.length > 0 && (
                      <div className="pt-1.5">
                        <h4 className="text-[13px] font-semibold text-white/70 mb-1">Also...</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {remainingQualities.map((quality, index) => (
                            <Badge key={`rem-qual-${index}`} variant="outline" className="bg-gray-600/50 border-white/10 text-white/80 text-xs py-0.5 px-2 rounded-full">
                              {quality}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {lifestyleAndPersonalityInfo.length > 0 && (
                      <div className="pt-2">
                        <h4 className="text-[13px] font-semibold text-white/70 mb-2 pt-2 border-t border-white/10">
                          More About Them
                        </h4>
                        <div className="grid grid-cols-2 gap-x-2.5 gap-y-2">
                          {lifestyleAndPersonalityInfo.map((info, idx) => (
                            <div key={idx} className="flex items-start bg-white/5 p-1.5 rounded-lg">
                              <span className="mr-1.5 text-sm opacity-80">{info.icon}</span>
                              <div>
                                <span className="block text-[11px] text-white/60 uppercase tracking-wider">{info.label}</span>
                                <span className="block text-xs text-white/90 font-medium">{info.value as string}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="h-4"></div>
          </div>
        </Card>
      </motion.div>
      
      <ProfileDetailsModal profile={profile as any} isOpen={showDetails} onClose={() => setShowDetails(false)} />
    </motion.div>
  );
}
