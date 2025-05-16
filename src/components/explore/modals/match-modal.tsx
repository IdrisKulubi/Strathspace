"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  matchedProfile: any;
  currentUser: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentUserProfile: any;
  onStartChat?: () => void;
}

export function MatchModal({
  isOpen,
  onClose,
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  currentUser,
  matchedProfile,
  currentUserProfile,
  onStartChat,
}: MatchModalProps) {
  const confettiFired = useRef(false);

  useEffect(() => {
    if (isOpen && !confettiFired.current) {
      confettiFired.current = true;
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#ff69b4", "#ff85c8", "#ffa1dc", "#a78bfa", "#f472b6"],
      });
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 120,
          origin: { y: 0.7 },
          scalar: 1.2,
          colors: ["#ff69b4", "#a78bfa", "#f472b6"],
        });
      }, 300);
    }
    if (!isOpen) confettiFired.current = false;
  }, [isOpen]);

  if (!matchedProfile || !currentUserProfile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogTitle></DialogTitle>
      <DialogContent
        className="max-w-sm w-full mx-auto bg-white dark:bg-gray-950 p-6 rounded-3xl shadow-2xl border-0 relative overflow-visible"
        aria-label="It's a Match!"
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="flex flex-col items-center gap-6"
            >
              {/* Overlapping Profile Images */}
              <div className="relative flex items-center justify-center mb-2 h-32">
                <motion.div
                  initial={{ x: -32, rotate: -12, opacity: 0 }}
                  animate={{ x: -16, rotate: -12, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="z-10"
                >
                  <Image
                    src={currentUserProfile.profilePhoto || currentUserProfile.photos?.[0] || "/default-avatar.png"}
                    alt={currentUserProfile.firstName || "You"}
                    width={96}
                    height={96}
                    className="rounded-full border-4 border-pink-200 shadow-lg object-cover w-24 h-24 bg-white"
                    priority
                  />
                </motion.div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-white rounded-full p-2 shadow-xl border-2 border-pink-400"
                >
                  <Heart className="w-8 h-8 text-pink-500 animate-pulse" />
                </motion.div>
                <motion.div
                  initial={{ x: 32, rotate: 12, opacity: 0 }}
                  animate={{ x: 16, rotate: 12, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="z-10"
                >
                  <Image
                    src={matchedProfile.profilePhoto || matchedProfile.photos?.[0] || "/default-avatar.png"}
                    alt={matchedProfile.firstName || "Match"}
                    width={96}
                    height={96}
                    className="rounded-full border-4 border-purple-200 shadow-lg object-cover w-24 h-24 bg-white"
                    priority
                  />
                </motion.div>
              </div>

              {/* Headline & Names */}
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-3xl font-extrabold text-center bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent drop-shadow-sm"
              >
                It&apos;s a Match!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32 }}
                className="text-center text-lg font-medium text-gray-700 dark:text-gray-200"
              >
                {currentUserProfile.firstName} & <span className="font-bold text-pink-500">{matchedProfile.firstName}</span>
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38 }}
                className="text-center text-base text-gray-500 dark:text-gray-400 mb-2"
              >
                You both liked each other! Start a chat and see where it goes 💬
              </motion.p>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="flex flex-col gap-3 w-full"
              >
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white text-lg font-semibold shadow-lg hover:from-pink-600 hover:to-purple-600"
                  onClick={() => {
                    onClose();
                    onStartChat?.();
                  }}
                  aria-label="Start Chat"
                >
                  <MessageCircle className="w-5 h-5 mr-2" /> Start Chat
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full border-pink-300 text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950"
                  onClick={onClose}
                  aria-label="Keep Swiping"
                >
                  Keep Swiping
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
