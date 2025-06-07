'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SpeedDatingProfile } from '@/db/schema';

interface StrathSpeedHomeProps {
  userId: string;
  userName: string;
  profile: SpeedDatingProfile | null;
  onStartMatching: () => void;
}

export function StrathSpeedHome({ 
  userId, 
  userName, 
  profile, 
  onStartMatching 
}: StrathSpeedHomeProps) {
  const [anonymousMode, setAnonymousMode] = useState(profile?.anonymousMode || false);
  const [isStarting, setIsStarting] = useState(false);

  const handleStartMatching = async () => {
    setIsStarting(true);
    try {
      await onStartMatching();
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
    <div className="container mx-auto px-4 py-6 max-w-md">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              StrathSpeed
            </h1>
            <p className="text-sm text-muted-foreground">Live Video Speed Dating</p>
          </div>
        </div>
        
        <p className="text-muted-foreground text-sm leading-relaxed">
          Meet new people through quick 90-second video chats. 
          <br />Find your vibe or skip to the next!
        </p>
      </div>

      {/* User Profile Card */}
      <Card className="mb-6 border-gradient-to-r from-pink-200 to-purple-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-12 h-12 border-2 border-pink-200">
              <AvatarImage src={profile?.userId} alt={userName} />
              <AvatarFallback className="bg-gradient-to-r from-pink-100 to-purple-100">
                {userName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold">{userName}</h3>
              <p className="text-sm text-muted-foreground">Ready to connect</p>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              Online
            </Badge>
          </div>

          {/* Anonymous Mode Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              {anonymousMode ? (
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Eye className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">Anonymous Mode</span>
            </div>
            <Switch
              checked={anonymousMode}
              onCheckedChange={setAnonymousMode}
              className="data-[state=checked]:bg-purple-500"
            />
          </div>
          
          {anonymousMode && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Your name and photo will be hidden during sessions
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="p-4 text-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <Trophy className="w-6 h-6 mx-auto mb-2 text-blue-500" />
          <p className="text-2xl font-bold text-blue-600">{stats.speedPoints}</p>
          <p className="text-xs text-blue-600/70">Speed Points</p>
        </Card>
        
        <Card className="p-4 text-center bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20">
          <Heart className="w-6 h-6 mx-auto mb-2 text-pink-500" />
          <p className="text-2xl font-bold text-pink-600">{stats.vibesReceived}</p>
          <p className="text-xs text-pink-600/70">Vibes Received</p>
        </Card>
        
        <Card className="p-4 text-center bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <Users className="w-6 h-6 mx-auto mb-2 text-green-500" />
          <p className="text-2xl font-bold text-green-600">{stats.totalSessions}</p>
          <p className="text-xs text-green-600/70">Sessions</p>
        </Card>
        
        <Card className="p-4 text-center bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
          <Sparkles className="w-6 h-6 mx-auto mb-2 text-orange-500" />
          <p className="text-2xl font-bold text-orange-600">{stats.currentStreak}</p>
          <p className="text-xs text-orange-600/70">Day Streak</p>
        </Card>
      </div>

      {/* How it Works */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-500" />
            How StrathSpeed Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-purple-600">1</span>
            </div>
            <div>
              <p className="text-sm font-medium">Get Matched</p>
              <p className="text-xs text-muted-foreground">We'll find you someone online instantly</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-purple-600">2</span>
            </div>
            <div>
              <p className="text-sm font-medium">90-Second Chat</p>
              <p className="text-xs text-muted-foreground">Quick video conversation with an icebreaker</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-purple-600">3</span>
            </div>
            <div>
              <p className="text-sm font-medium">Vibe or Skip</p>
              <p className="text-xs text-muted-foreground">Send a vibe to connect or skip to the next person</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Start Matching Button */}
      <div className="space-y-4">
        <Button
          onClick={handleStartMatching}
          disabled={isStarting}
          className={cn(
            "w-full h-14 text-lg font-semibold",
            "bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600",
            "shadow-lg hover:shadow-xl transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isStarting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Joining Queue...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" />
              Start StrathSpeed
            </>
          )}
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {/* TODO: Open settings */}}
        >
          <Settings className="w-4 h-4 mr-2" />
          Preferences & Settings
        </Button>
      </div>

      {/* Safety Notice */}
      <Card className="mt-6 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <CardContent className="p-4">
          <p className="text-xs text-amber-700 dark:text-amber-300 text-center leading-relaxed">
            <strong>Safety First:</strong> Report any inappropriate behavior immediately. 
            All sessions are monitored for community safety.
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 