"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Share } from "lucide-react";
import { LikedPanel } from "./cards/liked-panel";
import { MatchesPanel } from "./cards/matches-panel";
import type { Profile } from "@/db/schema";
import { undoLastSwipe } from "@/lib/actions/explore.actions";
import { useToast } from "@/hooks/use-toast";
import { EmptyMobileView } from "./cards/empty-mobile";
import { ShareAppModal } from "../shared/share-app";
import { NotifyModal } from "./modals/notify";

interface NoMoreProfilesProps {
  initialLikedProfiles: Profile[];
}

export function NoMoreProfiles({ initialLikedProfiles }: NoMoreProfilesProps) {
  const [mounted, setMounted] = useState(false);
  const [likedProfiles, setLikedProfiles] = useState(initialLikedProfiles);
  const [showShareModal, setShowShareModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleUnlike = async (profileId: string) => {
    const result = await undoLastSwipe(profileId);
    if (result.success) {
      setLikedProfiles((prev) => prev.filter((p) => p.userId !== profileId));
      toast({
        description: "Removed from your crushes 💔",
      });
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  return (
    <div className="relative w-full">
      <div className="absolute top-0 left-0 right-0">
        <NotifyModal />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <LikedPanel profiles={likedProfiles} onUnlike={handleUnlike} />
        <MatchesPanel profiles={likedProfiles} />

        {/* Original desktop content */}
        <div className="relative p-8 rounded-3xl bg-gradient-to-br from-pink-50/90 to-purple-50/90 dark:from-pink-950/50 dark:to-purple-950/50 backdrop-blur-sm border border-pink-100 dark:border-pink-800 shadow-xl max-w-md w-full mx-auto mt-24">
          {/* Floating emojis */}
          <div className="absolute -top-6 -right-4 text-6xl animate-bounce delay-100">
            ✨
          </div>
          <div className="absolute -bottom-4 -left-4 text-6xl animate-bounce delay-300">
            🌸
          </div>

          <div
            className={`space-y-6 transition-all duration-500 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            {/* Fun header */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Bestie, you&apos;re all caught up 🎉
              </h2>
              <p className="text-lg text-muted-foreground">
                No more profiles in your area rn...
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="text-center p-3 rounded-2xl bg-white/50 dark:bg-background/50">
                <div className="text-2xl mb-1">🔥</div>
                <div className="text-sm font-medium">Keep Swiping</div>
                <div className="text-xs text-muted-foreground">
                  New people join daily
                </div>
              </div>
              <div className="text-center p-3 rounded-2xl bg-white/50 dark:bg-background/50">
                <div className="text-2xl mb-1">💫</div>
                <div className="text-sm font-medium">Spread the Love</div>
                <div className="text-xs text-muted-foreground">
                  Invite your besties
                </div>
              </div>
            </div>

            {/* Call to action */}
            <div className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Know someone who&apos;d be perfect for StrathSpace? <br />
                Share the love and help them find their Valentine and stand a
                chance to win our valentines Day exclusive gift 💝
              </p>
              <Button
                onClick={handleShare}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg group"
              >
                <Share className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
                Share StrathSpace
              </Button>
            </div>

            {/* Fun footer */}
            <div className="text-center text-sm text-muted-foreground">
              <p className="italic">
                &quot;The best things in life are worth waiting for&quot; ✨
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden">
        <EmptyMobileView
          likedProfiles={likedProfiles}
          onShare={handleShare}
          onUnlike={handleUnlike}
        />
      </div>

      <ShareAppModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
}
