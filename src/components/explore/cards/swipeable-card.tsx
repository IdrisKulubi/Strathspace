/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Profile } from "@/db/schema";
import { Card } from "@/components/ui/card";
import ImageSlider from "../controls/ImageSlider";
import { ChevronDown, Info, X, Heart, ChevronUp, User as UserIcon } from 'lucide-react';
import { ProfileDetailsModal } from '../profile-details-modal';
import { trackProfileView } from "@/lib/actions/stalker.actions";
import { useAction } from "next-safe-action/hooks";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useMediaQuery } from '@/hooks/use-media-query';
import Image from "next/image";

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
  const [showExtraInfo, setShowExtraInfo] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
  const scale = useTransform(x, [-300, 0, 300], [0.96, 1, 0.96]);
  const opacity = useTransform(x, [-400, -200, 0, 200, 400], [0, 1, 1, 1, 0]);
  const leftTextOpacity = useTransform(x, [-200, -100, 0], [1, 0.5, 0]);
  const rightTextOpacity = useTransform(x, [0, 100, 200], [0, 0.5, 1]);
  const [showDetails, setShowDetails] = useState(false);
  const { execute: trackView } = useAction(trackProfileView as any);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isDragging, setIsDragging] = useState(false);
  const [hasSwiped, setHasSwiped] = useState(false);
  
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

  const handleDragEnd = (event: MouseEvent | TouchEvent, info: { offset: { x: number }, velocity: { x: number } }) => {
    if (!active) return;
    const swipePower = Math.abs(info.offset.x) * info.velocity.x;
    const threshold = 120;
    if (info.offset.x < -threshold || swipePower < -1000) {
      setHasSwiped(true);
      animate(x, -window.innerWidth * 1.2, {
        type: "spring",
        stiffness: 300,
        damping: 30,
        onComplete: () => onSwipe("left"),
      });
    } else if (info.offset.x > threshold || swipePower > 1000) {
      setHasSwiped(true);
      animate(x, window.innerWidth * 1.2, {
        type: "spring",
        stiffness: 300,
        damping: 30,
        onComplete: () => onSwipe("right"),
      });
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
      setIsDragging(false);
    }
  };

  useEffect(() => {
    if (active) {
      setIsDragging(false);
      setHasSwiped(false);
      x.set(0);
    }
  }, [active, x]);

  useEffect(() => {
    if (showDetails) trackView(profile.userId);
  }, [showDetails, profile.userId, trackView]);

  const toggleExtraInfo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowExtraInfo(!showExtraInfo);
  };

  const isMobile = useMediaQuery('(max-width: 768px)');

  if (!active) return null;

  const isAnonymous = profile.anonymous;
  const currentAnonymousAvatar = isAnonymous ? profile.anonymousAvatar : null;

  const displayPhotos = isAnonymous ? [] : [profile.profilePhoto || "", ...(profile.photos || [])].filter(Boolean);

  return (
    <motion.div
      className={cn("relative h-full w-full select-none", customStyles.card)}
      style={{ x, rotate, scale, opacity, touchAction: "pan-x" }}
      drag={active && !hasSwiped ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.18}
      dragTransition={{ bounceStiffness: 400, bounceDamping: 30 }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.98 }}
      whileDrag={{ scale: 1.03, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <motion.div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none"
        style={{
          opacity: leftTextOpacity,
          scale: leftTextOpacity,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="flex flex-col items-center">
          <span className="flex items-center justify-center w-24 h-24 rounded-full bg-white/80 border-4 border-red-500 shadow-lg">
            <X className="w-16 h-16 text-red-500" />
          </span>
        </div>
      </motion.div>
      <motion.div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none"
        style={{
          opacity: rightTextOpacity,
          scale: rightTextOpacity,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="flex flex-col items-center">
          <span className="flex items-center justify-center w-24 h-24 rounded-full bg-white/80 border-4 border-green-500 shadow-lg">
            <Heart className="w-16 h-16 text-green-500" />
          </span>
        </div>
      </motion.div>

      <Card className="relative w-full h-full overflow-hidden rounded-sm shadow-xl">
        <div className="absolute inset-0 z-0">
          {isAnonymous ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 via-gray-800 to-black flex-col p-4">
              {currentAnonymousAvatar ? (
                <Image
                  src={`/avatars/${currentAnonymousAvatar}.svg`}
                  alt={`${currentAnonymousAvatar} avatar`}
                  width={128}
                  height={128}
                  className="opacity-80"
                  priority
                />
              ) : (
                <UserIcon className="w-32 h-32 text-white opacity-70" />
              )}
              <p className="mt-4 text-2xl font-bold text-white opacity-90">This user is Anonymous</p>
            </div>
          ) : (
            <ImageSlider 
              slug={displayPhotos}
              className={customStyles.image || "h-full object-cover"}
              onSlideChange={handleSlideChange}
            />
          )}
        </div>
        
        {!isAnonymous && displayPhotos.length > 0 && (
          <div className="absolute top-3 left-0 right-0 z-30 flex justify-center gap-1">
            {displayPhotos.map((_, i) => (
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
           

            {isAnonymous && (
              <div className="my-3 p-3 bg-black/20 rounded-lg backdrop-blur-sm">
                <p className="text-sm text-white/80">
                  This user is currently in Anonymous Mode. Some details are hidden. If you match, you can both choose to reveal your profiles.
                </p>
              </div>
            )}

            {(profile.interests && profile.interests.length > 0 && !isAnonymous) && (
              <div className={cn("flex flex-wrap gap-2 mt-3", customStyles.interests)}>
                {profile.interests.map((interest, idx) => (
                  <Badge key={idx} variant="outline" className="bg-purple-500/20 border-purple-400/30 text-white/90 text-xs py-0.5 px-2 rounded-full">
                    {interest}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <div className="px-6 pb-1 flex flex-wrap gap-2 items-center">
            {qualities.slice(0, 2).map((quality, index) => (
              <Badge key={index} variant="outline" className="bg-gray-500 hover:bg-white/20  border-white/20 text-white text-xs py-1 rounded-full">
                {quality}
              </Badge>
            ))}
            
            {showViewMoreBadge && (
              isMobile ? (
                <button
                  aria-label={viewMoreBadgeText}
                  onClick={toggleExtraInfo}
                  className={cn(
                    'absolute right-0 -translate-x-1/2 z-30',
                    'rounded-full bg-pink-500/90 hover:bg-pink-600 text-white shadow-lg',
                    'transition-all duration-200',
                    showExtraInfo ? 'bg-pink-700' : '',
                    'top-[calc(100%-8.5rem)] md:hidden',
                    'w-10 h-10 flex items-center justify-center',
                  )}
                  style={{
                    marginBottom: '-1.5rem',
                  }}
                >
                  <ChevronUp className={cn('h-6 w-6 transition-transform', showExtraInfo && 'rotate-180')} />
                </button>
              ) : (
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
              )
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
      
      <ProfileDetailsModal profile={profile as any} isOpen={showDetails} onClose={() => setShowDetails(false)} />
    </motion.div>
  );
}
