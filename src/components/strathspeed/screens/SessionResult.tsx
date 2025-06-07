'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Heart, 
  User, 
  Star, 
  Clock, 
  Trophy, 
  Sparkles, 
  Users,
  ArrowRight,
  RotateCcw,
  MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import type { SpeedSession } from '@/db/schema';

interface SessionResultProps {
  session: SpeedSession;
  onContinue: () => void;
}

export function SessionResult({ session, onContinue }: SessionResultProps) {
  const [showAnimation, setShowAnimation] = useState(true);

  // Mock data - in real implementation, this would come from the session
  const sessionData = {
    duration: Math.floor((session.durationSeconds || 90) / 60),
    wasVibed: false, // Whether the other person vibed back
    isMatch: false, // Whether it was a mutual match
    pointsEarned: 15,
    streakContinued: true,
    newBadge: null as string | null,
  };

  const handleContinue = () => {
    if (sessionData.isMatch) {
      // Trigger confetti for matches
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
    
    setTimeout(() => {
      onContinue();
    }, sessionData.isMatch ? 1500 : 0);
  };

  const getResultConfig = () => {
    if (sessionData.isMatch) {
      return {
        title: "It's a Match! 💕",
        subtitle: "You both vibed with each other!",
        icon: Heart,
        bgColor: "bg-gradient-to-br from-pink-50 to-red-50 dark:from-pink-900/20 dark:to-red-900/20",
        iconColor: "text-pink-500",
        primaryAction: "Start Chatting",
        secondaryAction: "Keep Speed Dating",
      };
    } else if (sessionData.wasVibed) {
      return {
        title: "Great Connection! ✨",
        subtitle: "Someone vibed with you!",
        icon: Star,
        bgColor: "bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20",
        iconColor: "text-yellow-500",
        primaryAction: "Continue Speed Dating",
        secondaryAction: "View Profile",
      };
    } else {
      return {
        title: "Session Complete 👋",
        subtitle: "Thanks for connecting!",
        icon: Users,
        bgColor: "bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20",
        iconColor: "text-blue-500",
        primaryAction: "Next Match",
        secondaryAction: "Take a Break",
      };
    }
  };

  const config = getResultConfig();
  const Icon = config.icon;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Main Result Card */}
        <Card className={cn("text-center overflow-hidden", config.bgColor)}>
          <CardContent className="p-8">
            {/* Animated Icon */}
            <div className="relative mb-6">
              <div className={cn(
                "w-20 h-20 mx-auto rounded-full flex items-center justify-center",
                "bg-white/50 backdrop-blur-sm shadow-lg",
                showAnimation && "animate-bounce"
              )}>
                <Icon className={cn("w-10 h-10", config.iconColor)} />
              </div>
              
              {/* Sparkle animation for matches */}
              {sessionData.isMatch && (
                <div className="absolute -top-2 -right-2">
                  <Sparkles className="w-8 h-8 text-pink-400 animate-pulse" />
                </div>
              )}
            </div>

            {/* Result Text */}
            <h2 className="text-2xl font-bold mb-2">{config.title}</h2>
            <p className="text-muted-foreground mb-6">{config.subtitle}</p>

            {/* Session Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <Clock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm font-medium">{sessionData.duration}m</p>
                <p className="text-xs text-muted-foreground">Duration</p>
              </div>
              
              <div className="text-center">
                <Trophy className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                <p className="text-sm font-medium">+{sessionData.pointsEarned}</p>
                <p className="text-xs text-muted-foreground">Points</p>
              </div>
              
              <div className="text-center">
                <Sparkles className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                <p className="text-sm font-medium">{sessionData.streakContinued ? '🔥' : '👍'}</p>
                <p className="text-xs text-muted-foreground">Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Match Details (if matched) */}
        {sessionData.isMatch && (
          <Card className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-pink-200 dark:border-pink-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-12 h-12 border-2 border-pink-200">
                  <AvatarFallback className="bg-pink-100 text-pink-600">
                    ?
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">New Match!</h3>
                  <p className="text-sm text-muted-foreground">
                    You can now chat with this person
                  </p>
                </div>
                <Badge className="bg-pink-500 text-white">
                  <Heart className="w-3 h-3 mr-1" />
                  Match
                </Badge>
              </div>
              
              <Button 
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                onClick={() => {
                  // TODO: Navigate to chat
                  handleContinue();
                }}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Start Chatting
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Achievement/Badge Notification */}
        {sessionData.newBadge && (
          <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800">
            <CardContent className="p-4 text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <h3 className="font-semibold mb-1">New Badge Earned!</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {sessionData.newBadge}
              </p>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                Unlocked
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleContinue}
            className={cn(
              "w-full h-12 font-semibold",
              sessionData.isMatch 
                ? "bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            )}
          >
            {sessionData.isMatch ? (
              <>
                <MessageCircle className="w-4 h-4 mr-2" />
                {config.primaryAction}
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-2" />
                {config.primaryAction}
              </>
            )}
          </Button>

          <Button
            onClick={() => {
              // TODO: Handle secondary action
              handleContinue();
            }}
            variant="outline"
            className="w-full"
          >
            {config.secondaryAction}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Quick Stats Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Session Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Points earned:</span>
              <span className="font-medium text-yellow-600">+{sessionData.pointsEarned}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Session time:</span>
              <span className="font-medium">{sessionData.duration} minutes</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Streak status:</span>
              <span className="font-medium text-orange-600">
                {sessionData.streakContinued ? 'Continued 🔥' : 'Active ⭐'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Feedback Prompt */}
        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> The more you participate, the more SpeedPoints you'll earn!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 