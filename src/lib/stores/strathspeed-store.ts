import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useMemo } from 'react';
import { IcebreakerPrompt, SpeedDatingProfile, SpeedSession } from '@/db/schema';

export type QueueStatus = 'idle' | 'joining' | 'waiting' | 'matched' | 'error';
export type SessionStatus = 'idle' | 'connecting' | 'active' | 'ending' | 'ended';
export type SessionAction = 'vibe' | 'skip' | 'report';

export interface QueueUser {
  userId: string;
  socketId: string;
  joinedAt: number;
  preferences: {
    anonymousMode: boolean;
    ageRange?: [number, number];
    genderPreference?: string;
  };
}

export interface MatchData {
  roomId: string;
  roomUrl: string;
  token: string;
  icebreaker: IcebreakerPrompt;
  matchedUser: {
    id: string;
    name?: string;
    profilePhoto?: string;
  };
  sessionId: string;
  isAnonymous: boolean;
}

export interface VideoState {
  isVideoOn: boolean;
  isAudioOn: boolean;
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | null;
  participantCount: number;
}

export interface StrathSpeedState {
  // User profile data
  profile: SpeedDatingProfile | null;
  
  // Queue state
  queueStatus: QueueStatus;
  queuePosition: number;
  queueError: string | null;
  
  // Session state
  currentSession: SpeedSession | null;
  sessionStatus: SessionStatus;
  sessionTimer: number; // seconds remaining
  icebreaker: IcebreakerPrompt | null;
  matchData: MatchData | null;
  
  // Video state
  video: VideoState;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  showIcebreaker: boolean;
  showSessionResult: boolean;
  
  // Actions
  setProfile: (profile: SpeedDatingProfile | null) => void;
  
  // Queue actions
  setQueueStatus: (status: QueueStatus) => void;
  setQueuePosition: (position: number) => void;
  setQueueError: (error: string | null) => void;
  joinQueue: () => Promise<void>;
  leaveQueue: () => Promise<void>;
  
  // Session actions
  setSessionStatus: (status: SessionStatus) => void;
  setCurrentSession: (session: SpeedSession | null) => void;
  setMatchData: (data: MatchData | null) => void;
  setIcebreaker: (icebreaker: IcebreakerPrompt | null) => void;
  updateSessionTimer: (seconds: number) => void;
  sendSessionAction: (action: SessionAction, reportReason?: string) => Promise<void>;
  
  // Video actions
  updateVideoState: (state: Partial<VideoState>) => void;
  toggleVideo: () => Promise<void>;
  toggleAudio: () => Promise<void>;
  
  // UI actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setShowIcebreaker: (show: boolean) => void;
  setShowSessionResult: (show: boolean) => void;
  
  // Reset functions
  resetSession: () => void;
  resetQueue: () => void;
  reset: () => void;
}

const initialVideoState: VideoState = {
  isVideoOn: true,
  isAudioOn: true,
  isConnected: false,
  connectionQuality: null,
  participantCount: 0,
};

const initialState = {
  profile: null,
  queueStatus: 'idle' as QueueStatus,
  queuePosition: 0,
  queueError: null,
  currentSession: null,
  sessionStatus: 'idle' as SessionStatus,
  sessionTimer: 90,
  icebreaker: null,
  matchData: null,
  video: initialVideoState,
  isLoading: false,
  error: null,
  showIcebreaker: true,
  showSessionResult: false,
};

