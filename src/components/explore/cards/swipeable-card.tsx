/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  AnimatePresence,
} from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Profile } from "@/db/schema";
import { Card } from "@/components/ui/card";
import ImageSlider from "../controls/ImageSlider";
import {
  ChevronDown,
  Info,
  X,
  Heart,
  ChevronUp,
  User as UserIcon,
} from "lucide-react";
import { ProfileDetailsModal } from "../profile-details-modal";
import { trackProfileView } from "@/lib/actions/stalker.actions";
import { useAction } from "next-safe-action/hooks";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

import Image from "next/image";

const initInteractionTroubleshooter = () => {
  if (process.env.NODE_ENV !== "production") {
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

  const qualities = useMemo(
    () =>
      [
        profile.course && `Studies ${profile.course}`,
        profile.yearOfStudy && `Year ${profile.yearOfStudy}`,
        profile.gender,
        profile.lookingFor && `Looking for ${profile.lookingFor}`,
      ].filter(Boolean) as string[],
    [profile.course, profile.yearOfStudy, profile.gender, profile.lookingFor]
  );

  const lifestyleAndPersonalityFields = useMemo(
    () => [
      { key: "drinkingPreference", label: "Drinks", icon: "🍷" },
      { key: "workoutFrequency", label: "Workout", icon: "🏋️" },
      { key: "socialMediaUsage", label: "Social Media", icon: "📱" },
      { key: "sleepingHabits", label: "Sleeps", icon: "😴" },
      { key: "personalityType", label: "Personality", icon: "🧠" },
      { key: "communicationStyle", label: "Communicates", icon: "💬" },
      { key: "loveLanguage", label: "Love Language", icon: "❤️" },
      { key: "zodiacSign", label: "Zodiac", icon: "✨" },
    ],
    []
  );

  const lifestyleAndPersonalityInfo = useMemo(() => {
    return lifestyleAndPersonalityFields
      .map((field) => ({
        ...field,
        value: profile[field.key as keyof Profile] as string | undefined | null,
      }))
      .filter((info) => info.value && info.value.trim() !== "");
  }, [profile, lifestyleAndPersonalityFields]);

  const remainingQualities = useMemo(() => qualities.slice(2), [qualities]);
  const hasBio = useMemo(
    () => profile.bio && profile.bio.trim() !== "",
    [profile.bio]
  );
  const hasInterests = useMemo(
    () => profile.interests && profile.interests.length > 0,
    [profile.interests]
  );

  const itemsHiddenCount = useMemo(() => {
    let count = 0;
    if (hasBio) count++;
    if (hasInterests) count++;
    count += remainingQualities.length;
    count += lifestyleAndPersonalityInfo.length;
    return count;
  }, [hasBio, hasInterests, remainingQualities, lifestyleAndPersonalityInfo]);

  const viewMoreBadgeText = showExtraInfo
    ? "Hide Details"
    : itemsHiddenCount > 0
    ? `View ${itemsHiddenCount} More`
    : "View Details";

  const showViewMoreBadge =
    itemsHiddenCount > 0 ||
    (showExtraInfo &&
      (hasBio ||
        hasInterests ||
        remainingQualities.length > 0 ||
        lifestyleAndPersonalityInfo.length > 0));

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
    info: { offset: { x: number }; velocity: { x: number } }
  ) => {
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

  if (!active) return null;

  const isAnonymous = profile.anonymous;
  const currentAnonymousAvatar = isAnonymous ? profile.anonymousAvatar : null;

  const displayPhotos = isAnonymous
    ? []
    : [profile.profilePhoto || "", ...(profile.photos || [])].filter(Boolean);

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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="flex flex-col items-center">
          <span className="flex items-center justify-center w-24 h-24 rounded-full bg-white/80 border-4 border-green-500 shadow-lg">
            <Heart className="w-16 h-16 text-green-500" />
          </span>
        </div>
      </motion.div>

      <Card className="relative w-full h-full overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl border-0 bg-white dark:bg-gray-900">
        {/* Image Section - Takes up most of the card */}
        <div className="relative h-[75%] overflow-hidden">
          {isAnonymous ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 flex-col p-6">
              {currentAnonymousAvatar ? (
                <Image
                  src={`/avatars/${currentAnonymousAvatar}.svg`}
                  alt={`${currentAnonymousAvatar} avatar`}
                  width={120}
                  height={120}
                  className="opacity-90 mb-4"
                  priority
                />
              ) : (
                <UserIcon className="w-24 h-24 text-white/80 mb-4" />
              )}
              <h3 className="text-2xl font-bold text-white mb-2">
                Anonymous User
              </h3>
              <p className="text-white/80 text-sm text-center px-4">
                This person prefers to stay mysterious for now
              </p>
            </div>
          ) : (
            <ImageSlider
              slug={displayPhotos}
              className={customStyles.image || "h-full object-cover"}
              onSlideChange={handleSlideChange}
            />
          )}

          {/* Gradient overlay for better text readability */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Image indicators */}
          {!isAnonymous && displayPhotos.length > 1 && (
            <div className="absolute top-4 left-4 right-4 flex gap-1 z-30">
              {displayPhotos.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    i === activeImageIndex
                      ? "bg-white flex-1"
                      : "bg-white/40 w-8"
                  )}
                />
              ))}
            </div>
          )}

          {/* Info button */}
          <button
            onClick={toggleExtraInfo}
            className={cn(
              "absolute top-4 right-4 z-30 p-2 rounded-full backdrop-blur-sm transition-all duration-200",
              showExtraInfo
                ? "bg-pink-500/80 hover:bg-pink-500 text-white ring-2 ring-pink-300/30"
                : "bg-black/30 hover:bg-black/50 text-white"
            )}
            aria-label="View more profile information"
            type="button"
          >
            <Info className={cn("h-5 w-5", showExtraInfo && "animate-pulse")} />
          </button>
        </div>

        {/* Content Section - Bottom 25% */}
        <div className="relative h-[25%] bg-white dark:bg-gray-900 p-4 md:p-6">
          {/* Name and Age */}
          <div className="mb-3">
            {isAnonymous ? (
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                Anonymous User
              </h2>
            ) : (
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {profile.firstName}
                {profile.age && (
                  <span className="text-lg md:text-xl font-normal text-gray-600 dark:text-gray-400 ml-2">
                    {profile.age}
                  </span>
                )}
              </h2>
            )}
          </div>

          {/* Quick info badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {!isAnonymous &&
              qualities.slice(0, 2).map((quality, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-full"
                >
                  {quality}
                </Badge>
              ))}
          </div>

          {/* Interests preview */}
          {!isAnonymous &&
            profile.interests &&
            profile.interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.interests.slice(0, 3).map((interest, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800 text-xs rounded-full"
                  >
                    {interest}
                  </Badge>
                ))}
                {profile.interests.length > 3 && (
                  <Badge
                    variant="outline"
                    className="border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-xs rounded-full"
                  >
                    +{profile.interests.length - 3}
                  </Badge>
                )}
              </div>
            )}

          {/* Anonymous mode info */}
          {isAnonymous && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-3 border border-purple-200 dark:border-purple-800">
              <p className="text-xs text-purple-700 dark:text-purple-300 text-center">
                🎭 This user is in stealth mode. Match to unlock their identity!
              </p>
            </div>
          )}

          {/* View more button */}
          {showViewMoreBadge && (
            <button
              onClick={toggleExtraInfo}
              className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1"
            >
              {showExtraInfo ? "Show Less" : "Show More"}
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  showExtraInfo && "rotate-180"
                )}
              />
            </button>
          )}
        </div>

        {/* Expanded Details Section */}
        <AnimatePresence>
          {showExtraInfo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="p-4 space-y-3 max-h-48 overflow-y-auto">
                {hasBio && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                      About
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {profile.bio}
                    </p>
                  </div>
                )}

                {hasInterests && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      All Interests
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests!.map((interest, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800 text-xs rounded-full"
                        >
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {remainingQualities.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      More Details
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {remainingQualities.map((quality, index) => (
                        <Badge
                          key={`rem-qual-${index}`}
                          variant="secondary"
                          className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-full"
                        >
                          {quality}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {lifestyleAndPersonalityInfo.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Lifestyle
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {lifestyleAndPersonalityInfo.map((info, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{info.icon}</span>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                              {info.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 dark:text-white font-medium">
                            {info.value as string}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      <ProfileDetailsModal
        profile={profile as any}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
      />
    </motion.div>
  );
}
