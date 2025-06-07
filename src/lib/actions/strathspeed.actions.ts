'use server';

import { DailyRoom, DailyToken } from '@/lib/video/daily-service';

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_BASE_URL = 'https://api.daily.co/v1';

if (!DAILY_API_KEY) {
  throw new Error('DAILY_API_KEY environment variable is required');
}

/**
 * Server action to create a Daily.co room for StrathSpeed session
 */
export async function createDailyRoom(sessionId: string): Promise<DailyRoom> {
  try {
    const response = await fetch(`${DAILY_BASE_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`,
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
 * Server action to generate access token for a user to join the room
 */
export async function generateDailyToken(
  roomName: string, 
  userId: string, 
  userName?: string
): Promise<DailyToken> {
  try {
    const response = await fetch(`${DAILY_BASE_URL}/meeting-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`,
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
 * Server action to delete/cleanup a Daily room after session ends
 */
export async function deleteDailyRoom(roomName: string): Promise<void> {
  try {
    const response = await fetch(`${DAILY_BASE_URL}/rooms/${roomName}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
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
 * Server action to get room information and status
 */
export async function getDailyRoomInfo(roomName: string): Promise<DailyRoom | null> {
  try {
    const response = await fetch(`${DAILY_BASE_URL}/rooms/${roomName}`, {
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
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