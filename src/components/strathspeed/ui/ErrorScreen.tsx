'use client';

import React from 'react';
import { AlertTriangle, RotateCcw, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorScreenProps {
  error: string;
  onRetry: () => void;
  title?: string;
  description?: string;
}

export function ErrorScreen({ 
  error, 
  onRetry, 
  title = "Oops! Something went wrong 😅",
  description = "Don't worry, these things happen! Let's try again."
}: ErrorScreenProps) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-red-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:via-red-900/10 dark:to-pink-900/10 flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center">
        {/* Error Icon */}
        <div className="w-20 h-20 mx-auto bg-gradient-to-r from-orange-400 to-red-500 rounded-2xl flex items-center justify-center relative mb-8">
          <AlertTriangle className="w-10 h-10 text-white" />
          <div className="absolute -top-2 -right-2">
            <Heart className="w-4 h-4 text-pink-400 fill-current animate-pulse" />
          </div>
        </div>

        {/* Error Content */}
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            {description}
          </p>
          
          {/* Technical Error */}
          <details className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-500/30">
            <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer font-medium">
              Technical details (tap to expand)
            </summary>
            <p className="text-xs text-red-700 dark:text-red-300 mt-2 font-mono bg-red-100 dark:bg-red-900/30 p-2 rounded">
              {error}
            </p>
          </details>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={onRetry}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0 rounded-xl shadow-lg"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Try Again
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => window.location.href = '/'}
            className="w-full h-10 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
          >
            Back to Home
          </Button>
        </div>

        {/* Encouraging Message */}
        <div className="mt-8 p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-orange-200/50 dark:border-orange-500/30">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <span className="text-orange-600 dark:text-orange-400 font-medium">
              💪 Stay strong! 
            </span>
            <br />
            Even the best apps have hiccups sometimes.
          </p>
        </div>
      </div>
    </div>
  );
} 