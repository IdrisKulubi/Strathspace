'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Clock, 
  Zap, 
  Heart, 
  X,
  Loader2,
  Sparkles,
  Target,
  Timer,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStrathSpeedRealtimeStore } from '@/lib/stores/strathspeed-realtime-store';
import type { QueueStatus, QueueData } from '@/lib/stores/strathspeed-realtime-store';

interface QueueScreenProps {
  queueStatus: QueueStatus;
  queueData: QueueData | null;
  error: string | null;
}

export function QueueScreen({ queueStatus, queueData, error }: QueueScreenProps) {
  const [dots, setDots] = useState('');
  const { leaveQueue } = useStrathSpeedRealtimeStore();

  // Animated dots for loading effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleLeaveQueue = async () => {
    try {
      await leaveQueue();
    } catch (error) {
      console.error('Failed to leave queue:', error);
    }
  };

  const getStatusInfo = () => {
    switch (queueStatus) {
      case 'waiting':
        return {
          title: `Finding your match${dots}`,
          subtitle: 'Hang tight! We\'re connecting you with someone awesome',
          icon: <Target className="w-8 h-8 text-purple-500 animate-pulse" />,
          color: 'purple'
        };
      case 'matched':
        return {
          title: 'Match found! 🎉',
          subtitle: 'Get ready to connect in just a moment',
          icon: <UserCheck className="w-8 h-8 text-green-500" />,
          color: 'green'
        };
      default:
        return {
          title: 'Joining queue...',
          subtitle: 'Setting up your speed dating experience',
          icon: <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />,
          color: 'blue'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const position = queueData?.position || 0;
  const queueSize = queueData?.queueSize || 0;
  const estimatedWait = queueData?.estimatedWaitTime || 0;

  return (
    <div className="min-h-screen w-full p-4 flex items-center justify-center">
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

        {/* Status Card */}
        <Card className={cn(
          "border-2 shadow-xl",
          statusInfo.color === 'purple' && "border-purple-200 dark:border-purple-500/30 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20",
          statusInfo.color === 'green' && "border-green-200 dark:border-green-500/30 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
          statusInfo.color === 'blue' && "border-blue-200 dark:border-blue-500/30 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20"
        )}>
          <CardContent className="p-8 text-center">
            {/* Status Icon */}
            <div className="mb-6">
              {statusInfo.icon}
            </div>

            {/* Status Text */}
            <h2 className="text-xl font-bold mb-2">
              {statusInfo.title}
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              {statusInfo.subtitle}
            </p>

            {/* Queue Info */}
            {queueData && queueStatus === 'waiting' && (
              <div className="space-y-4">
                {/* Position in Queue */}
                <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-500" />
                    <span className="text-sm font-medium">Your position</span>
                  </div>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-300">
                    #{position} of {queueSize}
                  </Badge>
                </div>

                {/* Estimated Wait Time */}
                {estimatedWait > 0 && (
                  <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Timer className="w-5 h-5 text-orange-500" />
                      <span className="text-sm font-medium">Estimated wait</span>
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-300">
                      ~{Math.ceil(estimatedWait / 60)}m
                    </Badge>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Finding your match...</span>
                    <span>{Math.max(0, 100 - (position / queueSize) * 100).toFixed(0)}%</span>
                  </div>
                  <Progress 
                    value={Math.max(0, 100 - (position / queueSize) * 100)} 
                    className="h-2"
                  />
                </div>
              </div>
            )}

            {/* Matched State */}
            {queueStatus === 'matched' && (
              <div className="space-y-4">
                <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-xl border border-green-200 dark:border-green-500/30">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Heart className="w-5 h-5 text-green-600 animate-pulse" />
                    <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                      Perfect match found!
                    </span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Connecting you to video chat now...
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 dark:border-red-500/30 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <X className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-semibold text-red-700 dark:text-red-300 mb-2">
                Oops! Something went wrong
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                {error}
              </p>
              <Button
                onClick={handleLeaveQueue}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Leave Queue Button */}
        {!error && (
          <Button
            onClick={handleLeaveQueue}
            variant="outline"
            className="w-full h-12 rounded-xl border-2 border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-700"
          >
            <X className="w-5 h-5 mr-2" />
            Leave Queue
          </Button>
        )}

        {/* Fun Tips */}
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-500/30">
          <CardContent className="p-4 text-center">
            <Sparkles className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-1">
              💡 While you wait...
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              Think of a fun question to ask! Good vibes start with great conversations ✨
            </p>
          </CardContent>
        </Card>

        {/* Queue Stats */}
        {queueData && (
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 text-center bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/30">
              <Users className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <p className="text-lg font-bold text-blue-600">{queueSize}</p>
              <p className="text-xs text-blue-600/70">People Online</p>
            </Card>
            
            <Card className="p-3 text-center bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-500/30">
              <Clock className="w-5 h-5 mx-auto mb-1 text-purple-500" />
              <p className="text-lg font-bold text-purple-600">~{Math.ceil((estimatedWait || 30) / 60)}</p>
              <p className="text-xs text-purple-600/70">Minutes Wait</p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
} 