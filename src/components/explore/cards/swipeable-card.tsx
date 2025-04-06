/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { Profile } from "@/db/schema";
import { Card } from "@/components/ui/card";
import ImageSlider from "../controls/ImageSlider";
import { Info } from 'lucide-react';
import { ProfileDetailsModal } from '../profile-details-modal';
import { trackProfileView } from "@/lib/actions/stalker.actions";
import { useAction } from "next-safe-action/hooks";

// Only include troubleshooter in development
const initInteractionTroubleshooter = () => {
  if (process.env.NODE_ENV !== 'production') {
    
   
    
   
  }
  return () => {};
};

interface SwipeableCardProps {
  profile: Profile & {
    photos?: string[];
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
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  const leftTextOpacity = useTransform(x, [-200, -100, 0], [1, 0.5, 0]);
  const rightTextOpacity = useTransform(x, [0, 100, 200], [0, 0.5, 1]);
  const textScale = useTransform(
    x,
    [-200, -100, 0, 100, 200],
    [1.5, 1.2, 1, 1.2, 1.5]
  );
  const [showDetails, setShowDetails] = useState(false);
  const { execute: trackView } = useAction(trackProfileView as any);

  // Initialize the interaction troubleshooter
  useEffect(() => {
    if (active) {
      const cleanup = initInteractionTroubleshooter();
      return cleanup;
    }
  }, [active]);

  // Log when the component mounts or becomes active
  useEffect(() => {
    if (active) {
    }
  }, [active, profile.userId]);

  const handleDragEnd = (
    event: MouseEvent | TouchEvent,
    info: { offset: { x: number } }
  ) => {
    
    if (info.offset.x < -200) {
      animate(x, -400, {
        type: "spring",
        damping: 80,
        stiffness: 250,
        duration: 0.3,
        ease: "easeOut",
      });
      onSwipe("left");
    } else if (info.offset.x > 200) {
      animate(x, 400, {
        type: "spring",
        damping: 80,
        stiffness: 250,
        duration: 0.3,
        ease: "easeOut",
      });
      onSwipe("right");
    } else {
      animate(x, 0, {
        type: "spring",
        stiffness: 250,
        damping: 80,
        duration: 0.3,
      });
    }
  };

  const handleButtonSwipe = useCallback((direction: "left" | "right") => {
    console.log('[SwipeableCard] Button swipe triggered:', direction);
    const targetX = direction === "left" ? -400 : 400;
    animate(x, targetX, {
      type: "spring",
      damping: 80,
      stiffness: 250,
      duration: 0.3,
      ease: "easeOut",
      onComplete: () => {
        setExitX(targetX);
        onSwipe(direction);
      },
    });
  }, [x, onSwipe]);

  useEffect(() => { 
    if (!active) return;
    
    const key = `handleSwipe_${profile.userId}`;
    (window as any)[key] = handleButtonSwipe;
    
    return () => {
      delete (window as any)[key];
    };
  }, [active, handleButtonSwipe, profile.userId]);

  useEffect(() => {
    if (!active) return;

    if (profile.photos && profile.photos.length > 0) {
      profile.photos.forEach(photo => {
        if (photo) {
          const img = new window.Image();
          img.src = photo;
        }
      });
    }
    
    if (profile.profilePhoto) {
      const img = new window.Image();
      img.src = profile.profilePhoto;
    }

    const unsubscribe = x.on("change", (latest) => {
      if (latest <= -200) {
        setExitX(-400);
        onSwipe("left");
      } else if (latest >= 200) {
        setExitX(400);
        onSwipe("right");
      }
    });

    return () => unsubscribe();
  }, [active, onSwipe, x, profile.photos, profile.profilePhoto]);

  const handleViewProfile = useCallback(() => {
    console.log('[SwipeableCard] Info button clicked - handleViewProfile triggered');
    trackView(profile.userId);
    setShowDetails(true);
  }, [profile.userId, trackView]);

  useEffect(() => {
    if (showDetails) {
      trackView(profile.userId);
    }
  }, [showDetails, profile.userId, trackView]);

  if (!active) {
    return null;
  }

  return (
    <motion.div className="relative h-full w-full">
      <motion.div
        style={{
          x,
          rotate,
          opacity,
          position: "absolute",
          width: "100%",
          height: "100%",
        }}
        drag={active ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        animate={{ x: exitX }}
        transition={{ 
          type: "spring", 
          damping: 40, 
          stiffness: 400,
          duration: 0.3
        }}
        className="touch-none will-change-transform"
      >
        <Card className={`relative w-full h-full overflow-hidden rounded-xl ${customStyles.card || ''}`}>
          {/* Image slider */}
          <div className="absolute inset-0 z-0">
            <ImageSlider 
              slug={[
                profile.profilePhoto || "",
                ...(profile.photos || []),
              ].filter(Boolean)}
              className={customStyles.image || "h-full"}
            />
          </div>
          
          {/* NOPE Text */}
          <motion.div
            style={{ opacity: leftTextOpacity, scale: textScale }}
            className="absolute top-12 left-8 rotate-[-15deg] pointer-events-none z-20"
          >
            <span className="font-graffiti text-6xl font-black text-red-500 tracking-wider uppercase border-[4px] border-red-500 px-4 py-1 rounded-lg bg-white/10 backdrop-blur-sm drop-shadow-[0_4px_12px_rgba(239,68,68,0.4)]">
              PASS
            </span>
          </motion.div>
          
          {/* LIKE Text */}
          <motion.div
            style={{ opacity: rightTextOpacity, scale: textScale }}
            className="absolute top-12 right-8 rotate-[15deg] pointer-events-none z-20"
          >
            <span className="font-graffiti text-6xl font-black text-emerald-500 tracking-wider uppercase border-[4px] border-emerald-500 px-4 py-1 rounded-lg bg-white/10 backdrop-blur-sm drop-shadow-[0_4px_12px_rgba(16,185,129,0.4)]">
              LIKE
            </span>
          </motion.div>
          
          {/* Profile Info Overlay - Made pointer-events-none to not block interactions */}
          <div className={`absolute bottom-0 left-0 right-0 p-6 pb-14 bg-gradient-to-t from-black/80 to-transparent text-white z-20 pointer-events-none ${customStyles.info || ''}`}>
            <h3 className={`text-2xl font-bold ${customStyles.name || ''}`}>
              {profile.firstName}, {profile.yearOfStudy}
            </h3>
            <p className={`text-sm opacity-90 ${customStyles.details || ''}`}>{profile.course}</p>
            <p className={`mt-2 text-sm opacity-80 line-clamp-2 ${customStyles.bio || ''}`}>{profile.bio}</p>
          </div>
          
          {/* Info Button with very high z-index */}
          <div 
            className="absolute bottom-20 right-4 z-[1000]"
            style={{ pointerEvents: 'auto' }}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleViewProfile();
              }}
              className="p-2.5 rounded-full bg-background/80 backdrop-blur-md hover:bg-background transition-colors shadow-lg"
              aria-label="View profile details"
              type="button"
            >
              <Info className="h-5 w-5 text-white" />
            </button>
          </div>
        </Card>
      </motion.div>
      
      <ProfileDetailsModal
        profile={profile as any}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
      />
    </motion.div>
  );
}
