'use client';

import { useEffect, useState, useCallback } from 'react';
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
  const profile = useStrathSpeedStore((state) => state.profile);
  const showSessionResult = useStrathSpeedStore((state) => state.showSessionResult);
  const storeLoading = useStrathSpeedStore((state) => state.isLoading);
  const storeError = useStrathSpeedStore((state) => state.error);

  // Initialize the app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (initialProfile) {
          // User has an existing speed dating profile
          const { setProfile } = useStrathSpeedStore.getState();
          setProfile(initialProfile);
        } else {
          // Create a default profile from user data
          const defaultProfile = {
            id: `temp-${userId}`, // Temporary ID
            userId,
            isActive: true,
            anonymousMode: false,
            preferences: {
              ageRange: [18, 25] as [number, number],
              genderPreference: 'any',
              interests: [],
            },
            totalSessions: 0,
            speedPoints: 0,
            vibesReceived: 0,
            vibesSent: 0,
            currentStreak: 0,
            longestStreak: 0,
            badges: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          } as const;
          
          const { setProfile } = useStrathSpeedStore.getState();
          setProfile(defaultProfile as any);
        }
        
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize StrathSpeed:', err);
        setError('Failed to initialize the application');
      }
    };

    initializeApp();
  }, [initialProfile, userId]);

  // Handle store errors
  useEffect(() => {
    if (storeError) {
      setError(storeError);
    }
  }, [storeError]);

  const handleTryAgain = useCallback(() => {
    setError(null);
    const { reset } = useStrathSpeedStore.getState();
    reset();
    window.location.reload();
  }, []);

  const handleSessionResultContinue = useCallback(() => {
    const { setShowSessionResult, resetSession } = useStrathSpeedStore.getState();
    setShowSessionResult(false);
    resetSession();
  }, []);

  const handleVideoSessionEnd = useCallback(() => {
    const { resetSession } = useStrathSpeedStore.getState();
    resetSession();
  }, []);

  const handleStartMatching = useCallback(() => {
    const { joinQueue } = useStrathSpeedStore.getState();
    joinQueue();
  }, []);

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
              onClick={handleTryAgain}
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
          onContinue={handleSessionResultContinue}
        />
      );
    }

    // Show video session if active
    if (sessionState.status === 'active' && sessionState.matchData) {
      return (
        <VideoSession 
          matchData={sessionState.matchData}
          onSessionEnd={handleVideoSessionEnd}
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
        onStartMatching={handleStartMatching}
      />
    );
  };

  return (
    <div className="min-h-screen w-full">
      {getCurrentScreen()}
    </div>
  );
} 