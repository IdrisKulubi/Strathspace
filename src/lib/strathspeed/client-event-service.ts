'use client';

import Pusher from 'pusher-js';
import { ServerEvents } from './event-service';

export interface StrathSpeedEventHandlers {
  onQueueJoined?: (data: ServerEvents['queue-joined']) => void;
  onQueuePositionUpdate?: (data: ServerEvents['queue-position-update']) => void;
  onMatchFound?: (data: ServerEvents['match-found']) => void;
  onSessionEnded?: (data: ServerEvents['session-ended']) => void;
  onQueueLeft?: (data: ServerEvents['queue-left']) => void;
  onActionResult?: (data: any) => void;
  onMatchConfirmed?: (data: any) => void;
  onError?: (data: ServerEvents['error']) => void;
}

export class StrathSpeedClientEventService {
  private pusher: Pusher | null = null;
  private channel: any = null;
  private userId: string | null = null;
  private handlers: StrathSpeedEventHandlers = {};
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializePusher();
  }

  /**
   * Initialize Pusher client
   */
  private initializePusher(): void {
    if (typeof window === 'undefined') return;

    try {
      this.pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: '/api/pusher/auth',
        auth: {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      });

      // Handle connection events
      this.pusher.connection.bind('connected', () => {
        console.log('StrathSpeed: Connected to Pusher');
      });

      this.pusher.connection.bind('disconnected', () => {
        console.log('StrathSpeed: Disconnected from Pusher');
      });

      this.pusher.connection.bind('error', (error: any) => {
        console.error('StrathSpeed: Pusher connection error:', error);
      });
    } catch (error) {
      console.error('StrathSpeed: Failed to initialize Pusher:', error);
    }
  }

  /**
   * Connect to user-specific channel for StrathSpeed events
   */
  connect(userId: string, handlers: StrathSpeedEventHandlers): void {
    if (!this.pusher || !userId) return;

    this.userId = userId;
    this.handlers = handlers;

    // Subscribe to user-specific channel
    this.channel = this.pusher.subscribe(`user-${userId}`);

    // Bind to StrathSpeed events
    this.bindEvents();

    // Start heartbeat
    this.startHeartbeat();
  }

  /**
   * Bind to all StrathSpeed events
   */
  private bindEvents(): void {
    if (!this.channel) return;

    // Queue events
    this.channel.bind('strathspeed-queue-joined', (data: ServerEvents['queue-joined']) => {
      console.log('StrathSpeed: Queue joined', data);
      this.handlers.onQueueJoined?.(data);
    });

    this.channel.bind('strathspeed-position-update', (data: ServerEvents['queue-position-update']) => {
      console.log('StrathSpeed: Position update', data);
      this.handlers.onQueuePositionUpdate?.(data);
    });

    this.channel.bind('strathspeed-queue-left', (data: ServerEvents['queue-left']) => {
      console.log('StrathSpeed: Queue left', data);
      this.handlers.onQueueLeft?.(data);
    });

    // Match events
    this.channel.bind('strathspeed-match', (data: ServerEvents['match-found']) => {
      console.log('StrathSpeed: Match found!', data);
      this.handlers.onMatchFound?.(data);
    });

    // Session events
    this.channel.bind('strathspeed-action-result', (data: any) => {
      console.log('StrathSpeed: Action result', data);
      this.handlers.onActionResult?.(data);
    });

    this.channel.bind('strathspeed-match-confirmed', (data: any) => {
      console.log('StrathSpeed: Match confirmed!', data);
      this.handlers.onMatchConfirmed?.(data);
    });

    this.channel.bind('strathspeed-session-ended', (data: ServerEvents['session-ended']) => {
      console.log('StrathSpeed: Session ended', data);
      this.handlers.onSessionEnded?.(data);
    });

    // Error events
    this.channel.bind('strathspeed-error', (data: ServerEvents['error']) => {
      console.error('StrathSpeed: Error received', data);
      this.handlers.onError?.(data);
    });
  }

  /**
   * Start heartbeat to maintain connection
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000); // Every 30 seconds
  }

  /**
   * Send heartbeat to server
   */
  private async sendHeartbeat(): Promise<void> {
    if (!this.userId) return;

    try {
      await fetch('/api/strathspeed/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      console.warn('StrathSpeed: Failed to send heartbeat:', error);
    }
  }

  /**
   * Join the StrathSpeed queue
   */
  async joinQueue(preferences: {
    anonymousMode: boolean;
    ageRange?: [number, number];
    genderPreference?: string;
    interests?: string[];
  }): Promise<any> {
    try {
      const response = await fetch('/api/strathspeed/join-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to join queue');
      }

      return result;
    } catch (error) {
      console.error('StrathSpeed: Failed to join queue:', error);
      throw error;
    }
  }

  /**
   * Leave the StrathSpeed queue
   */
  async leaveQueue(): Promise<any> {
    try {
      const response = await fetch('/api/strathspeed/join-queue', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to leave queue');
      }

      return result;
    } catch (error) {
      console.error('StrathSpeed: Failed to leave queue:', error);
      throw error;
    }
  }

  /**
   * Send session action (vibe, skip, report)
   */
  async sendSessionAction(
    action: 'vibe' | 'skip' | 'report',
    sessionId: string,
    reportReason?: string
  ): Promise<any> {
    try {
      const response = await fetch('/api/strathspeed/session-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          sessionId,
          reportReason,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send action');
      }

      return result;
    } catch (error) {
      console.error('StrathSpeed: Failed to send action:', error);
      throw error;
    }
  }

  /**
   * Get current queue status
   */
  async getQueueStatus(): Promise<any> {
    try {
      const response = await fetch('/api/strathspeed/queue-status');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to get queue status');
      }

      return result;
    } catch (error) {
      console.error('StrathSpeed: Failed to get queue status:', error);
      throw error;
    }
  }

  /**
   * Update event handlers
   */
  updateHandlers(handlers: Partial<StrathSpeedEventHandlers>): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * Disconnect from all channels and cleanup
   */
  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.channel) {
      this.channel.unbind_all();
      this.pusher?.unsubscribe(`user-${this.userId}`);
      this.channel = null;
    }

    if (this.pusher) {
      this.pusher.disconnect();
    }

    this.userId = null;
    this.handlers = {};
  }

  /**
   * Get connection state
   */
  getConnectionState(): string {
    return this.pusher?.connection.state || 'disconnected';
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.getConnectionState() === 'connected';
  }
}

// Export singleton instance
let clientEventService: StrathSpeedClientEventService | null = null;

export const getStrathSpeedClientEventService = (): StrathSpeedClientEventService => {
  if (typeof window === 'undefined') {
    // Return a dummy service for SSR
    return {
      connect: () => {},
      disconnect: () => {},
      joinQueue: async () => ({}),
      leaveQueue: async () => ({}),
      sendSessionAction: async () => ({}),
      getQueueStatus: async () => ({}),
      updateHandlers: () => {},
      getConnectionState: () => 'disconnected',
      isConnected: () => false,
    } as any;
  }

  if (!clientEventService) {
    clientEventService = new StrathSpeedClientEventService();
  }

  return clientEventService;
};

export default getStrathSpeedClientEventService; 