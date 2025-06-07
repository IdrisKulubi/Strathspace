'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Heart, 
  X,
  Flag,
  Clock,
  Sparkles,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStrathSpeedRealtimeStore, useVideoState } from '@/lib/stores/strathspeed-realtime-store';
import type { MatchData, IcebreakerPrompt } from '@/lib/stores/strathspeed-realtime-store';

interface VideoScreenProps {
  matchData: MatchData;
  sessionTimer: number;
  icebreaker: IcebreakerPrompt | null;
  onSessionEnd: () => void;
}

export function VideoScreen({ matchData, sessionTimer, icebreaker, onSessionEnd }: VideoScreenProps) {
  const [showIcebreaker, setShowIcebreaker] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [actionSent, setActionSent] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const videoState = useVideoState();
  const { sendSessionAction, toggleVideo, toggleAudio, updateVideoState } = useStrathSpeedRealtimeStore();

  // Format timer display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = ((90 - sessionTimer) / 90) * 100;

  // Auto-hide icebreaker after 10 seconds
  useEffect(() => {
    if (showIcebreaker) {
      const timer = setTimeout(() => {
        setShowIcebreaker(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showIcebreaker]);

  // Handle session actions
  const handleAction = async (action: 'vibe' | 'skip' | 'report') => {
    if (actionSent) return;
    
    setActionSent(true);
    try {
      await sendSessionAction(action);
      // Session will end automatically via store updates
    } catch (error) {
      console.error('Failed to send action:', error);
      setActionSent(false);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Get timer color based on remaining time
  const getTimerColor = () => {
    if (sessionTimer <= 10) return 'text-red-500';
    if (sessionTimer <= 30) return 'text-orange-500';
    return 'text-green-500';
  };

  return (
    <div className="min-h-screen w-full bg-black relative overflow-hidden">
      {/* Video Container */}
      <div className="relative w-full h-full">
        {/* Main Video Area */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black">
          {/* Placeholder for Daily.co video component */}
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-white">
              <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium opacity-75">Video chat will appear here</p>
              <p className="text-sm opacity-50">Daily.co integration in progress</p>
            </div>
          </div>
        </div>

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4">
          <div className="flex items-center justify-between">
            {/* Session Timer */}
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
              <Clock className={cn("w-4 h-4", getTimerColor())} />
              <span className={cn("text-sm font-bold", getTimerColor())}>
                {formatTime(sessionTimer)}
              </span>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className={cn(
                  "bg-black/50 backdrop-blur-sm border-0",
                  videoState.isConnected ? "text-green-400" : "text-red-400"
                )}
              >
                <div className={cn(
                  "w-2 h-2 rounded-full mr-2 animate-pulse",
                  videoState.isConnected ? "bg-green-400" : "bg-red-400"
                )} />
                {videoState.isConnected ? 'Connected' : 'Connecting...'}
              </Badge>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <Progress 
              value={progressPercentage} 
              className="h-1 bg-white/20"
            />
          </div>
        </div>

        {/* Icebreaker Card */}
        {showIcebreaker && icebreaker && (
          <div className="absolute top-20 left-4 right-4 z-30">
            <Card className="bg-black/70 backdrop-blur-md border-purple-500/30 text-white">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">Icebreaker 💬</h4>
                    <p className="text-sm text-gray-200">{icebreaker.promptText}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowIcebreaker(false)}
                    className="text-white hover:bg-white/20 p-1 h-auto"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Video Controls */}
        <div className="absolute bottom-32 left-4 right-4 z-20">
          <div className="flex items-center justify-center gap-4">
            {/* Mic Toggle */}
            <Button
              onClick={toggleAudio}
              className={cn(
                "w-12 h-12 rounded-full border-2",
                videoState.isAudioOn 
                  ? "bg-white/20 border-white/30 text-white hover:bg-white/30" 
                  : "bg-red-500 border-red-400 text-white hover:bg-red-600"
              )}
            >
              {videoState.isAudioOn ? (
                <Mic className="w-5 h-5" />
              ) : (
                <MicOff className="w-5 h-5" />
              )}
            </Button>

            {/* Video Toggle */}
            <Button
              onClick={toggleVideo}
              className={cn(
                "w-12 h-12 rounded-full border-2",
                videoState.isVideoOn 
                  ? "bg-white/20 border-white/30 text-white hover:bg-white/30" 
                  : "bg-red-500 border-red-400 text-white hover:bg-red-600"
              )}
            >
              {videoState.isVideoOn ? (
                <Video className="w-5 h-5" />
              ) : (
                <VideoOff className="w-5 h-5" />
              )}
            </Button>

            {/* Fullscreen Toggle */}
            <Button
              onClick={toggleFullscreen}
              className="w-12 h-12 rounded-full border-2 bg-white/20 border-white/30 text-white hover:bg-white/30"
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </Button>

            {/* Show Icebreaker */}
            {!showIcebreaker && icebreaker && (
              <Button
                onClick={() => setShowIcebreaker(true)}
                className="w-12 h-12 rounded-full border-2 bg-purple-500 border-purple-400 text-white hover:bg-purple-600"
              >
                <MessageCircle className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="absolute bottom-8 left-4 right-4 z-20">
          <div className="flex items-center justify-center gap-4">
            {/* Skip Button */}
            <Button
              onClick={() => handleAction('skip')}
              disabled={actionSent}
              className="flex-1 h-14 bg-gray-600 hover:bg-gray-700 text-white border-0 rounded-2xl font-semibold text-base max-w-[120px]"
            >
              <X className="w-5 h-5 mr-2" />
              Skip
            </Button>

            {/* Vibe Button */}
            <Button
              onClick={() => handleAction('vibe')}
              disabled={actionSent}
              className="flex-1 h-14 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0 rounded-2xl font-semibold text-base max-w-[120px] shadow-lg"
            >
              <Heart className="w-5 h-5 mr-2" />
              Vibe! ✨
            </Button>

            {/* Report Button */}
            <Button
              onClick={() => handleAction('report')}
              disabled={actionSent}
              variant="ghost"
              className="w-12 h-12 rounded-full text-white hover:bg-red-500/20 border border-red-500/30"
            >
              <Flag className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Anonymous Mode Indicator */}
        {matchData.isAnonymous && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
            <Badge className="bg-purple-500/80 text-white border-0 backdrop-blur-sm">
              <Sparkles className="w-3 h-3 mr-1" />
              Anonymous Mode
            </Badge>
          </div>
        )}

        {/* Action Sent Overlay */}
        {actionSent && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center">
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Action sent! 🎉</h3>
                <p className="text-sm text-muted-foreground">
                  Ending session and processing your choice...
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
} 