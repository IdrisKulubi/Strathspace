'use client';

import { useEffect, useState } from 'react';
import { useStrathSpeedStore, useQueueState, useSessionState } from '@/lib/stores/strathspeed-store';
import type { SpeedDatingProfile } from '@/db/schema';

// Import screen components
import { StrathSpeedHome } from './screens/StrathSpeedHome';
import { QueueScreen } from './screens/QueueScreen';
import { SessionResult } from './screens/SessionResult';

// Loading and error components
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { VideoSession } from './screens/VideoSession';

interface StrathSpeedAppProps {
  userId: string;
  userName: string;
  userEmail: string;
  initialProfile: SpeedDatingProfile | null;
}

export function StrathSpeedApp({ 
  userId, 
  userName, 
  userEmail, 
  initialProfile 
}: StrathSpeedAppProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queueState = useQueueState();
  const sessionState = useSessionState();
  const { 
    profile, 
    showSessionResult, 
    setProfile, 
    reset,
    isLoading: storeLoading,
    error: storeError 
  } = useStrathSpeedStore();

  // Initialize the app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Set initial profile if available
        if (initialProfile) {
          setProfile(initialProfile);
        }
        
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize StrathSpeed:', err);
        setError('Failed to initialize the application');
      }
    };

    initializeApp();
  }, [initialProfile, setProfile]);

  // Handle store errors
  useEffect(() => {
    if (storeError) {
      setError(storeError);
    }
  }, [storeError]);

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h3 className="font-semibold mb-2">Something went wrong</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button 
              onClick={() => {
                setError(null);
                reset();
                window.location.reload();
              }}
              variant="outline"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (!isInitialized || storeLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-purple-500" />
            <h3 className="font-semibold mb-2">Loading StrathSpeed...</h3>
            <p className="text-sm text-muted-foreground">
              Setting up your speed dating experience
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine which screen to show based on current state
  const getCurrentScreen = () => {
    // Show session result if available
    if (showSessionResult && sessionState.session) {
      return (
        <SessionResult 
          session={sessionState.session}
          onContinue={() => {
            useStrathSpeedStore.getState().setShowSessionResult(false);
            useStrathSpeedStore.getState().resetSession();
          }}
        />
      );
    }

    // Show video session if active
    if (sessionState.status === 'active' && sessionState.matchData) {
      return (
        <VideoSession 
          matchData={sessionState.matchData}
          onSessionEnd={() => {
            useStrathSpeedStore.getState().resetSession();
          }}
        />
      );
    }

    // Show queue screen if waiting or matched
    if (queueState.status === 'waiting' || queueState.status === 'matched') {
      return (
        <QueueScreen 
          queueStatus={queueState.status}
          queueData={{
            position: queueState.position,
            queueSize: 1,
            estimatedWaitTime: 0
          }}
          error={queueState.error}
        />
      );
    }

    // Default: Show home screen
    return (
      <StrathSpeedHome 
        userId={userId}
        userName={userName}
        profile={profile}
        onStartMatching={() => {
          useStrathSpeedStore.getState().joinQueue();
        }}
      />
    );
  };

  return (
    <div className="min-h-screen w-full">
      {getCurrentScreen()}
    </div>
  );
} 