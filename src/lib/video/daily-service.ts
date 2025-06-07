import Daily, { DailyCall, DailyEvent, DailyEventObject } from '@daily-co/daily-js';

export interface DailyRoom {
  id: string;
  name: string;
  url: string;
  created_at: string;
  expires: number;
  config: {
    max_participants: number;
    enable_chat: boolean;
    enable_recording: boolean;
    properties: {
      room_type: 'video' | 'audio';
      enable_knocking: boolean;
      enable_prejoin_ui: boolean;
      enable_network_ui: boolean;
      start_video_off: boolean;
      start_audio_off: boolean;
      owner_only_broadcast: boolean;
    };
  };
}

export interface DailyToken {
  token: string;
  room_name: string;
  expires_at: number;
  user_id: string;
  user_name?: string;
  is_owner: boolean;
}

export interface ConnectionQuality {
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  videoSendPacketLoss: number;
  videoRecvPacketLoss: number;
  audioSendPacketLoss: number;
  audioRecvPacketLoss: number;
}

/**
 * Client-side Daily.js service for handling video calls
 * Server-side API calls are handled by server actions in strathspeed.actions.ts
 */
export class DailyVideoService {
  private static instance: DailyVideoService;
  private call: DailyCall | null = null;

  private constructor() {
    // No server-side initialization needed - this is now client-only
  }

  public static getInstance(): DailyVideoService {
    if (!DailyVideoService.instance) {
      DailyVideoService.instance = new DailyVideoService();
    }
    return DailyVideoService.instance;
  }

  /**
   * Initialize Daily call instance for client-side usage
   */
  initializeCall(): DailyCall {
    if (this.call) {
      return this.call;
    }

    this.call = Daily.createCallObject({
      audioSource: true,
      videoSource: true,
    });

    return this.call;
  }

  /**
   * Join a Daily room with URL and token
   */
  async joinRoom(roomUrl: string, token: string): Promise<void> {
    if (!this.call) {
      throw new Error('Call not initialized. Call initializeCall() first.');
    }

    try {
      await this.call.join({
        url: roomUrl,
        token: token,
      });
    } catch (error) {
      console.error('Failed to join Daily room:', error);
      throw error;
    }
  }

  /**
   * Leave the current Daily room
   */
  async leaveRoom(): Promise<void> {
    if (this.call) {
      try {
        await this.call.leave();
      } catch (error) {
        console.error('Failed to leave Daily room:', error);
      }
    }
  }

  /**
   * Get connection quality metrics
   */
  async getConnectionQuality(): Promise<ConnectionQuality | null> {
    if (!this.call) return null;

    try {
      // For now, return a basic quality assessment
      // Daily.js network stats API requires more complex handling
      const participants = this.call.participants();
      const participantCount = Object.keys(participants).length;
      
      // Simple quality assessment based on participant count and connection state
      let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
      
      if (participantCount > 2) quality = 'good';
      if (!this.call.meetingState() || this.call.meetingState() === 'left-meeting') {
        quality = 'poor';
      }

      return {
        quality,
        videoSendPacketLoss: 0,
        videoRecvPacketLoss: 0,
        audioSendPacketLoss: 0,
        audioRecvPacketLoss: 0,
      };
    } catch (error) {
      console.error('Failed to get connection quality:', error);
      return null;
    }
  }

  /**
   * Toggle local video on/off
   */
  async toggleVideo(): Promise<boolean> {
    if (!this.call) return false;

    try {
      const localParticipant = this.call.participants().local;
      const newVideoState = !localParticipant.video;
      await this.call.setLocalVideo(newVideoState);
      return newVideoState;
    } catch (error) {
      console.error('Failed to toggle video:', error);
      return false;
    }
  }

  /**
   * Toggle local audio on/off
   */
  async toggleAudio(): Promise<boolean> {
    if (!this.call) return false;

    try {
      const localParticipant = this.call.participants().local;
      const newAudioState = !localParticipant.audio;
      await this.call.setLocalAudio(newAudioState);
      return newAudioState;
    } catch (error) {
      console.error('Failed to toggle audio:', error);
      return false;
    }
  }

  /**
   * Add event listener
   */
  on(event: DailyEvent, handler: (event?: DailyEventObject) => void): void {
    if (this.call) {
      this.call.on(event, handler);
    }
  }

  /**
   * Remove event listener
   */
  off(event: DailyEvent, handler: (event?: DailyEventObject) => void): void {
    if (this.call) {
      this.call.off(event, handler);
    }
  }

  /**
   * Destroy the Daily call instance
   */
  destroy(): void {
    if (this.call) {
      this.call.destroy();
      this.call = null;
    }
  }

  /**
   * Get the current call instance
   */
  getCall(): DailyCall | null {
    return this.call;
  }
}

// Export singleton instance for convenience
const dailyVideoService = DailyVideoService.getInstance();
export default dailyVideoService; 