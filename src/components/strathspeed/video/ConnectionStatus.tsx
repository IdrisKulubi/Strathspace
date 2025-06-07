'use client';

import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Signal, SignalHigh, SignalLow, SignalMedium } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  quality: 'excellent' | 'good' | 'fair' | 'poor' | null;
  className?: string;
}

export function ConnectionStatus({ quality, className }: ConnectionStatusProps) {
  if (!quality) {
    return (
      <Badge variant="secondary" className={cn("bg-black/30 text-white border-white/20", className)}>
        <WifiOff className="w-3 h-3 mr-1" />
        Connecting...
      </Badge>
    );
  }

  const getQualityConfig = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return {
          icon: Signal,
          text: 'Excellent',
          color: 'bg-green-500/20 text-green-300 border-green-500/30',
        };
      case 'good':
        return {
          icon: SignalHigh,
          text: 'Good',
          color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        };
      case 'fair':
        return {
          icon: SignalMedium,
          text: 'Fair',
          color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        };
      case 'poor':
        return {
          icon: SignalLow,
          text: 'Poor',
          color: 'bg-red-500/20 text-red-300 border-red-500/30',
        };
      default:
        return {
          icon: WifiOff,
          text: 'Unknown',
          color: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
        };
    }
  };

  const config = getQualityConfig(quality);
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("text-xs", config.color, className)}>
      <Icon className="w-3 h-3 mr-1" />
      {config.text}
    </Badge>
  );
} 