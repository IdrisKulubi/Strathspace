"use client";

import { useState, useCallback, useMemo } from "react";
import { Profile } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info, User as UserIcon, ChevronDown } from 'lucide-react';
import { cn } from "@/lib/utils";
import Image from "next/image";
import ImageSlider from "../controls/ImageSlider";

interface SimpleSwipeableCardProps {
  profile: Profile & {
    photos?: string[];
  };
  onSwipe: (direction: "left" | "right") => void;
  active: boolean;
}

export function SimpleSwipeableCard({
  profile,
  onSwipe,
  active,
}: SimpleSwipeableCardProps) {
  const [showExtraInfo, setShowExtraInfo] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);

  const qualities = useMemo(() => [
    profile.course && `Studies ${profile.course}`,
    profile.yearOfStudy && `Year ${profile.yearOfStudy}`,
    profile.gender,
    profile.lookingFor && `Looking for ${profile.lookingFor}`,
  ].filter(Boolean) as string[], [profile.course, profile.yearOfStudy, profile.gender, profile.lookingFor]);

  const handleSlideChange = useCallback((index: number) => {
    setActiveImageIndex(index);
  }, []);

  // Simple swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!active) return;
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !active) return;
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!isDragging || !active) return;
    setIsDragging(false);
    
    const diff = currentX - startX;
    const threshold = 100;
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        onSwipe("right");
      } else {
        onSwipe("left");
      }
    }
    
    setStartX(0);
    setCurrentX(0);
  };

  const swipeOffset = isDragging ? currentX - startX : 0;
  const rotation = swipeOffset * 0.1;

  if (!active) return null;

  const isAnonymous = profile.anonymous;
  const displayPhotos = isAnonymous ? [] : [profile.profilePhoto || "", ...(profile.photos || [])].filter(Boolean);

  return (
    <div 
      className="relative h-full w-full select-none"
      style={{
        transform: `translateX(${swipeOffset}px) rotate(${rotation}deg)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Card className="relative w-full h-full overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl border-0 bg-white dark:bg-gray-900">
        {/* Image Section - Takes up most of the card */}
        <div className="relative h-[75%] overflow-hidden">
          {isAnonymous ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 flex-col p-6">
              {profile.anonymousAvatar ? (
                <Image
                  src={`/avatars/${profile.anonymousAvatar}.svg`}
                  alt={`${profile.anonymousAvatar} avatar`}
                  width={120}
                  height={120}
                  className="opacity-90 mb-4"
                  priority
                />
              ) : (
                <UserIcon className="w-24 h-24 text-white/80 mb-4" />
              )}
              <h3 className="text-2xl font-bold text-white mb-2">Anonymous User</h3>
              <p className="text-white/80 text-sm text-center px-4">This person prefers to stay mysterious for now</p>
            </div>
          ) : (
            <ImageSlider 
              slug={displayPhotos}
              className="h-full object-cover"
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowExtraInfo(!showExtraInfo)}
            className="absolute top-4 right-4 z-30 bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full border border-white/20"
          >
            <Info className="h-5 w-5 text-white" />
          </Button>
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
            {!isAnonymous && qualities.slice(0, 2).map((quality, index) => (
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
          {!isAnonymous && profile.interests && profile.interests.length > 0 && (
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
          <button
            onClick={() => setShowExtraInfo(!showExtraInfo)}
            className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1"
          >
            {showExtraInfo ? "Show Less" : "Show More"}
            <ChevronDown className={cn("h-3 w-3 transition-transform", showExtraInfo && "rotate-180")} />
          </button>
        </div>
      </Card>
    </div>
  );
}