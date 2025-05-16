"use client";

import { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Profile } from "@/db/schema";
import { ImageGallery } from "./image-gallery";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { BadgeCheck, GraduationCap, Heart, Info, X } from "lucide-react";
import { prefetchImage } from "@/lib/image-prefetch";
import { useMediaQuery } from "@/hooks/use-media-query";

type OptimizedProfileCardProps = {
  profile: Profile;
  onSwipe: (direction: "left" | "right") => void;
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
  onViewDetails?: () => void;
  active?: boolean;
  className?: string;
  dragConstraints?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  isProcessing?: boolean;
  index?: number;
};

export function OptimizedProfileCard({
  profile,
  onSwipe,
  onSwipeStart,
  onSwipeEnd,
  onViewDetails,
  active = false,
  className,
  dragConstraints,
  isProcessing = false,
  index = 0,
}: OptimizedProfileCardProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  // Motion values for swiping
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const xPercentage = useTransform(x, [-200, 0, 200], [-100, 0, 100]);
  
  // Left/Right indicator opacity
  const leftOpacity = useTransform(xPercentage, [-20, 0], [1, 0]);
  const rightOpacity = useTransform(xPercentage, [0, 20], [0, 1]);

  // Images to display
  const images = [
    ...(profile.profilePhoto ? [profile.profilePhoto] : []),
    ...(Array.isArray(profile.photos) ? profile.photos : []),
  ].filter(Boolean) as string[];

  // Preload next profile's first image when this card is active
  useEffect(() => {
    if (active && profile.profilePhoto) {
      prefetchImage(profile.profilePhoto, {
        quality: 85,
        widths: [isMobile ? 400 : 800],
        formats: ["webp"],
        highPriority: true,
      });
    }
  }, [active, profile.profilePhoto, isMobile]);

  // Handle drag end
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = (event: any, info: any) => {
    // Get drag velocity & direction
    const { velocity, offset } = info;
    const swipeThreshold = 100;
    const velocityThreshold = 0.5;
    
    if (Math.abs(offset.x) > swipeThreshold || Math.abs(velocity.x) > velocityThreshold) {
      if (offset.x > 0) {
        setSwipeDirection("right");
        onSwipe("right");
      } else {
        setSwipeDirection("left");
        onSwipe("left");
      }
    } else {
      // Reset if not enough momentum to trigger a swipe
      x.set(0);
    }
    
    if (onSwipeEnd) onSwipeEnd();
  };

  // Prepare images
  const hasImages = images && images.length > 0;

  return (
    <motion.div
      className={cn(
        "absolute inset-0 w-full h-full bg-white dark:bg-background shadow-xl rounded-xl overflow-hidden touch-none",
        className
      )}
      style={{ 
        x, 
        rotate,
        zIndex: 1000 - (index || 0),
      }}
      drag={active && !isProcessing}
      dragConstraints={dragConstraints || { top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={0.6}
      dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
      onDragStart={onSwipeStart}
      onDragEnd={handleDragEnd}
      animate={{ scale: active ? 1 : 0.9, opacity: active ? 1 : 0.75 }}
      transition={{ duration: 0.3 }}
      initial={false}
    >
      {/* Images */}
      {hasImages ? (
        <ImageGallery
          images={images}
          aspectRatio="portrait" 
          priority={active}
          showPagination
          className="w-full h-full"
        />
      ) : (
        <div className="bg-muted w-full h-full flex items-center justify-center">
          <div className="text-center">
            <div className="p-4 rounded-full bg-muted-foreground/10 inline-flex mb-2">
              <BadgeCheck className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">{profile.firstName}</h3>
            <p className="text-muted-foreground">No photos available</p>
          </div>
        </div>
      )}

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/70" />

      {/* Profile Info */}
      <div className="absolute bottom-0 left-0 w-full p-4 text-white z-10">
        {/* Main profile info */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-2xl font-bold flex items-center">
            {profile.firstName}, {profile.age}
            {/* {profile.isVerified && (
              <BadgeCheck className="ml-1 h-5 w-5 text-blue-400" />
            )} */}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
            onClick={(e) => {
              e.stopPropagation();
              if (onViewDetails) onViewDetails();
            }}
          >
            <Info className="h-5 w-5 text-white" />
          </Button>
        </div>

        {/* Course/department */}
        {profile.course && (
          <div className="flex items-center gap-1 text-sm text-white/90 mt-1">
            <GraduationCap className="h-4 w-4" />
            <span>{profile.course}</span>
            {profile.yearOfStudy && (
              <span className="opacity-75">• Year {profile.yearOfStudy}</span>
            )}
          </div>
        )}

        {/* Interests Tags - only show a limited number */}
        {profile.interests && profile.interests.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {profile.interests.slice(0, 3).map((interest, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs rounded-full bg-white/20 backdrop-blur-sm"
              >
                {interest}
              </span>
            ))}
            {profile.interests.length > 3 && (
              <span className="px-2 py-1 text-xs rounded-full bg-white/20 backdrop-blur-sm">
                +{profile.interests.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Swipe indicators */}
      <motion.div 
        className="absolute top-1/4 left-8 bg-red-500/90 text-white py-1 px-3 rounded-lg transform -rotate-12"
        style={{ opacity: leftOpacity }}
      >
        <X className="h-8 w-8" />
      </motion.div>
      
      <motion.div 
        className="absolute top-1/4 right-8 bg-pink-500/90 text-white py-1 px-3 rounded-lg transform rotate-12"
        style={{ opacity: rightOpacity }}
      >
        <Heart className="h-8 w-8" />
      </motion.div>
    </motion.div>
  );
} 