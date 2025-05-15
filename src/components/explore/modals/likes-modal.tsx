"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Profile } from "@/db/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MatchCard } from "../cards/match-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { handleLike, handleUnlike } from "@/lib/actions/like.actions";

interface LikesModalProps {
  isOpen: boolean;
  onClose: () => void;
  likes: Profile[];
  onUpdate?: () => void;
  onUnlike: (userId: string) => Promise<{ success: boolean }>;
}

export function LikesModal({
  isOpen,
  onClose,
  likes,
  onUpdate,
}: LikesModalProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string>("");
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  // Reset removedIds when modal reopens
  useEffect(() => {
    if (!isOpen) {
      setRemovedIds(new Set());
    }
  }, [isOpen]);

  const handleLikeBack = async (userId: string) => {
    try {
      setIsProcessing(userId);
      const result = await handleLike(userId);

      if (result.success) {
        // Remove from likes list immediately
        setRemovedIds((prev) => new Set([...prev, userId]));

        if (result.isMatch) {
          // Show match celebration
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

          // Close the likes modal after a short delay to show the match modal
          setTimeout(() => {
            onClose();
          }, 1500);
        }

        // Update parent components to refresh the likes and matches lists
        await onUpdate?.();
      }
    } catch (error) {
      console.error("Failed to like back", error);
      toast({
        title: "Oops! 🙈",
        description: "Something went wrong while matching. Try again",
        variant: "destructive",
      });
    } finally {
      setIsProcessing("");
    }
  };

  const handleUnlikeAction = async (userId: string) => {
    try {
      setIsProcessing(userId);
      const result = await handleUnlike(userId);

      if (result.success) {
        // Remove from likes list immediately
        setRemovedIds((prev) => new Set([...prev, userId]));

        toast({
          title: "Slay bestie 💅",
          description: "They're gone faster than my motivation on Mondays",
        });

        // Update parent components to refresh the likes list
        onUpdate?.();
      }
    } catch (error) {
      console.error("Failed to unlike", error);
      toast({
        title: "Whoopsie 🙈",
        description:
          "That didn't work bestie, maybe it's a sign? jk try again!",
        variant: "destructive",
      });
    } finally {
      setIsProcessing("");
    }
  };

  // Filter out removed and duplicate profiles
  const visibleLikes = [
    ...new Map(
      likes
        .filter((profile) => !removedIds.has(profile.userId))
        .map((profile) => [profile.userId, profile])
    ).values(),
  ];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setRemovedIds(new Set());
        }
        onClose();
      }}
    >
      <DialogTitle>
      
      </DialogTitle>
      <DialogContent className="max-w-md p-6 bg-gradient-to-b from-white to-purple-50/50 dark:from-background dark:to-purple-950/20">
        <div className="relative">
          {/* Decorative hearts */}
          <div className="absolute -top-1 -left-1 text-pink-400 opacity-50">
            💝
          </div>
          <div className="absolute -top-1 -right-1 text-purple-400 opacity-50">
            💜
          </div>

          <h2 className="text-2xl font-bold mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-500 to-purple-400 dark:from-purple-400 dark:via-pink-300 dark:to-purple-200">
            People who liked you
            <span className="block text-base font-normal text-muted-foreground mt-1">
              {visibleLikes.length > 0 ? "✨ go bestie!" : ""}
            </span>
          </h2>
        </div>

        <ScrollArea className="h-[60vh] px-1">
          {visibleLikes.length > 0 ? (
            <div className="space-y-4 pr-4">
              {visibleLikes.map((profile) => (
                <div
                  key={`like-${profile.userId}-${
                    profile.createdAt.getTime() ?? Date.now()
                  }`}
                  className="transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg rounded-xl"
                >
                  <MatchCard
                    profile={profile}
                    onLikeBack={handleLikeBack}
                    onUnlike={handleUnlikeAction}
                    isProcessing={isProcessing === profile.userId}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-6 rounded-xl border border-purple-100 dark:border-purple-800/30">
              <EmptyState
                icon="✨"
                title="No likes yet bestie"
                description="Keep that profile glowing! Your future matches are loading... 💫"
                className="[&>h3]:bg-clip-text [&>h3]:text-transparent [&>h3]:bg-gradient-to-r [&>h3]:from-purple-600 [&>h3]:to-pink-500 [&>h3]:dark:from-purple-400 [&>h3]:dark:to-pink-300"
              />
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
