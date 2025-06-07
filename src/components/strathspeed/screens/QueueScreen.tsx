'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Clock, 
  Zap, 
  X, 
  Loader2, 
  UserCheck,
  Search,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QueueStatus } from '@/lib/stores/strathspeed-store';

interface QueueScreenProps {
  position: number;
  status: QueueStatus;
  error: string | null;
  onLeaveQueue: () => void;
}

export function QueueScreen({ 
  position, 
  status, 
  error, 
  onLeaveQueue 
}: QueueScreenProps) {
  const [waitTime, setWaitTime] = useState(0);
  const [animationProgress, setAnimationProgress] = useState(0);

  // Update wait time counter
  useEffect(() => {
    const interval = setInterval(() => {
      setWaitTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Animate progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationProgress(prev => (prev + 1) % 100);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const formatWaitTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'joining':
        return {
          icon: Loader2,
          title: 'Joining Queue...',
          subtitle: 'Setting up your StrathSpeed session',
          color: 'text-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          animate: true,
        };
      case 'waiting':
        return {
          icon: Search,
          title: 'Looking for your match',
          subtitle: `Position ${position} in queue`,
          color: 'text-purple-500',
          bgColor: 'bg-purple-50 dark:bg-purple-900/20',
          animate: true,
        };
      case 'matched':
        return {
          icon: UserCheck,
          title: 'Match found!',
          subtitle: 'Connecting to video chat...',
          color: 'text-green-500',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          animate: true,
        };
      case 'error':
        return {
          icon: AlertCircle,
          title: 'Connection Error',
          subtitle: error || 'Something went wrong',
          color: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          animate: false,
        };
      default:
        return {
          icon: Users,
          title: 'Preparing...',
          subtitle: 'Getting ready',
          color: 'text-gray-500',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          animate: false,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Main Status Card */}
        <Card className={cn("text-center overflow-hidden", config.bgColor)}>
          <CardContent className="p-8">
            {/* Animated Icon */}
            <div className="relative mb-6">
              <div className={cn(
                "w-20 h-20 mx-auto rounded-full flex items-center justify-center",
                "bg-white/50 backdrop-blur-sm shadow-lg",
                config.animate && "animate-pulse"
              )}>
                <Icon className={cn("w-10 h-10", config.color, config.animate && "animate-spin")} />
              </div>
              
              {/* Ripple animation for waiting states */}
              {config.animate && (
                <div className="absolute inset-0 rounded-full border-4 border-current opacity-20 animate-ping" 
                     style={{ borderColor: config.color.replace('text-', '') }} />
              )}
            </div>

            {/* Status Text */}
            <h2 className="text-2xl font-bold mb-2">{config.title}</h2>
            <p className="text-muted-foreground mb-4">{config.subtitle}</p>

            {/* Progress Bar for non-error states */}
            {status !== 'error' && (
              <div className="mb-4">
                <Progress 
                  value={animationProgress} 
                  className="h-2 bg-white/20"
                />
              </div>
            )}

            {/* Wait Time */}
            {status === 'waiting' && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Wait time: {formatWaitTime(waitTime)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Queue Info */}
        {status === 'waiting' && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Queue Status
                </h3>
                <Badge variant="secondary">Live</Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your position:</span>
                  <span className="font-medium">#{position}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated wait:</span>
                  <span className="font-medium">
                    {position <= 1 ? '< 30s' : `~${position * 15}s`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium text-green-600">Active</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips Card */}
        {status === 'waiting' && (
          <Card className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-500" />
                Speed Dating Tips
              </h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>• Be yourself and have fun!</p>
                <p>• Ask engaging questions</p>
                <p>• Listen actively to your match</p>
                <p>• Remember: it's only 90 seconds</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {status === 'error' && (
            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            >
              Try Again
            </Button>
          )}
          
          <Button
            onClick={onLeaveQueue}
            variant="outline"
            className="w-full"
          >
            <X className="w-4 h-4 mr-2" />
            Leave Queue
          </Button>
        </div>

        {/* Safety Reminder */}
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-3">
            <p className="text-xs text-amber-700 dark:text-amber-300 text-center">
              💡 <strong>Tip:</strong> Your video will start automatically when matched. 
              Make sure you're ready!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 