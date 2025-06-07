'use client';

import React from 'react';
import { Heart, Zap, Sparkles } from 'lucide-react';

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
}

export function LoadingScreen({ 
  title = "Getting ready to connect! ✨", 
  subtitle = "Hold tight, we're setting things up..." 
}: LoadingScreenProps) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center">
        <div className="relative mb-8 animate-fade-in">
          <div className="w-20 h-20 mx-auto bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center relative overflow-hidden">
            <Zap className="w-10 h-10 text-white" />
            <div className="absolute -top-2 -right-2 animate-spin">
              <Sparkles className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="absolute -bottom-1 -left-1 animate-pulse">
              <Heart className="w-4 h-4 text-pink-300" />
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-center items-center space-x-2">
            <div className="w-3 h-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full animate-pulse" />
            <div className="w-3 h-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}} />
            <div className="w-3 h-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}} />
          </div>
        </div>
        
        <div className="space-y-3 animate-slide-up">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{subtitle}</p>
        </div>
        
        <div className="mt-8 p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-pink-200/50 dark:border-purple-500/30 animate-fade-in">
          <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
            💡 Tip: Keep your vibes positive and authentic!
          </p>
        </div>
      </div>
    </div>
  );
}
