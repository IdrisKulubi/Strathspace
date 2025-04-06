"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";
import { X, Heart, RotateCcw, Star } from "lucide-react";

interface SwipeControlsProps {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onUndo: () => void;
  onSuperLike?: () => void;
  className?: string;
  disabled?: boolean;
  currentProfileId?: string;
}

export function SwipeControls({
  onSwipeLeft,
  onSwipeRight,
  onUndo,
  onSuperLike,
  className,
  disabled,
  currentProfileId,
}: SwipeControlsProps) {
  const [activeButton, setActiveButton] = useState<
    "left" | "right" | "undo" | "superLike" | null
  >(null);

  const handleButtonClick = useCallback(
    async (type: "left" | "right" | "undo" | "superLike", handler: () => void) => {
      if (disabled) return;
      
      setActiveButton(type);

      const swipeHandler = currentProfileId 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (window as any )[`handleSwipe_${currentProfileId}`] 
        : null;

      if (type === "left" || type === "right") {
        if (swipeHandler) {
          swipeHandler(type);
          setTimeout(handler, 300);
        } else {
          handler();
        }
      } else {
        handler();
      }

      setTimeout(() => setActiveButton(null), 100);
    },
    [disabled, currentProfileId]
  );

  return (
    <div className={cn("flex items-center justify-center gap-6", className)}>
      {/* Rewind/Undo Button */}
      <Button
        variant="outline"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleButtonClick("undo", onUndo);
        }}
        disabled={disabled}
        className={cn(
          "rounded-full h-14 w-14 bg-white border-2 border-yellow-400 shadow-lg",
          "transition-all duration-200 hover:scale-110 hover:shadow-xl",
          activeButton === "undo" && "bg-yellow-50",
          disabled && "opacity-50 pointer-events-none"
        )}
        type="button"
        aria-label="Undo last swipe"
      >
        <RotateCcw className="h-6 w-6 text-yellow-400" />
      </Button>

      {/* Dislike/Nope Button */}
      <Button
        variant="outline"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleButtonClick("left", onSwipeLeft);
        }}
        disabled={disabled}
        className={cn(
          "rounded-full h-16 w-16 bg-white border-2 border-red-500 shadow-lg",
          "transition-all duration-200 hover:scale-110 hover:shadow-xl",
          activeButton === "left" && "bg-red-50"
        )}
        type="button"
        aria-label="Swipe left"
      >
        <X className="h-8 w-8 text-red-500 stroke-[2.5px]" />
      </Button>

      {/* Super Like Button */}
      <Button
        variant="outline"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onSuperLike) {
            handleButtonClick("superLike", onSuperLike);
          }
        }}
        disabled={disabled}
        className={cn(
          "rounded-full h-14 w-14 bg-white border-2 border-blue-400 shadow-lg",
          "transition-all duration-200 hover:scale-110 hover:shadow-xl",
          activeButton === "superLike" && "bg-blue-50"
        )}
        type="button"
        aria-label="Super like"
      >
        <Star className="h-6 w-6 text-blue-400 fill-blue-400" />
      </Button>

      {/* Like Button */}
      <Button
        variant="outline"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleButtonClick("right", onSwipeRight);
        }}
        disabled={disabled}
        className={cn(
          "rounded-full h-16 w-16 bg-white border-2 border-green-500 shadow-lg",
          "transition-all duration-200 hover:scale-110 hover:shadow-xl",
          activeButton === "right" && "bg-green-50"
        )}
        type="button"
        aria-label="Swipe right"
      >
        <Heart className="h-8 w-8 text-green-500 fill-green-500" />
      </Button>
    </div>
  );
}
