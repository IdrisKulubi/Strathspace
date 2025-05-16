"use client";

import { useEffect, useState } from "react";

export default function InitialLoading() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Only show loading screen on initial page load
    // Check if this is the first load using sessionStorage
    const hasLoaded = sessionStorage.getItem("hasInitiallyLoaded");
    
    if (hasLoaded) {
      setShow(false);
    } else {
      // Set a flag in sessionStorage to track that the app has loaded once
      sessionStorage.setItem("hasInitiallyLoaded", "true");
      
      // Hide loading screen after a short delay
      const timer = setTimeout(() => {
        setShow(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  // If not showing, return null
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-pink-400 via-purple-400 to-yellow-300 dark:from-purple-900 dark:via-pink-800 dark:to-yellow-600 animate-gradient-x relative overflow-hidden">
      <div className="relative flex flex-col items-center z-10">
        <div className="animate-bounce text-7xl mb-4 drop-shadow-lg">🪩</div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white text-center drop-shadow-lg tracking-tight font-marker">
          Hold up, bestie...<br />
          Cupid&apos;s doing a vibe check 💘
        </h1>
        <p className="mt-2 text-lg text-white/80 text-center max-w-xs">
          Manifesting your situationship <span aria-hidden>🦄✨</span><br />
          <span className="text-sm text-white/60">(pls wait, the algorithm is literally cooking rn 🍳)</span>
        </p>
        <div className="mt-8 w-48 h-2 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full w-1/3 bg-white/80 animate-shimmer" />
        </div>
      </div>
      <div className="absolute bottom-6 right-6 opacity-80 z-0 select-none pointer-events-none">
        <span className="text-4xl md:text-5xl">😎</span>
      </div>
      <div className="absolute top-10 left-10 animate-float-hearts text-pink-300 text-3xl">💖</div>
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/80 text-sm">
        <span className="animate-spin">🍟</span>
        <span>Loading your next situationship...</span>
        <span className="animate-spin">🍔</span>
      </div>
    </div>
  );
} 