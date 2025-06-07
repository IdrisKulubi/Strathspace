'use client';

import { useEffect, useState } from 'react';
import { VideoRoom } from '../video/VideoRoom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2, Video, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MatchData } from '@/lib/stores/strathspeed-store';

interface VideoSessionProps {
  matchData: MatchData;
  onSessionEnd: () => void;
}

export function VideoSession({ matchData, onSessionEnd }: VideoSessionProps) {
  const [hasPermissions, setHasPermissions] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);

  // Check camera and microphone permissions
  useEffect(() => {
    checkMediaPermissions();
  }, []);

  const checkMediaPermissions = async () => {
    try {
      setIsCheckingPermissions(true);
      setPermissionError(null);

      // Request media permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Stop the stream immediately since we just needed permissions
      stream.getTracks().forEach(track => track.stop());
      
      setHasPermissions(true);
    } catch (error) {
      console.error('Media permission error:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setPermissionError('Camera and microphone access denied. Please allow access and try again.');
        } else if (error.name === 'NotFoundError') {
          setPermissionError('Camera or microphone not found. Please check your devices.');
        } else if (error.name === 'NotReadableError') {
          setPermissionError('Camera or microphone is being used by another application.');
        } else {
          setPermissionError('Unable to access camera and microphone. Please check your settings.');
        }
      } else {
        setPermissionError('Unknown error accessing media devices.');
      }
    } finally {
      setIsCheckingPermissions(false);
    }
  };

  // Show loading state while checking permissions
  if (isCheckingPermissions) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-purple-500" />
            <h3 className="font-semibold mb-2">Setting up video call...</h3>
            <p className="text-sm text-muted-foreground">
              Checking camera and microphone permissions
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show permission error
  if (permissionError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                {permissionError}
              </AlertDescription>
            </Alert>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <VideoOff className="w-8 h-8 text-red-500" />
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Camera Access Required</h3>
                <p className="text-sm text-muted-foreground">
                  StrathSpeed needs access to your camera and microphone for video dating.
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={checkMediaPermissions}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Grant Access
                </Button>
                
                <Button
                  onClick={onSessionEnd}
                  variant="outline"
                  className="w-full"
                >
                  Return to Queue
                </Button>
              </div>

              {/* Instructions */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-left">
                <p className="text-xs text-muted-foreground">
                  <strong>How to enable:</strong><br />
                  1. Click "Grant Access" above<br />
                  2. Allow camera and microphone in your browser<br />
                  3. Refresh if needed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show video room when permissions are granted
  if (hasPermissions) {
    return (
      <div className="min-h-screen bg-black">
        <VideoRoom
          roomUrl={matchData.roomUrl}
          token={matchData.token}
          onSessionEnd={onSessionEnd}
          className="h-screen"
        />
      </div>
    );
  }

  // Fallback loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center text-white">
        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
        <p>Preparing video session...</p>
      </div>
    </div>
  );
} 