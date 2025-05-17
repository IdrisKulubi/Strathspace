"use client";

import { Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { useState } from "react";
import { MobileCrushesModal } from "./mobile-crushes-modal";
import { MobileMatchesModal } from "./mobile-matches-modal";
import { ShareAppModal } from "@/components/shared/share-app";
import { NotifyMobile } from "../modals/notify-mobile";
import { ProfileDetails } from "./profile-details";

interface EmptyMobileViewProps {
  onShare: () => void;
  currentUser: { id: string };
}

export function EmptyMobileView({
  onShare,
  currentUser,
}: EmptyMobileViewProps) {
  const [crushesOpen, setCrushesOpen] = useState(false);
  const [matchesOpen, setMatchesOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

 

  const handleShare = () => {
    setShareOpen(true);
    onShare();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-gradient-to-b from-pink-50/30 to-white dark:from-pink-950/30 dark:to-background">
      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col justify-center items-center space-y-6">
        {/* Emoji Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="relative"
        >
          <span className="text-6xl">✨</span>
          <motion.span
            className="absolute -top-4 -right-4 text-4xl"
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            💝
          </motion.span>
        </motion.div>

        {/* Message */}
        <div className="text-center space-y-2 px-6">
          <h2 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            All Caught Up 🎉,Reload to view again
          </h2>
          <p className="text-sm text-muted-foreground">
            No more profiles to show right now... Share StrathSpace to find more
            people to crush on and stand a chance to win our
            exclusive gift 💝
          </p>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 gap-3 w-full px-4">
          <div className="p-3 rounded-xl bg-white/50 dark:bg-background/50 shadow-sm">
            <div className="text-xl mb-1">🔥</div>
            <div className="text-xs font-medium">Keep Swiping</div>
            <div className="text-[10px] text-muted-foreground">
              New people join daily
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/50 dark:bg-background/50 shadow-sm">
            <div className="text-xl mb-1">💫</div>
            <div className="text-xs font-medium">Share App</div>
            <div className="text-[10px] text-muted-foreground">
              Invite your besties
            </div>
          </div>
        </div>
      </div>

     

     
      <ShareAppModal isOpen={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}
