'use client';

import React from 'react';
import { useStrathSpeedRealtimeStore, useQueueState, useSessionState } from '@/lib/stores/strathspeed-realtime-store';
import { useStrathSpeedContext } from './providers/StrathSpeedProvider';

// Import all screens
import { HomeScreen } from './screens/HomeScreen';
import { QueueScreen } from './screens/QueueScreen';
import { VideoScreen } from './screens/VideoScreen';
import { SessionResultScreen } from './screens/SessionResultScreen';
import { NotificationToast } from './ui/NotificationToast';

export function StrathSpeedMobileApp() {
  const { userId, profile } = useStrathSpeedContext();
  const queueState = useQueueState();
  const sessionState = useSessionState();
  const { showSessionResult, resetSession, setShowSessionResult } = useStrathSpeedRealtimeStore();

  // Determine which screen to show based on current state
  const getCurrentScreen = () => {
    // Show session result if available
    if (showSessionResult && sessionState.currentSession) {
      return (
        <SessionResultScreen 
          session={sessionState.currentSession}
          lastActionResult={sessionState.lastActionResult}
          onContinue={() => {
            setShowSessionResult(false);
            resetSession();
          }}
        />
      );
    }

    // Show video session if active
    if (sessionState.sessionStatus === 'active' && sessionState.matchData) {
      return (
        <VideoScreen 
          matchData={sessionState.matchData}
          sessionTimer={sessionState.sessionTimer}
          icebreaker={sessionState.icebreaker}
          onSessionEnd={() => {
            resetSession();
          }}
        />
      );
    }

    // Show queue screen if waiting or matched
    if (queueState.queueStatus === 'waiting' || queueState.queueStatus === 'matched') {
      return (
        <QueueScreen 
          queueStatus={queueState.queueStatus}
          queueData={queueState.queueData}
          error={queueState.queueError}
        />
      );
    }

    // Default: Show home screen
    return (
      <HomeScreen 
        userId={userId}
        profile={profile}
      />
    );
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
      {getCurrentScreen()}
      <NotificationToast />
    </div>
  );
} 