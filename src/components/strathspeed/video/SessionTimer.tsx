'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStrathSpeedStore } from '@/lib/stores/strathspeed-store';

export function SessionTimer() {
  const { sessionTimer, updateSessionTimer } = useStrathSpeedStore();
  const [isLowTime, setIsLowTime] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      updateSessionTimer(Math.max(0, sessionTimer - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionTimer, updateSessionTimer]);

  useEffect(() => {
    setIsLowTime(sessionTimer <= 30); // Show warning when 30 seconds or less
  }, [sessionTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return (sessionTimer / 90) * 100; // Assuming 90 seconds max
  };

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs font-mono transition-all duration-200",
          isLowTime 
            ? "bg-red-500/20 text-red-300 border-red-500/30 animate-pulse" 
            : "bg-black/30 text-white border-white/20"
        )}
      >
        {isLowTime ? (
          <AlertCircle className="w-3 h-3 mr-1" />
        ) : (
          <Clock className="w-3 h-3 mr-1" />
        )}
        {formatTime(sessionTimer)}
      </Badge>
      
      {/* Progress bar */}
      <div className="w-12 h-1 bg-white/20 rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full transition-all duration-1000 ease-linear",
            isLowTime ? "bg-red-400" : "bg-white"
          )}
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>
    </div>
  );
} 