'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useStrathSpeedRealtimeStore } from '@/lib/stores/strathspeed-realtime-store';
import type { SpeedDatingProfile } from '@/db/schema';
import { LoadingScreen } from '../ui/LoadingScreen';
import { ErrorScreen } from '../ui/ErrorScreen';

interface StrathSpeedContextType {
  userId: string;
  profile: SpeedDatingProfile | null;
  isLoading: boolean;
  error: string | null;
  refetchProfile: () => Promise<void>;
}

const StrathSpeedContext = createContext<StrathSpeedContextType | undefined>(undefined);

export function useStrathSpeedContext() {
  const context = useContext(StrathSpeedContext);
  if (context === undefined) {
    throw new Error('useStrathSpeedContext must be used within a StrathSpeedProvider');
  }
  return context;
}

interface StrathSpeedProviderProps {
  userId: string;
  children: React.ReactNode;
}

export function StrathSpeedProvider({ userId, children }: StrathSpeedProviderProps) {
  const [profile, setProfile] = useState<SpeedDatingProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { initializeRealtime, disconnectRealtime, setProfile: setStoreProfile } = useStrathSpeedRealtimeStore();

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/strathspeed/profile');
      if (!response.ok) {
        if (response.status === 404) {
          // Profile doesn't exist, create default one
          const createResponse = await fetch('/api/strathspeed/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              preferences: {
                ageRange: [18, 25],
                genderPreference: 'any',
                interests: []
              },
              anonymousMode: false
            })
          });
          
          if (!createResponse.ok) {
            throw new Error('Failed to create profile');
          }
          
          const newProfile = await createResponse.json();
          setProfile(newProfile);
          setStoreProfile(newProfile);
          return;
        }
        throw new Error('Failed to fetch profile');
      }

      const profileData = await response.json();
      setProfile(profileData);
      setStoreProfile(profileData);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const refetchProfile = async () => {
    await fetchProfile();
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  useEffect(() => {
    if (profile && !isLoading && !error) {
      // Initialize real-time connection
      initializeRealtime(userId, profile);
    }

    // Cleanup on unmount
    return () => {
      disconnectRealtime();
    };
  }, [profile, userId, initializeRealtime, disconnectRealtime, isLoading, error]);

  if (error) {
    return (
      <ErrorScreen 
        error={error} 
        onRetry={refetchProfile}
        title="Oops! Something went wrong 😅"
        description="We couldn't load your StrathSpeed profile. Let's give it another shot!"
      />
    );
  }

  if (isLoading) {
    return (
      <LoadingScreen 
        title="Getting you ready to connect! ✨"
        subtitle="Setting up your speed dating experience..."
      />
    );
  }

  const contextValue: StrathSpeedContextType = {
    userId,
    profile,
    isLoading,
    error,
    refetchProfile,
  };

  return (
    <StrathSpeedContext.Provider value={contextValue}>
      {children}
    </StrathSpeedContext.Provider>
  );
} 