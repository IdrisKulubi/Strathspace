'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Video, 
  Zap, 
  Heart, 
  Users, 
  Trophy, 
  Clock, 
  Eye, 
  EyeOff,
  Settings,
  Play,
  Sparkles,
  Star,
  Flame,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SpeedDatingProfile } from '@/db/schema';
import { useStrathSpeedRealtimeStore } from '@/lib/stores/strathspeed-realtime-store';

interface HomeScreenProps {
  userId: string;
  profile: SpeedDatingProfile | null;
}

export function HomeScreen({ userId, profile }: HomeScreenProps) {
  const [anonymousMode, setAnonymousMode] = useState(profile?.anonymousMode || false);
  const [isStarting, setIsStarting] = useState(false);
  const { joinQueue } = useStrathSpeedRealtimeStore();

  const handleStartMatching = async () => {
    setIsStarting(true);
    try {
      await joinQueue({
        anonymousMode,
        ageRange: profile?.preferences?.ageRange || [18, 25],
        genderPreference: profile?.preferences?.genderPreference || 'any',
        interests: profile?.preferences?.interests || []
      });
    } catch (error) {
      console.error('Failed to start matching:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const stats = {
    totalSessions: profile?.totalSessions || 0,
    speedPoints: profile?.speedPoints || 0,
    vibesReceived: profile?.vibesReceived || 0,
    currentStreak: profile?.currentStreak || 0,
  };

  return (
    <div className="min-h-screen w-full p-4 pb-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header with Logo */}
        <div className="text-center pt-8 pb-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                StrathSpeed
              </h1>
              <p className="text-sm text-muted-foreground font-medium">Live Video Speed Dating ⚡</p>
            </div>
          </div>
          
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
            Meet new people through quick 90-second video chats. 
            Find your vibe or skip to the next! 🎯
          </p>
        </div>

        {/* User Profile Card */}
        <Card className="border-2 border-pink-200/50 dark:border-purple-500/30 bg-gradient-to-br from-white to-pink-50/50 dark:from-gray-800 dark:to-purple-900/20 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center gap-4 mb-5">
              <Avatar className="w-14 h-14 border-3 border-pink-300 shadow-md">
                <AvatarImage src={`/api/avatar/${userId}`} alt="You" />
                <AvatarFallback className="bg-gradient-to-r from-pink-100 to-purple-100 text-lg font-bold">
                  {userId[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-bold text-lg">Ready to connect! 🚀</h3>
                <p className="text-sm text-muted-foreground">Let's find your next vibe</p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300 px-3 py-1">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                Online
              </Badge>
            </div>

            {/* Anonymous Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-3">
                {anonymousMode ? (
                  <EyeOff className="w-5 h-5 text-purple-500" />
                ) : (
                  <Eye className="w-5 h-5 text-purple-500" />
                )}
                <div>
                  <span className="text-sm font-semibold">Anonymous Mode</span>
                  <p className="text-xs text-muted-foreground">Hide your identity during chats</p>
                </div>
              </div>
              <Switch
                checked={anonymousMode}
                onCheckedChange={setAnonymousMode}
                className="data-[state=checked]:bg-purple-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 text-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-500/30">
            <Trophy className="w-7 h-7 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold text-blue-600">{stats.speedPoints}</p>
            <p className="text-xs text-blue-600/70 font-medium">Speed Points</p>
          </Card>
          
          <Card className="p-4 text-center bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 border-pink-200 dark:border-pink-500/30">
            <Heart className="w-7 h-7 mx-auto mb-2 text-pink-500" />
            <p className="text-2xl font-bold text-pink-600">{stats.vibesReceived}</p>
            <p className="text-xs text-pink-600/70 font-medium">Vibes Received</p>
          </Card>
          
          <Card className="p-4 text-center bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-500/30">
            <Users className="w-7 h-7 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-green-600">{stats.totalSessions}</p>
            <p className="text-xs text-green-600/70 font-medium">Sessions</p>
          </Card>
          
          <Card className="p-4 text-center bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-500/30">
            <Flame className="w-7 h-7 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold text-orange-600">{stats.currentStreak}</p>
            <p className="text-xs text-orange-600/70 font-medium">Day Streak</p>
          </Card>
        </div>

        {/* How it Works */}
        <Card className="border-purple-200 dark:border-purple-500/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-purple-500" />
              <h3 className="font-bold text-lg">How StrathSpeed Works</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-purple-600">1</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">Get Matched Instantly ⚡</p>
                  <p className="text-xs text-muted-foreground">We'll find you someone online in seconds</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-purple-600">2</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">90-Second Video Chat 📹</p>
                  <p className="text-xs text-muted-foreground">Quick conversation with a fun icebreaker</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-purple-600">3</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">Vibe or Skip 💫</p>
                  <p className="text-xs text-muted-foreground">Send a vibe to connect or skip to the next person</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Start Matching Button */}
        <div className="space-y-4 pt-2">
          <Button
            onClick={handleStartMatching}
            disabled={isStarting}
            className={cn(
              "w-full h-16 text-lg font-bold rounded-2xl shadow-xl transition-all duration-300",
              "bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600",
              "text-white border-0 transform hover:scale-105 active:scale-95",
              isStarting && "animate-pulse"
            )}
          >
            {isStarting ? (
              <>
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                Finding your match...
              </>
            ) : (
              <>
                <Play className="w-6 h-6 mr-3" />
                Start Speed Dating! 🚀
              </>
            )}
          </Button>
          
          <p className="text-center text-xs text-muted-foreground">
            By starting, you agree to be respectful and follow community guidelines 💜
          </p>
        </div>

        {/* Fun Tip */}
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-500/30">
          <CardContent className="p-4 text-center">
            <Sparkles className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
              💡 Pro Tip: Be yourself and keep the energy positive! 
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
              Authentic vibes get the best connections ✨
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 