import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { SpeedSession, IcebreakerPrompt, SpeedDatingProfile } from '../../db/schema';
import { getStrathSpeedClientEventService, type StrathSpeedEventHandlers } from '@/lib/strathspeed/client-event-service';

export type QueueStatus = 'idle' | 'joining' | 'waiting' | 'matched' | 'error';
export type SessionStatus = 'idle' | 'connecting' | 'active' | 'ending' | 'ended';
export type SessionAction = 'vibe' | 'skip' | 'report';

export interface QueueData {
  position: number;
  estimatedWaitTime: number;
  queueSize: number;
}

export interface MatchData {
  roomId: string;
  roomUrl: string;
  token: string;
  icebreaker: IcebreakerPrompt | null;
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

export interface SessionActionResult {
  success: boolean;
  action: SessionAction;
  isMatch?: boolean;
  points?: number;
  message?: string;
}

export interface StrathSpeedRealtimeState {
  // User profile data
  profile: SpeedDatingProfile | null;
  userId: string | null;
  
  // Real-time connection state
  isConnected: boolean;
  connectionError: string | null;
  
  // Queue state
  queueStatus: QueueStatus;
  queueData: QueueData | null;
  queueError: string | null;
  
  // Session state
  currentSession: SpeedSession | null;
  sessionStatus: SessionStatus;
  sessionTimer: number; // seconds remaining
  icebreaker: IcebreakerPrompt | null;
  matchData: MatchData | null;
  lastActionResult: SessionActionResult | null;
  
  // Video state
  video: VideoState;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  showIcebreaker: boolean;
  showSessionResult: boolean;
  notifications: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    timestamp: number;
  }>;
  
  // Actions
  initializeRealtime: (userId: string, profile: SpeedDatingProfile) => void;
  disconnectRealtime: () => void;
  
  // Profile actions
  setProfile: (profile: SpeedDatingProfile | null) => void;
  
  // Queue actions
  setQueueStatus: (status: QueueStatus) => void;
  setQueueData: (data: QueueData | null) => void;
  setQueueError: (error: string | null) => void;
  joinQueue: (preferences: {
    anonymousMode: boolean;
    ageRange?: [number, number];
    genderPreference?: string;
    interests?: string[];
  }) => Promise<void>;
  leaveQueue: () => Promise<void>;
  
  // Session actions
  setSessionStatus: (status: SessionStatus) => void;
  setCurrentSession: (session: SpeedSession | null) => void;
  setMatchData: (data: MatchData | null) => void;
  setIcebreaker: (icebreaker: IcebreakerPrompt | null) => void;
  updateSessionTimer: (seconds: number) => void;
  sendSessionAction: (action: SessionAction, reportReason?: string) => Promise<void>;
  setLastActionResult: (result: SessionActionResult | null) => void;
  
  // Video actions
  updateVideoState: (state: Partial<VideoState>) => void;
  toggleVideo: () => Promise<void>;
  toggleAudio: () => Promise<void>;
  