export const useStrathSpeedStore = create<StrathSpeedState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    ...initialState,

    // Profile actions
    setProfile: (profile) => set({ profile }),

    // Queue actions
    setQueueStatus: (queueStatus) => set({ queueStatus }),
    setQueuePosition: (queuePosition) => set({ queuePosition }),
    setQueueError: (queueError) => set({ queueError }),
    
    joinQueue: async () => {
      const { profile } = get();
      
      if (!profile) {
        set({ queueError: 'Profile not loaded' });
        return;
      }

      set({ 
        queueStatus: 'joining', 
        queueError: null, 
        isLoading: true 
      });

      try {
        const response = await fetch('/api/strathspeed/join-queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            preferences: {
              anonymousMode: profile.anonymousMode,
              ageRange: profile.preferences?.ageRange,
              genderPreference: profile.preferences?.genderPreference,
            },
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to join queue');
        }

        const data = await response.json();
        set({ 
          queueStatus: 'waiting', 
          queuePosition: data.position || 0,
          isLoading: false 
        });
      } catch (error) {
        set({ 
          queueStatus: 'error', 
          queueError: error instanceof Error ? error.message : 'Unknown error',
          isLoading: false 
        });
      }
    },

    leaveQueue: async () => {
      set({ isLoading: true });

      try {
        await fetch('/api/strathspeed/leave-queue', {
          method: 'POST',
        });

        set({ 
          queueStatus: 'idle', 
          queuePosition: 0, 
          queueError: null,
          isLoading: false 
        });
      } catch (error) {
        console.error('Error leaving queue:', error);
        // Reset anyway since user wants to leave
        set({ 
          queueStatus: 'idle', 
          queuePosition: 0, 
          isLoading: false 
        });
      }
    },

    // Session actions
    setSessionStatus: (sessionStatus) => set({ sessionStatus }),
    setCurrentSession: (currentSession) => set({ currentSession }),
    setMatchData: (matchData) => set({ matchData }),
    setIcebreaker: (icebreaker) => set({ icebreaker }),
    updateSessionTimer: (sessionTimer) => set({ sessionTimer }),

    sendSessionAction: async (action, reportReason) => {
      const { currentSession } = get();
      if (!currentSession) return;

      set({ isLoading: true });

      try {
        const response = await fetch('/api/strathspeed/session-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSession.id,
            action,
            reportReason,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to send action');
        }

        // Show result screen for user feedback
        set({ 
          showSessionResult: true,
          sessionStatus: 'ended',
          isLoading: false 
        });

        // If it's a vibe, we might get match data back
        if (action === 'vibe') {
          const result = await response.json();
          if (result.isMatch) {
            // Handle mutual match scenario
            console.log('Mutual match created!');
          }
        }
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Unknown error',
          isLoading: false 
        });
      }
    },

    // Video actions
    updateVideoState: (state) => 
      set((prev) => ({ video: { ...prev.video, ...state } })),

    toggleVideo: async () => {
      // This will be implemented when we integrate with Daily.co
      const { video } = get();
      set({ video: { ...video, isVideoOn: !video.isVideoOn } });
    },

    toggleAudio: async () => {
      // This will be implemented when we integrate with Daily.co
      const { video } = get();
      set({ video: { ...video, isAudioOn: !video.isAudioOn } });
    },

    // UI actions
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    setShowIcebreaker: (showIcebreaker) => set({ showIcebreaker }),
    setShowSessionResult: (showSessionResult) => set({ showSessionResult }),

    // Reset functions
    resetSession: () => set({
      currentSession: null,
      sessionStatus: 'idle',
      sessionTimer: 90,
      icebreaker: null,
      matchData: null,
      video: initialVideoState,
      showIcebreaker: true,
      showSessionResult: false,
    }),

    resetQueue: () => set({
      queueStatus: 'idle',
      queuePosition: 0,
      queueError: null,
    }),

    reset: () => set({
      ...initialState,
    }),
  }))
);

// Fixed hooks to prevent infinite render loops by avoiding object creation
export const useQueueStatus = () => useStrathSpeedStore((state) => state.queueStatus);
export const useQueuePosition = () => useStrathSpeedStore((state) => state.queuePosition);
export const useQueueError = () => useStrathSpeedStore((state) => state.queueError);
export const useIsLoading = () => useStrathSpeedStore((state) => state.isLoading);

export const useQueueState = () => {
  const status = useQueueStatus();
  const position = useQueuePosition();
  const error = useQueueError();
  const isLoading = useIsLoading();
  return useMemo(() => ({ status, position, error, isLoading }), [status, position, error, isLoading]);
};

export const useCurrentSession = () => useStrathSpeedStore((state) => state.currentSession);
export const useSessionStatus = () => useStrathSpeedStore((state) => state.sessionStatus);
export const useSessionTimer = () => useStrathSpeedStore((state) => state.sessionTimer);
export const useIcebreaker = () => useStrathSpeedStore((state) => state.icebreaker);
export const useMatchData = () => useStrathSpeedStore((state) => state.matchData);

export const useSessionState = () => {
  const session = useCurrentSession();
  const status = useSessionStatus();
  const timer = useSessionTimer();
  const icebreaker = useIcebreaker();
  const matchData = useMatchData();
  return useMemo(() => ({ session, status, timer, icebreaker, matchData }), [session, status, timer, icebreaker, matchData]);
};

export const useVideoState = () => useStrathSpeedStore((state) => state.video);

export const useStrathSpeedActions = () => {
  const joinQueue = useStrathSpeedStore((state) => state.joinQueue);
  const leaveQueue = useStrathSpeedStore((state) => state.leaveQueue);
  const sendSessionAction = useStrathSpeedStore((state) => state.sendSessionAction);
  const toggleVideo = useStrathSpeedStore((state) => state.toggleVideo);
  const toggleAudio = useStrathSpeedStore((state) => state.toggleAudio);
  const resetSession = useStrathSpeedStore((state) => state.resetSession);
  const reset = useStrathSpeedStore((state) => state.reset);
  
  return useMemo(() => ({
    joinQueue,
    leaveQueue,
    sendSessionAction,
    toggleVideo,
    toggleAudio,
    resetSession,
    reset,
  }), [joinQueue, leaveQueue, sendSessionAction, toggleVideo, toggleAudio, resetSession, reset]);
}; 