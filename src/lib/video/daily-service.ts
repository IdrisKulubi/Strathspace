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

export class DailyVideoService {
  private static instance: DailyVideoService;
  private call: DailyCall | null = null;
  private baseUrl = 'https://api.daily.co/v1';
  private apiKey: string;

  private constructor() {
    this.apiKey = process.env.DAILY_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('DAILY_API_KEY environment variable is required');
    }
  }

  public static getInstance(): DailyVideoService {
    if (!DailyVideoService.instance) {
      DailyVideoService.instance = new DailyVideoService();
    }
    return DailyVideoService.instance;
  }

  /**
   * Create a new Daily.co room for StrathSpeed session
   */
  async createRoom(sessionId: string): Promise<DailyRoom> {
    try {
      const response = await fetch(`${this.baseUrl}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          name: `strathspeed-${sessionId}`,
          properties: {
            max_participants: 2,
            enable_chat: false,
            enable_recording: false,
            room_type: 'video',
            enable_knocking: false,
            enable_prejoin_ui: false,
            enable_network_ui: true,
            start_video_off: false,
            start_audio_off: false,
            owner_only_broadcast: false,
            exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes expiry
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create Daily room: ${error.error || response.statusText}`);
      }

      const room = await response.json();
      return room as DailyRoom;
    } catch (error) {
      console.error('Error creating Daily room:', error);
      throw error;
    }
  }

  /**
   * Generate access token for a user to join the room
   */
  async generateToken(roomName: string, userId: string, userName?: string): Promise<DailyToken> {
    try {
      const response = await fetch(`${this.baseUrl}/meeting-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          room_name: roomName,
          user_id: userId,
          user_name: userName,
          is_owner: false,
          exp: Math.floor(Date.now() / 1000) + (20 * 60), // 20 minutes expiry
          enable_recording: false,
          start_video_off: false,
          start_audio_off: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to generate token: ${error.error || response.statusText}`);
      }

      const tokenData = await response.json();
      return {
        token: tokenData.token,
        room_name: roomName,
        expires_at: tokenData.expires_at,
        user_id: userId,
        user_name: userName,
        is_owner: false,
      };
    } catch (error) {
      console.error('Error generating Daily token:', error);
      throw error;
    }
  }

  /**
   * Delete/cleanup a Daily room after session ends
   */
  async deleteRoom(roomName: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/rooms/${roomName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok && response.status !== 404) {
        const error = await response.json();
        throw new Error(`Failed to delete room: ${error.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting Daily room:', error);
      // Don't throw - room cleanup is not critical
    }
  }

  /**
   * Get room information and status
   */
  async getRoomInfo(roomName: string): Promise<DailyRoom | null> {
    try {
      const response = await fetch(`${this.baseUrl}/rooms/${roomName}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get room info: ${error.error || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting room info:', error);
      return null;
    }
  }

  /**
   * Initialize Daily call instance for client-side usage
   */
  initializeCall(): DailyCall {
    if (this.call) {
      this.call.destroy();
    }
    
    this.call = Daily.createCallObject({
      audioSource: true,
      videoSource: true,
      dailyConfig: {
        experimentalChromeVideoMuteLightOff: true,
      },
    });

    return this.call;
  }

  /**
   * Join a Daily room with token
   */
  async joinRoom(roomUrl: string, token: string): Promise<void> {
    if (!this.call) {
      throw new Error('Call object not initialized. Call initializeCall() first.');
    }

    try {
      await this.call.join({
        url: roomUrl,
        token: token,
        startVideoOff: false,
        startAudioOff: false,
      });
    } catch (error) {
      console.error('Error joining Daily room:', error);
      throw error;
    }
  }

  /**
   * Leave the current Daily room
   */
  async leaveRoom(): Promise<void> {
    if (!this.call) return;

    try {
      await this.call.leave();
    } catch (error) {
      console.error('Error leaving Daily room:', error);
    }
  }

  /**
   * Get connection quality metrics
   */
  getConnectionQuality(): ConnectionQuality | null {
    if (!this.call) return null;

    const stats = this.call.getNetworkStats();
    if (!stats) return null;

    // Calculate overall quality based on packet loss
    const avgPacketLoss = (
      stats.videoSendPacketLoss + 
      stats.videoRecvPacketLoss + 
      stats.audioSendPacketLoss + 
      stats.audioRecvPacketLoss
    ) / 4;

    let quality: 'excellent' | 'good' | 'fair' | 'poor';
    if (avgPacketLoss < 0.02) quality = 'excellent';
    else if (avgPacketLoss < 0.05) quality = 'good';
    else if (avgPacketLoss < 0.1) quality = 'fair';
    else quality = 'poor';

    return {
      quality,
      videoSendPacketLoss: stats.videoSendPacketLoss,
      videoRecvPacketLoss: stats.videoRecvPacketLoss,
      audioSendPacketLoss: stats.audioSendPacketLoss,
      audioRecvPacketLoss: stats.audioRecvPacketLoss,
    };
  }

  /**
   * Toggle video on/off
   */
  async toggleVideo(): Promise<boolean> {
    if (!this.call) return false;
    
    const localVideo = this.call.localVideo();
    await this.call.setLocalVideo(!localVideo);
    return !localVideo;
  }

  /**
   * Toggle audio on/off
   */
  async toggleAudio(): Promise<boolean> {
    if (!this.call) return false;
    
    const localAudio = this.call.localAudio();
    await this.call.setLocalAudio(!localAudio);
    return !localAudio;
  }

  /**
   * Add event listener to Daily call
   */
  on(event: DailyEvent, handler: (event?: DailyEventObject) => void): void {
    if (!this.call) return;
    this.call.on(event, handler);
  }

  /**
   * Remove event listener from Daily call
   */
  off(event: DailyEvent, handler: (event?: DailyEventObject) => void): void {
    if (!this.call) return;
    this.call.off(event, handler);
  }

  /**
   * Destroy the call instance
   */
  destroy(): void {
    if (this.call) {
      this.call.destroy();
      this.call = null;
    }
  }

  /**
   * Get current call instance
   */
  getCall(): DailyCall | null {
    return this.call;
  }
}

export default DailyVideoService.getInstance(); 