  // UI actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setShowIcebreaker: (show: boolean) => void;
  setShowSessionResult: (show: boolean) => void;
  addNotification: (notification: { type: string; message: string }) => void;
  clearNotifications: () => void;
  
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

export const useStrathSpeedRealtimeStore = create<StrathSpeedRealtimeState>()(
  subscribeWithSelector((set, get) => {
    let eventService: ReturnType<typeof getStrathSpeedClientEventService> | null = null;
    let sessionTimerInterval: NodeJS.Timeout | null = null;

    // Event handlers for real-time events
    const eventHandlers: StrathSpeedEventHandlers = {
      onQueueJoined: (data) => {
        set({
          queueStatus: 'waiting',
          queueData: {
            position: data.position,
            estimatedWaitTime: data.estimatedWaitTime,
            queueSize: data.queueSize,
          },
          queueError: null,
          isLoading: false,
        });
        
        get().addNotification({
          type: 'success',
          message: `Joined queue at position ${data.position}`,
        });
      },

      onQueuePositionUpdate: (data) => {
        set({
          queueData: {
            position: data.position,
            estimatedWaitTime: data.estimatedWaitTime,
            queueSize: data.queueSize,
          },
        });
      },

      onMatchFound: (data) => {
        const matchData: MatchData = {
          roomId: data.sessionId, // Using sessionId as roomId for now
          roomUrl: data.roomUrl,
          token: data.token,
          icebreaker: data.icebreaker,
          matchedUser: data.matchedUser,
          sessionId: data.sessionId,
          isAnonymous: data.isAnonymous,
        };

        set({
          queueStatus: 'matched',
          sessionStatus: 'connecting',
          matchData,
          icebreaker: data.icebreaker,
          sessionTimer: 90, // Reset timer
          showIcebreaker: true,
          showSessionResult: false,
        });

        get().addNotification({
          type: 'success',
          message: '🎉 Match found! Connecting to video chat...',
        });

        // Start session timer
        get().startSessionTimer();
      },

      onSessionEnded: (data) => {
        set({
          sessionStatus: 'ended',
          showSessionResult: true,
        });

        get().stopSessionTimer();
        
        get().addNotification({
          type: 'info',
          message: 'Session ended',
        });
      },

      onQueueLeft: (data) => {
        set({
          queueStatus: 'idle',
          queueData: null,
          queueError: null,
        });

        if (data.reason === 'timeout') {
          get().addNotification({
            type: 'warning',
            message: 'Removed from queue due to inactivity',
          });
        }
      },

      onActionResult: (data) => {
        set({
          lastActionResult: data,
          showSessionResult: true,
        });

        if (data.isMatch) {
          get().addNotification({
            type: 'success',
            message: '🎉 It\'s a match! You both vibed!',
          });
        }
      },

      onMatchConfirmed: (data) => {
        get().addNotification({
          type: 'success',
          message: '🎉 It\'s a match! You both vibed!',
        });
      },

      onError: (data) => {
        set({
          error: data.message,
          isLoading: false,
        });

        get().addNotification({
          type: 'error',
          message: data.message,
        });
      },
    };

    return {
      // Initial state
      profile: null,
      userId: null,
      isConnected: false,
      connectionError: null,
      queueStatus: 'idle',
      queueData: null,
      queueError: null,
      currentSession: null,
      sessionStatus: 'idle',
      sessionTimer: 90,
      icebreaker: null,
      matchData: null,
      lastActionResult: null,
      video: initialVideoState,
      isLoading: false,
      error: null,
      showIcebreaker: true,
      showSessionResult: false,
      notifications: [],

      // Real-time connection management
      initializeRealtime: (userId, profile) => {
        if (typeof window === 'undefined') return;

        eventService = getStrathSpeedClientEventService();
        eventService.connect(userId, eventHandlers);

        set({
          userId,
          profile,
          isConnected: eventService.isConnected(),
          connectionError: null,
        });

        // Monitor connection state
        const checkConnection = () => {
          if (eventService) {
            set({ isConnected: eventService.isConnected() });
          }
        };

        const connectionInterval = setInterval(checkConnection, 5000);
        
        // Store cleanup function
        (window as any).__strathspeed_cleanup = () => {
          clearInterval(connectionInterval);
          eventService?.disconnect();
        };
      },

      disconnectRealtime: () => {
        eventService?.disconnect();
        eventService = null;
        
        set({
          isConnected: false,
          userId: null,
        });

        // Call cleanup function if it exists
        if (typeof window !== 'undefined' && (window as any).__strathspeed_cleanup) {
          (window as any).__strathspeed_cleanup();
          delete (window as any).__strathspeed_cleanup;
        }
      },

      // Profile actions
      setProfile: (profile) => set({ profile }),

      // Queue actions
      setQueueStatus: (queueStatus) => set({ queueStatus }),
      setQueueData: (queueData) => set({ queueData }),
      setQueueError: (queueError) => set({ queueError }),

      joinQueue: async (preferences) => {
        const { profile, userId } = get();
        if (!profile || !userId) {
          set({ queueError: 'Profile not loaded' });
          return;
        }

        set({ 
          queueStatus: 'joining', 
          queueError: null, 
          isLoading: true 
        });

        try {
          if (!eventService) {
            throw new Error('Real-time service not initialized');
          }

          await eventService.joinQueue(preferences);
          
          // The response will come via WebSocket events
          // so we don't set state here directly
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
          if (eventService) {
            await eventService.leaveQueue();
          }
          
          // The response will come via WebSocket events
        } catch (error) {
          console.error('Error leaving queue:', error);
          // Reset anyway since user wants to leave
          set({ 
            queueStatus: 'idle', 
            queueData: null,
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
      setLastActionResult: (lastActionResult) => set({ lastActionResult }),

      sendSessionAction: async (action, reportReason) => {
        const { matchData } = get();
        if (!matchData) return;

        set({ isLoading: true });

        try {
          if (!eventService) {
            throw new Error('Real-time service not initialized');
          }

          await eventService.sendSessionAction(action, matchData.sessionId, reportReason);
          
          // The response will come via WebSocket events
          set({ isLoading: false });
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
        const { video } = get();
        set({ video: { ...video, isVideoOn: !video.isVideoOn } });
      },

      toggleAudio: async () => {
        const { video } = get();
        set({ video: { ...video, isAudioOn: !video.isAudioOn } });
      },

      // UI actions
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setShowIcebreaker: (showIcebreaker) => set({ showIcebreaker }),
      setShowSessionResult: (showSessionResult) => set({ showSessionResult }),

      addNotification: (notification) => {
        const id = Date.now().toString();
        set((state) => ({
          notifications: [
            ...state.notifications,
            {
              ...notification,
              id,
              timestamp: Date.now(),
            } as any,
          ].slice(-5), // Keep only last 5 notifications
        }));

        // Auto-remove notification after 5 seconds
        setTimeout(() => {
          set((state) => ({
            notifications: state.notifications.filter(n => n.id !== id),
          }));
        }, 5000);
      },

      clearNotifications: () => set({ notifications: [] }),

      // Helper functions for session timer
      startSessionTimer: () => {
        get().stopSessionTimer(); // Clear any existing timer
        
        sessionTimerInterval = setInterval(() => {
          set((state) => {
            const newTimer = state.sessionTimer - 1;
            
            if (newTimer <= 0) {
              // Time's up!
              get().stopSessionTimer();
              get().addNotification({
                type: 'warning',
                message: 'Session time expired',
              });
              
              return {
                ...state,
                sessionTimer: 0,
                sessionStatus: 'ended',
                showSessionResult: true,
              };
            }
            
            return { ...state, sessionTimer: newTimer };
          });
        }, 1000);
      },

      stopSessionTimer: () => {
        if (sessionTimerInterval) {
          clearInterval(sessionTimerInterval);
          sessionTimerInterval = null;
        }
      },

      // Reset functions
      resetSession: () => {
        get().stopSessionTimer();
        
        set({
          currentSession: null,
          sessionStatus: 'idle',
          sessionTimer: 90,
          icebreaker: null,
          matchData: null,
          lastActionResult: null,
          video: initialVideoState,
          showIcebreaker: true,
          showSessionResult: false,
        });
      },

      resetQueue: () => set({
        queueStatus: 'idle',
        queueData: null,
        queueError: null,
      }),

      reset: () => {
        get().stopSessionTimer();
        get().disconnectRealtime();
        
        set({
          profile: null,
          userId: null,
          isConnected: false,
          connectionError: null,
          queueStatus: 'idle',
          queueData: null,
          queueError: null,
          currentSession: null,
          sessionStatus: 'idle',
          sessionTimer: 90,
          icebreaker: null,
          matchData: null,
          lastActionResult: null,
          video: initialVideoState,
          isLoading: false,
          error: null,
          showIcebreaker: true,
          showSessionResult: false,
          notifications: [],
        });
      },
    };
  })
);

// Selector hooks for optimized re-renders
export const useRealtimeConnection = () => useStrathSpeedRealtimeStore((state) => ({
  isConnected: state.isConnected,
  connectionError: state.connectionError,
  userId: state.userId,
}));

export const useQueueState = () => useStrathSpeedRealtimeStore((state) => ({
  status: state.queueStatus,
  data: state.queueData,
  error: state.queueError,
  isLoading: state.isLoading,
}));

export const useSessionState = () => useStrathSpeedRealtimeStore((state) => ({
  status: state.sessionStatus,
  session: state.currentSession,
  timer: state.sessionTimer,
  icebreaker: state.icebreaker,
  matchData: state.matchData,
  lastActionResult: state.lastActionResult,
  showIcebreaker: state.showIcebreaker,
  showSessionResult: state.showSessionResult,
}));

export const useVideoState = () => useStrathSpeedRealtimeStore((state) => state.video);

export const useNotifications = () => useStrathSpeedRealtimeStore((state) => state.notifications);

export const useStrathSpeedActions = () => useStrathSpeedRealtimeStore((state) => ({
  // Real-time actions
  initializeRealtime: state.initializeRealtime,
  disconnectRealtime: state.disconnectRealtime,
  
  // Queue actions
  joinQueue: state.joinQueue,
  leaveQueue: state.leaveQueue,
  
  // Session actions
  sendSessionAction: state.sendSessionAction,
  
  // Video actions
  toggleVideo: state.toggleVideo,
  toggleAudio: state.toggleAudio,
  
  // UI actions
  setShowIcebreaker: state.setShowIcebreaker,
  setShowSessionResult: state.setShowSessionResult,
  addNotification: state.addNotification,
  clearNotifications: state.clearNotifications,
  
  // Reset actions
  resetSession: state.resetSession,
  resetQueue: state.resetQueue,
  reset: state.reset,
})); 