'use client';

import { Button } from '@/components/ui/button';
import { useVideoState, useStrathSpeedActions } from '@/lib/stores/strathspeed-store';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function VideoControls() {
  const videoState = useVideoState();
  const { toggleVideo, toggleAudio } = useStrathSpeedActions();

  return (
    <div className="flex items-center gap-3">
      {/* Audio Toggle */}
      <Button
        size="lg"
        variant="outline"
        className={cn(
          "w-12 h-12 rounded-full p-0 border-white/20 transition-all duration-200",
          videoState.isAudioOn
            ? "bg-white/10 text-white hover:bg-white/20"
            : "bg-red-500/80 text-white hover:bg-red-500 border-red-500/50"
        )}
        onClick={toggleAudio}
      >
        {videoState.isAudioOn ? (
          <Mic className="w-5 h-5" />
        ) : (
          <MicOff className="w-5 h-5" />
        )}
      </Button>

      {/* Video Toggle */}
      <Button
        size="lg"
        variant="outline"
        className={cn(
          "w-12 h-12 rounded-full p-0 border-white/20 transition-all duration-200",
          videoState.isVideoOn
            ? "bg-white/10 text-white hover:bg-white/20"
            : "bg-red-500/80 text-white hover:bg-red-500 border-red-500/50"
        )}
        onClick={toggleVideo}
      >
        {videoState.isVideoOn ? (
          <Video className="w-5 h-5" />
        ) : (
          <VideoOff className="w-5 h-5" />
        )}
      </Button>
    </div>
  );
} 