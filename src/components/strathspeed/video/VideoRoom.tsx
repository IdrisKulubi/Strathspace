'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { DailyCall, DailyEventObject } from '@daily-co/daily-js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VideoControls } from './VideoControls';
import { ConnectionStatus } from './ConnectionStatus';
import { IcebreakerCard } from './IcebreakerCard';
import { SessionTimer } from './SessionTimer';
import { useStrathSpeedStore, useVideoState, useSessionState } from '@/lib/stores/strathspeed-store';
import DailyVideoService from '@/lib/video/daily-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, UserX, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoRoomProps {
  roomUrl: string;
  token: string;
  onSessionEnd: () => void;
  className?: string;
}

export function VideoRoom({ roomUrl, token, onSessionEnd, className }: VideoRoomProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callRef = useRef<DailyCall | null>(null);
  
  const [isConnecting, setIsConnecting] = useState(true);
  const [remoteParticipant, setRemoteParticipant] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const videoState = useVideoState();
  const sessionState = useSessionState();
  const { updateVideoState, sendSessionAction } = useStrathSpeedStore();

  // Initialize and join Daily room
  useEffect(() => {
    let mounted = true;

    const initializeVideo = async () => {
      try {
        // Initialize Daily call
        const call = DailyVideoService.initializeCall();
        callRef.current = call;

        // Set up event listeners
        call.on('joined-meeting', handleJoinedMeeting);
        call.on('participant-joined', handleParticipantJoined);
        call.on('participant-left', handleParticipantLeft);
        call.on('participant-updated', handleParticipantUpdated);
        call.on('error', handleError);
        call.on('left-meeting', handleLeftMeeting);
        call.on('network-quality-change', handleNetworkQualityChange);

        // Join the room
        await DailyVideoService.joinRoom(roomUrl, token);

        if (mounted) {
          setIsConnecting(false);
          updateVideoState({ isConnected: true });
        }
      } catch (err) {
        console.error('Failed to initialize video:', err);
        if (mounted) {
          setError('Failed to connect to video call');
          setIsConnecting(false);
        }
      }
    };

    initializeVideo();

    // Cleanup
    return () => {
      mounted = false;
      if (callRef.current) {
        callRef.current.off('joined-meeting', handleJoinedMeeting);
        callRef.current.off('participant-joined', handleParticipantJoined);
        callRef.current.off('participant-left', handleParticipantLeft);
        callRef.current.off('participant-updated', handleParticipantUpdated);
        callRef.current.off('error', handleError);
        callRef.current.off('left-meeting', handleLeftMeeting);
        callRef.current.off('network-quality-change', handleNetworkQualityChange);
        
        DailyVideoService.leaveRoom();
        DailyVideoService.destroy();
      }
    };
  }, [roomUrl, token, updateVideoState]);

  // Event handlers
  const handleJoinedMeeting = useCallback((event: DailyEventObject) => {
    console.log('Joined meeting:', event);
    
    // Set up local video
    if (localVideoRef.current && event.participants?.local) {
      const localParticipant = event.participants.local;
      if (localParticipant.videoTrack) {
        localVideoRef.current.srcObject = new MediaStream([localParticipant.videoTrack]);
      }
    }
  }, []);

  const handleParticipantJoined = useCallback((event: DailyEventObject) => {
    console.log('Participant joined:', event);
    
    const participant = event.participant;
    if (participant && !participant.local) {
      setRemoteParticipant(participant);
      updateVideoState({ participantCount: 2 });
      
      // Set up remote video
      if (remoteVideoRef.current && participant.videoTrack) {
        remoteVideoRef.current.srcObject = new MediaStream([participant.videoTrack]);
      }
    }
  }, [updateVideoState]);

  const handleParticipantLeft = useCallback((event: DailyEventObject) => {
    console.log('Participant left:', event);
    
    const participant = event.participant;
    if (participant && !participant.local) {
      setRemoteParticipant(null);
      updateVideoState({ participantCount: 1 });
      
      // Clear remote video
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    }
  }, [updateVideoState]);

  const handleParticipantUpdated = useCallback((event: DailyEventObject) => {
    const participant = event.participant;
    if (!participant) return;

    if (participant.local) {
      // Update local video
      updateVideoState({
        isVideoOn: participant.video !== false,
        isAudioOn: participant.audio !== false,
      });
      
      if (localVideoRef.current && participant.videoTrack) {
        localVideoRef.current.srcObject = new MediaStream([participant.videoTrack]);
      } else if (localVideoRef.current && !participant.videoTrack) {
        localVideoRef.current.srcObject = null;
      }
    } else {
      // Update remote video
      setRemoteParticipant(participant);
      
      if (remoteVideoRef.current && participant.videoTrack) {
        remoteVideoRef.current.srcObject = new MediaStream([participant.videoTrack]);
      } else if (remoteVideoRef.current && !participant.videoTrack) {
        remoteVideoRef.current.srcObject = null;
      }
    }
  }, [updateVideoState]);

  const handleError = useCallback((event: DailyEventObject) => {
    console.error('Daily error:', event);
    setError('Video connection error occurred');
  }, []);

  const handleLeftMeeting = useCallback(() => {
    console.log('Left meeting');
    updateVideoState({ isConnected: false, participantCount: 0 });
    onSessionEnd();
  }, [updateVideoState, onSessionEnd]);

  const handleNetworkQualityChange = useCallback((event: DailyEventObject) => {
    const quality = event.threshold;
    let qualityLevel: 'excellent' | 'good' | 'fair' | 'poor';
    
    if (quality >= 0.8) qualityLevel = 'excellent';
    else if (quality >= 0.6) qualityLevel = 'good';
    else if (quality >= 0.3) qualityLevel = 'fair';
    else qualityLevel = 'poor';
    
    updateVideoState({ connectionQuality: qualityLevel });
  }, [updateVideoState]);

  // Action handlers
  const handleVibe = () => sendSessionAction('vibe');
  const handleSkip = () => sendSessionAction('skip');
  const handleReport = () => sendSessionAction('report', 'inappropriate_content');

  if (error) {
    return (
      <Card className={cn("p-6 text-center", className)}>
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
        <h3 className="font-semibold mb-2">Connection Error</h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={onSessionEnd} variant="outline">
          Return to Queue
        </Button>
      </Card>
    );
  }

  if (isConnecting) {
    return (
      <Card className={cn("p-8 text-center", className)}>
        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
        <h3 className="font-semibold mb-2">Connecting to video call...</h3>
        <p className="text-sm text-muted-foreground">
          Setting up your StrathSpeed session
        </p>
      </Card>
    );
  }

  return (
    <div className={cn("relative w-full h-full bg-black rounded-lg overflow-hidden", className)}>
      {/* Video Container - Mobile Optimized */}
      <div className="relative w-full h-full">
        {/* Remote Video (Full Screen) */}
        <div className="absolute inset-0">
          {remoteParticipant?.videoTrack ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={false}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <div className="text-center">
                <Avatar className="w-24 h-24 mx-auto mb-4 border-2 border-white/20">
                  <AvatarImage 
                    src={sessionState.matchData?.matchedUser.profilePhoto} 
                    alt={sessionState.matchData?.matchedUser.name || 'User'} 
                  />
                  <AvatarFallback className="bg-white/10 text-white text-2xl">
                    {sessionState.matchData?.matchedUser.name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <p className="text-white/80 text-sm">
                  {remoteParticipant ? 'Camera is off' : 'Waiting for connection...'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute top-4 right-4 w-24 h-32 bg-black/50 rounded-lg overflow-hidden border border-white/20">
          {videoState.isVideoOn ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]" // Mirror local video
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-white/10 text-white text-xs">
                  You
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>

        {/* Top Overlay - Session Info */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-black/30 text-white border-white/20">
                StrathSpeed
              </Badge>
              <SessionTimer />
            </div>
            <ConnectionStatus quality={videoState.connectionQuality} />
          </div>
        </div>

        {/* Icebreaker Card */}
        {sessionState.icebreaker && (
          <div className="absolute bottom-32 left-4 right-4">
            <IcebreakerCard 
              prompt={sessionState.icebreaker} 
              onDismiss={() => useStrathSpeedStore.getState().setShowIcebreaker(false)}
            />
          </div>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
          <div className="flex justify-center items-center gap-4 mb-4">
            <VideoControls />
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-center items-center gap-6">
            <Button
              size="lg"
              variant="destructive"
              className="w-14 h-14 rounded-full p-0 bg-red-500 hover:bg-red-600"
              onClick={handleSkip}
            >
              <UserX className="w-6 h-6" />
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              className="w-12 h-12 rounded-full p-0 border-white/20 text-white hover:bg-white/10"
              onClick={handleReport}
            >
              <AlertTriangle className="w-5 h-5" />
            </Button>
            
            <Button
              size="lg"
              className="w-14 h-14 rounded-full p-0 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600"
              onClick={handleVibe}
            >
              <Heart className="w-6 h-6 fill-current" />
            </Button>
          </div>
          
          {/* Action Labels */}
          <div className="flex justify-center items-center gap-6 mt-2">
            <span className="text-xs text-white/60 w-14 text-center">Skip</span>
            <span className="text-xs text-white/60 w-12 text-center">Report</span>
            <span className="text-xs text-white/60 w-14 text-center">Vibe</span>
          </div>
        </div>
      </div>
    </div>
  );
} 