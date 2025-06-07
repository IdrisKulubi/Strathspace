'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Users, Heart, Video, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface StrathSpeedFloatingButtonProps {
  className?: string;
}

export function StrathSpeedFloatingButton({ className }: StrathSpeedFloatingButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const router = useRouter();

  const handleClick = () => {
    setIsPressed(true);
    setTimeout(() => {
      router.push('/strathspeed');
    }, 150);
  };

  return (
    <motion.div
      className={cn("fixed z-50", className)}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 25,
        delay: 0.2
      }}
    >
      {/* Animated background glow */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 opacity-20 blur-lg"
        animate={{
          scale: isHovered ? 1.2 : 1,
          opacity: isHovered ? 0.3 : 0.2,
        }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Main button */}
      <motion.div
        className="relative"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <Button
          onClick={handleClick}
          className={cn(
            "h-14 w-14 rounded-full shadow-lg",
            "bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500",
            "hover:from-pink-600 hover:via-purple-600 hover:to-pink-600",
            "border-2 border-white/20 backdrop-blur-sm",
            "transition-all duration-300",
            isPressed && "scale-90"
          )}
          size="icon"
        >
          {/* Lightning bolt icon with animations */}
          <motion.div
            animate={{
              rotate: isHovered ? 360 : 0,
              scale: isPressed ? 0.8 : 1,
            }}
            transition={{
              rotate: { duration: 0.6, ease: "easeInOut" },
              scale: { duration: 0.1 }
            }}
          >
            <Zap className="h-6 w-6 text-white" fill="currentColor" />
          </motion.div>

          {/* Sparkle effects */}
          <AnimatePresence>
            {isHovered && (
              <>
                <motion.div
                  className="absolute -top-1 -right-1"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Sparkles className="h-4 w-4 text-yellow-300" />
                </motion.div>
                <motion.div
                  className="absolute -bottom-1 -left-1"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Heart className="h-3 w-3 text-pink-300" />
                </motion.div>
                <motion.div
                  className="absolute top-1 -left-2"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <Video className="h-3 w-3 text-blue-300" />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Floating label */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute right-16 top-1/2 -translate-y-1/2"
            initial={{ opacity: 0, x: 10, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-gray-900/90 backdrop-blur-sm text-white px-3 py-2 rounded-lg shadow-lg border border-white/10">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <Users className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium">Speed Dating</span>
              </div>
              <div className="text-xs text-gray-300 mt-0.5">Find your match fast! ⚡</div>
            </div>
            {/* Arrow pointing to button */}
            <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-gray-900/90 border-t-4 border-t-transparent border-b-4 border-b-transparent" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pulse animation for attention */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-pink-400/50"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
} 