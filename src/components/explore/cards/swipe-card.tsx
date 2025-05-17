"use client";

import { AnimatePresence, AnimationControls, motion } from "framer-motion";
import { Profile } from "@/db/schema";
import { cn } from "@/lib/utils";

import { useState, useEffect, useMemo } from "react";
import {
  GraduationCap,
  X,
  Heart,
  Loader2,
  Info,
} from "lucide-react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import { ImageGallery } from "@/components/ui/image-gallery";
import { AnonymousProfile } from "@/components/anonymous/AnonymousProfile";

interface SwipeCardProps {
  profile: Profile;
  onSwipe: (direction: "left" | "right") => void;
  _onRevert?: () => void;
  active: boolean;
  animate?: "left" | "right" | null;
  variants?: Record<string, unknown>; // Assuming motion.Variants is a type alias for Record<string, unknown>
  style?: React.CSSProperties;
  children?: React.ReactNode;
  _isAnimating?: boolean;
  canRevert?: boolean;
  onViewProfile?: () => void;
}

export function SwipeCard({
  profile,
  onSwipe,
  _onRevert,
  active,
  animate,
  variants,
  style,
  _isAnimating,
  onViewProfile,
}: SwipeCardProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [_currentSlide, _setCurrentSlide] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [swipeDirection, _setSwipeDirection] = useState<"left" | "right" | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) onSwipe("left");
    else if (isRightSwipe) onSwipe("right");

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Update the optimizedPhotos memo to use webp format and include width/quality params
  const optimizedPhotos = useMemo(() => {
    return [profile.profilePhoto, ...(profile.photos || [])]
      .filter(Boolean)
      .map((photo) => `${photo}?width=500&quality=70&format=webp`);
  }, [profile]);

  // Enhanced image prefetching with loading progress
  useEffect(() => {
    // Skip prefetching if in anonymous mode
    if (profile.anonymous) {
      setImagesLoaded(true);
      return;
    }
    
    const prefetchImages = async () => {
      try {
        // Reset loading state
        setImagesLoaded(false);
        setLoadingProgress(0);
        
        // Import the prefetch function
        const { prefetchProfileImages } = await import(
          "@/lib/actions/image-prefetch"
        );
        
        // Create an array to track loaded images
        const imagesToLoad = optimizedPhotos.filter(Boolean) as string[];
        let loadedCount = 0;
        
        // Create image objects to track loading
        const imagePromises = imagesToLoad.map((src) => {
          return new Promise<void>((resolve) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
              loadedCount++;
              setLoadingProgress(Math.round((loadedCount / imagesToLoad.length) * 100));
              resolve();
            };
            img.onerror = () => {
              loadedCount++;
              setLoadingProgress(Math.round((loadedCount / imagesToLoad.length) * 100));
              resolve();
            };
          });
        });
        
        // Wait for all images to load
        await Promise.all(imagePromises);
        
        // Also call the service worker prefetch for caching
        await prefetchProfileImages(imagesToLoad);
        
        // Mark as loaded
        setImagesLoaded(true);
      } catch (error) {
        console.error("Prefetch failed:", error);
        // Even if prefetch fails, mark as loaded to show the profile
        setImagesLoaded(true);
      }
    };

    if (optimizedPhotos.length > 0 && active && !profile.anonymous) {
      prefetchImages();
    } else if (!active && !profile.anonymous) {
      // If not active, still prefetch in background but don't show loading state
      import("@/lib/actions/image-prefetch").then(
        module => module.prefetchProfileImages(optimizedPhotos.filter(Boolean) as string[])
      ).catch(error => console.error("Background prefetch failed:", error));
    }
  }, [optimizedPhotos, active, profile.anonymous]);

  // Fix: handleInfoClick should call onViewProfile if provided
  const handleInfoClick = () => {
    if (onViewProfile) onViewProfile();
  };

  return (
    <motion.div
      className={cn(
        "absolute w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-xl",
        "bg-gradient-to-br from-white to-gray-100 dark:from-gray-900 dark:to-black",
        active && "cursor-grab active:cursor-grabbing"
      )}
      animate={animate ? (variants?.[animate] as AnimationControls) : undefined}
      style={{
        ...style,
        backgroundImage: "none",
        touchAction: "none",
      }}
      drag={active ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(e, { offset, velocity }) => {
        const swipe = offset.x * velocity.x;
        if (swipe < -20000) onSwipe("left");
        if (swipe > 20000) onSwipe("right");
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Loading overlay */}
      {active && !imagesLoaded && !profile.anonymous && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
          <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">Loading profile...</p>
        </div>
      )}
      
      <div className="relative w-full h-full">
        {profile.anonymous ? (
          <AnonymousProfile
            profile={profile}
            onViewProfile={handleInfoClick}
            className="w-full h-full"
          />
        ) : (
          <ImageGallery
            images={[profile.profilePhoto, ...(profile.photos || [])].filter(Boolean) as string[]}
            aspectRatio="portrait"
            priority={active}
            showPagination={true}
            className="w-full h-full group"
            onImageClick={() => handleInfoClick()}
          />
        )}

        {!profile.anonymous && <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/60" />}

        {!profile.anonymous && (
          <div className="absolute bottom-0 left-0 w-full p-4 text-white z-10">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-2xl font-bold flex items-center">
                {profile.firstName}, {profile.age}
                {/* {profile.isVerified && (
                  <BadgeCheck className="ml-1 h-5 w-5 text-blue-400" />
                )} */}
              </h2>
              <button
                onClick={handleInfoClick}
                className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition"
                aria-label="View profile details"
              >
                <Info className="h-5 w-5 text-white" />
              </button>
            </div>

            {profile.course && (
              <div className="flex items-center gap-1 text-sm text-white/90 mt-1">
                <GraduationCap className="h-4 w-4" />
                <span>{profile.course}</span>
                {profile.yearOfStudy && (
                  <span className="opacity-75">• Year {profile.yearOfStudy}</span>
                )}
              </div>
            )}

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
        )}

        <AnimatePresence>
          {swipeDirection === "left" && (
            <motion.div
              className="absolute top-1/4 left-8 bg-red-500/90 text-white py-1 px-3 rounded-lg transform -rotate-12"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <X className="h-8 w-8" />
            </motion.div>
          )}

          {swipeDirection === "right" && (
            <motion.div
              className="absolute top-1/4 right-8 bg-green-500/90 text-white py-1 px-3 rounded-lg transform rotate-12"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Heart className="h-8 w-8" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
