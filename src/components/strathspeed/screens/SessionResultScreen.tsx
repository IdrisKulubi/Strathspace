'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  X, 
  Flag,
  Sparkles,
  Trophy,
  MessageCircle,
  UserPlus,
  RotateCcw,
  Home,
  Star,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SpeedSession, SessionActionResult } from '@/lib/stores/strathspeed-realtime-store';

interface SessionResultScreenProps {
  session: SpeedSession;
  lastActionResult: SessionActionResult | null;
  onContinue: () => void;
}

export function SessionResultScreen({ session, lastActionResult, onContinue }: SessionResultScreenProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  // Show confetti for matches
  useEffect(() => {
    if (lastActionResult?.isMatch) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastActionResult]);

  const getResultInfo = () => {
    if (!lastActionResult) {
      return {
        title: 'Session Complete! 🎉',
        subtitle: 'Thanks for using StrathSpeed',
        icon: <Sparkles className="w-12 h-12 text-purple-500" />,
        color: 'purple',
        bgGradient: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20'
      };
    }

    switch (lastActionResult.action) {
      case 'vibe':
        if (lastActionResult.isMatch) {
          return {
            title: 'It\'s a Match! 💕',
            subtitle: 'You both vibed with each other! Time to start chatting',
            icon: <Heart className="w-12 h-12 text-pink-500 animate-pulse" />,
            color: 'pink',
            bgGradient: 'from-pink-50 to-red-50 dark:from-pink-900/20 dark:to-red-900/20'
          };
        } else {
          return {
            title: 'Vibe Sent! ✨',
            subtitle: 'Your vibe has been delivered! Maybe they\'ll vibe back',
            icon: <Heart className="w-12 h-12 text-purple-500" />,
            color: 'purple',
            bgGradient: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20'
          };
        }
      case 'skip':
        return {
          title: 'No Worries! 👋',
          subtitle: 'Not every connection is meant to be. Let\'s find your next match!',
          icon: <RotateCcw className="w-12 h-12 text-blue-500" />,
          color: 'blue',
          bgGradient: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20'
        };
      case 'report':
        return {
          title: 'Report Submitted 🛡️',
          subtitle: 'Thank you for keeping StrathSpeed safe. We\'ll review this report.',
          icon: <Flag className="w-12 h-12 text-orange-500" />,
          color: 'orange',
          bgGradient: 'from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20'
        };
      default:
        return {
          title: 'Session Complete! 🎉',
          subtitle: 'Thanks for using StrathSpeed',
          icon: <Sparkles className="w-12 h-12 text-purple-500" />,
          color: 'purple',
          bgGradient: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20'
        };
    }
  };

  const resultInfo = getResultInfo();
  const pointsEarned = lastActionResult?.points || 0;

  return (
    <div className={cn(
      "min-h-screen w-full p-4 flex items-center justify-center bg-gradient-to-br",
      resultInfo.bgGradient
    )}>
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              {['💕', '✨', '🎉', '💖', '⭐'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
            StrathSpeed
          </h1>
        </div>

        {/* Result Card */}
        <Card className={cn(
          "border-2 shadow-xl",
          resultInfo.color === 'pink' && "border-pink-200 dark:border-pink-500/30",
          resultInfo.color === 'purple' && "border-purple-200 dark:border-purple-500/30",
          resultInfo.color === 'blue' && "border-blue-200 dark:border-blue-500/30",
          resultInfo.color === 'orange' && "border-orange-200 dark:border-orange-500/30"
        )}>
          <CardContent className="p-8 text-center">
            {/* Result Icon */}
            <div className="mb-6">
              {resultInfo.icon}
            </div>

            {/* Result Text */}
            <h2 className="text-2xl font-bold mb-3">
              {resultInfo.title}
            </h2>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              {resultInfo.subtitle}
            </p>

            {/* Points Earned */}
            {pointsEarned > 0 && (
              <div className="mb-6">
                <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-600" />
                      <span className="font-semibold text-yellow-700 dark:text-yellow-300">
                        +{pointsEarned} Speed Points!
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Match Actions */}
            {lastActionResult?.isMatch && (
              <div className="space-y-3 mb-6">
                <Button
                  onClick={() => {
                    // Navigate to chat with matched user
                    window.location.href = '/messages';
                  }}
                  className="w-full h-12 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0 rounded-xl font-semibold"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Start Chatting! 💬
                </Button>
                
                <p className="text-xs text-muted-foreground">
                  Your match has been added to your messages
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Stats */}
        <Card className="border-gray-200 dark:border-gray-500/30">
          <CardContent className="p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              Session Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-purple-600">90s</p>
                <p className="text-xs text-muted-foreground">Duration</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{pointsEarned}</p>
                <p className="text-xs text-muted-foreground">Points Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={onContinue}
            className="w-full h-14 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0 rounded-xl font-semibold text-base"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Find Another Match! 🚀
          </Button>
          
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="w-full h-12 rounded-xl border-2 border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-700"
          >
            <Home className="w-5 h-5 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* Encouraging Message */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-500/30">
          <CardContent className="p-4 text-center">
            <Sparkles className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
              {lastActionResult?.isMatch 
                ? '🎉 Amazing! You found a connection!' 
                : '✨ Keep going! Your perfect match is out there!'
              }
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {lastActionResult?.isMatch 
                ? 'Don\'t forget to send them a message!'
                : 'Every session gets you closer to finding your vibe!'
              }
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 