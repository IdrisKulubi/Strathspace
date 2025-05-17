"use client";

import { EyeOff, X } from "lucide-react";

interface AnonymousModeAlertProps {
  onDismiss?: () => void;
}

export function AnonymousModeAlert({
  onDismiss
}: AnonymousModeAlertProps) {
  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/50 dark:to-indigo-950/50 rounded-lg border border-purple-200 dark:border-purple-800 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-indigo-500"></div>
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/50">
          <EyeOff className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-medium text-purple-800 dark:text-purple-300 flex items-center gap-2">
            New Feature: Anonymous Mode
            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full">
              NEW
            </span>
          </h3>
          <p className="mt-1 text-sm text-purple-700 dark:text-purple-400">
            Hide your photos and only match with other anonymous users. Perfect for exploring connections with privacy.
          </p>
         
        </div>
        <button 
          onClick={onDismiss} 
          className="text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 p-1"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
} 