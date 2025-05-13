"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";

export function ModeSelectClient() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/30 to-white dark:from-pink-950/30 dark:to-background">
      <div className="container max-w-4xl mx-auto px-4 pt-32 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-6 mb-16"
        >
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              Welcome to StrathSpace
            </h1>
            <span className="text-4xl">🎉</span>

          </div>
          <p className="text-xl text-muted-foreground">
            Choose how you'd like to connect with others
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Dating Mode Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
            <Link href="/profile/setup?mode=dating" className="block">
              <div className="bg-white/50 dark:bg-background/50 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-pink-100 dark:border-pink-950 space-y-6 text-center hover:scale-105 transition-transform duration-300">
                <div className="text-6xl">💝</div>
                <h2 className="text-2xl font-semibold">Dating</h2>
                <p className="text-muted-foreground">
                  Find your perfect match and explore romantic connections
                </p>
                <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                  Start Dating Journey
                </Button>
              </div>
            </Link>
          </motion.div>

          {/* Friends Mode Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
            <Link href="/friends/setup?mode=friends" className="block">
              <div className="bg-white/50 dark:bg-background/50 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-pink-100 dark:border-pink-950 space-y-6 text-center hover:scale-105 transition-transform duration-300">
                <div className="text-6xl">👥</div>
                <h2 className="text-2xl font-semibold">Friends & Study Buddies</h2>
                <p className="text-muted-foreground">
                  Connect with like-minded people for friendship and study sessions
                </p>
                <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                  Find Friends
                </Button>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Decorative elements */}
        <div
          aria-hidden="true"
          className="absolute -bottom-32 left-1/4 text-pink-500/10 text-9xl select-none animate-float"
        >
          ✨
        </div>
        <div
          aria-hidden="true"
          className="absolute top-20 right-1/4 text-pink-500/10 text-8xl select-none rotate-12 animate-float delay-150"
        >
          💫
        </div>
      </div>
    </div>
  );
} 