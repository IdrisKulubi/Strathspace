import { pusher } from '@/lib/pusher/server';
import MatchingEngine, { QueueUser } from './matching-engine';
import { redis } from '@/lib/redis';
import db from '@/db/drizzle';
import { speedSessions, sessionOutcomes, users, profiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Client → Server Events
export interface ClientEvents {
  'join-queue': {
    preferences: {
      anonymousMode: boolean;
      ageRange?: [number, number];
      genderPreference?: string;
      interests?: string[];
    };
  };
  'leave-queue': {};
  'session-action': {
    action: 'vibe' | 'skip' | 'report';
    sessionId: string;
    reportReason?: string;
  };
  'heartbeat': {
    timestamp: number;
  };
  'queue-position': {
    userId: string;
  };
}

// Server → Client Events
export interface ServerEvents {
  'queue-joined': {
    position: number;
    estimatedWaitTime: number;
    queueSize: number;
  };
  'queue-position-update': {
    position: number;
    estimatedWaitTime: number;
    queueSize: number;
  };
  'match-found': {
    sessionId: string;
    roomUrl: string;
    token: string;
    icebreaker: any;
    isAnonymous: boolean;
    matchedUser: {
      id: string;
      name?: string;
      profilePhoto?: string;
    };
    timestamp: number;
  };
  'session-ended': {
    reason: 'timeout' | 'user_action' | 'system_error';
    sessionId: string;
    timestamp: number;
  };
  'queue-left': {
    reason: 'user_action' | 'match_found' | 'timeout';
    timestamp: number;
  };
  'error': {
    message: string;
    code: string;
    timestamp: number;
  };
}

export interface SessionActionResult {
  success: boolean;
  action: 'vibe' | 'skip' | 'report';
  sessionId: string;
  isMatch?: boolean;
  matchId?: string;
  points?: number;
  message?: string;
}

export class StrathSpeedEventService {
  private static instance: StrathSpeedEventService;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startHeartbeatMonitoring();
    this.startCleanupProcess();
  }

  public static getInstance(): StrathSpeedEventService {
    if (!StrathSpeedEventService.instance) {
      StrathSpeedEventService.instance = new StrathSpeedEventService();
    }
    return StrathSpeedEventService.instance;
  }

  /**
   * Handle user joining the queue
   */
  async handleJoinQueue(
    userId: string,
    preferences: ClientEvents['join-queue']['preferences']
  ): Promise<ServerEvents['queue-joined']> {
    try {
      // Get user info from database
      const userWithProfile = await db.query.users.findFirst({
        where: eq(users.id, userId),
        with: {
          profile: true,
        },
      });

      if (!userWithProfile) {
        throw new Error('User not found');
      }

      // Create queue user object
      const queueUser: QueueUser = {
        userId,
        joinedAt: Date.now(),
        preferences,
        userInfo: {
          name: userWithProfile.profile?.firstName   || userWithProfile.email,
          profilePhoto: userWithProfile.profile?.profilePhoto || '',
        },
      };

      // Add to queue
      const result = await MatchingEngine.addToQueue(queueUser);
      
      // Get queue stats for estimated wait time
      const stats = await MatchingEngine.getQueueStats();
      const estimatedWaitTime = this.calculateEstimatedWaitTime(result.position, stats);

      const response: ServerEvents['queue-joined'] = {
        position: result.position,
        estimatedWaitTime,
        queueSize: stats.totalInQueue,
      };

      // Send confirmation to user
      await pusher.trigger(`user-${userId}`, 'strathspeed-queue-joined', response);

      // Start position updates for this user
      this.startPositionUpdates(userId);

      return response;
    } catch (error) {
      console.error('Error joining queue:', error);
      
      const errorResponse: ServerEvents['error'] = {
        message: error instanceof Error ? error.message : 'Failed to join queue',
        code: 'QUEUE_JOIN_FAILED',
        timestamp: Date.now(),
      };
      
      await pusher.trigger(`user-${userId}`, 'strathspeed-error', errorResponse);
      throw error;
    }
  }

  /**
   * Handle user leaving the queue
   */
  async handleLeaveQueue(userId: string): Promise<ServerEvents['queue-left']> {
    try {
      const success = await MatchingEngine.removeFromQueue(userId);
      
      const response: ServerEvents['queue-left'] = {
        reason: 'user_action',
        timestamp: Date.now(),
      };

      if (success) {
        await pusher.trigger(`user-${userId}`, 'strathspeed-queue-left', response);
      }

      return response;
    } catch (error) {
      console.error('Error leaving queue:', error);
      throw error;
    }
  }

  /**
   * Handle session actions (vibe, skip, report)
   */
  async handleSessionAction(
    userId: string,
    action: ClientEvents['session-action']['action'],
    sessionId: string,
    reportReason?: string
  ): Promise<SessionActionResult> {
    try {
      // Get session from database
      const session = await db.query.speedSessions.findFirst({
        where: eq(speedSessions.id, sessionId),
      });

      if (!session) {
        throw new Error('Session not found');
      }

      // Verify user is part of this session
      if (session.user1Id !== userId && session.user2Id !== userId) {
        throw new Error('Unauthorized session access');
      }

      const isUser1 = session.user1Id === userId;
      const partnerId = isUser1 ? session.user2Id : session.user1Id;

      // Create session outcome record
      const validReportReasons = ["inappropriate_content", "harassment", "spam", "nudity", "other"] as const;
      const isValidReportReason = (reason: string | undefined): reason is typeof validReportReasons[number] => 
        !!reason && validReportReasons.includes(reason as any);

      await db.insert(sessionOutcomes).values({
        sessionId,
        userId,
        action,
        reportReason: action === 'report' && isValidReportReason(reportReason) ? reportReason : null,
      });

      let result: SessionActionResult = {
        success: true,
        action,
        sessionId,
      };

      // Handle different actions
      switch (action) {
        case 'vibe':
          result = await this.handleVibeAction(session, userId, partnerId);
          break;
        case 'skip':
          result = await this.handleSkipAction(session, userId, partnerId);
          break;
        case 'report':
          result = await this.handleReportAction(session, userId, partnerId, reportReason);
          break;
      }

      // Update session status if needed
      if (action === 'report' || action === 'skip') {
        await db.update(speedSessions)
          .set({ 
            status: 'completed',
            endedAt: new Date(),
          })
          .where(eq(speedSessions.id, sessionId));
      }

      // Send real-time updates to both users
      await this.notifySessionAction(session, userId, partnerId, result);

      return result;
    } catch (error) {
      console.error('Error handling session action:', error);
      throw error;
    }
  }

  /**
   * Handle vibe action - potential match creation
   */
  private async handleVibeAction(
    session: any,
    userId: string,
    partnerId: string
  ): Promise<SessionActionResult> {
    // Check if partner also vibed
    const partnerVibe = await db.query.sessionOutcomes.findFirst({
      where: and(
        eq(sessionOutcomes.sessionId, session.id),
        eq(sessionOutcomes.userId, partnerId),
        eq(sessionOutcomes.action, 'vibe')
      ),
    });

    let result: SessionActionResult = {
      success: true,
      action: 'vibe',
      sessionId: session.id,
      points: 25, // Points for sending a vibe
      message: 'Vibe sent successfully!',
    };

    if (partnerVibe) {
      // It's a match! Create traditional match in your existing matches table
      // This would integrate with your existing match system
      result.isMatch = true;
      result.points = 50; // Bonus points for mutual vibes
      result.message = '🎉 It\'s a match! You both vibed!';
      
      // Update session status to completed
      await db.update(speedSessions)
        .set({ 
          status: 'completed',
          endedAt: new Date(),
        })
        .where(eq(speedSessions.id, session.id));
    }

    return result;
  }

  /**
   * Handle skip action
   */
  private async handleSkipAction(
    session: any,
    userId: string,
    partnerId: string
  ): Promise<SessionActionResult> {
    return {
      success: true,
      action: 'skip',
      sessionId: session.id,
      points: 10, // Small points for completing session
      message: 'Session completed. Thanks for participating!',
    };
  }

  /**
   * Handle report action
   */
  private async handleReportAction(
    session: any,
    userId: string,
    partnerId: string,
    reportReason?: string
  ): Promise<SessionActionResult> {
    // Additional reporting logic would go here
    // For now, just log and end the session
    console.log(`User ${userId} reported ${partnerId} for: ${reportReason}`);

    return {
      success: true,
      action: 'report',
      sessionId: session.id,
      message: 'Report submitted. Thank you for keeping StrathSpeed safe.',
    };
  }

  /**
   * Send real-time notifications for session actions
   */
  private async notifySessionAction(
    session: any,
    actorId: string,
    partnerId: string,
    result: SessionActionResult
  ): Promise<void> {
    try {
      const baseEvent = {
        sessionId: session.id,
        timestamp: Date.now(),
      };

      // Notify the actor
      await pusher.trigger(`user-${actorId}`, 'strathspeed-action-result', {
        ...baseEvent,
        ...result,
      });

      // Notify the partner based on action
      if (result.action === 'vibe' && result.isMatch) {
        // Both users get match notification
        await pusher.trigger(`user-${partnerId}`, 'strathspeed-match-confirmed', {
          ...baseEvent,
          message: '🎉 It\'s a match! You both vibed!',
          points: 50,
        });
      } else if (result.action === 'skip' || result.action === 'report') {
        // Partner gets session ended notification
        await pusher.trigger(`user-${partnerId}`, 'strathspeed-session-ended', {
          ...baseEvent,
          reason: 'user_action',
        });
      }
    } catch (error) {
      console.error('Error sending session action notifications:', error);
    }
  }

  /**
   * Handle heartbeat from client
   */
  async handleHeartbeat(userId: string, timestamp: number): Promise<void> {
    try {
      // Update user's last seen timestamp in Redis
      await redis.setex(`strathspeed:heartbeat:${userId}`, 60, timestamp.toString());
    } catch (error) {
      console.error('Error handling heartbeat:', error);
    }
  }

  /**
   * Get current queue position for user
   */
  async getQueuePosition(userId: string): Promise<ServerEvents['queue-position-update'] | null> {
    try {
      const position = await MatchingEngine.getQueuePosition(userId);
      if (position === null) {
        return null;
      }

      const stats = await MatchingEngine.getQueueStats();
      const estimatedWaitTime = this.calculateEstimatedWaitTime(position, stats);

      return {
        position,
        estimatedWaitTime,
        queueSize: stats.totalInQueue,
      };
    } catch (error) {
      console.error('Error getting queue position:', error);
      return null;
    }
  }

  /**
   * Calculate estimated wait time based on position and queue stats
   */
  private calculateEstimatedWaitTime(position: number, stats: any): number {
    // Base wait time per position (in seconds)
    const baseWaitPerPosition = 30; // 30 seconds per position
    
    // Factor in current average wait time
    const avgWaitFactor = Math.min(stats.avgWaitTime / 60, 5); // Max 5 minute factor
    
    // Calculate estimated wait time
    const estimatedWait = (position - 1) * baseWaitPerPosition + (avgWaitFactor * 60);
    
    return Math.max(15, Math.round(estimatedWait)); // Minimum 15 seconds
  }

  /**
   * Start position updates for a user
   */
  private async startPositionUpdates(userId: string): Promise<void> {
    // Check position every 10 seconds and update if changed
    const checkPosition = async () => {
      try {
        const positionUpdate = await this.getQueuePosition(userId);
        if (positionUpdate) {
          await pusher.trigger(`user-${userId}`, 'strathspeed-position-update', positionUpdate);
          
          // Schedule next check
          setTimeout(checkPosition, 10000);
        }
      } catch (error) {
        console.error('Error in position update:', error);
      }
    };

    // Start first check after 10 seconds
    setTimeout(checkPosition, 10000);
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.checkInactiveUsers();
      } catch (error) {
        console.error('Error in heartbeat monitoring:', error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Check for inactive users and remove them from queue
   */
  private async checkInactiveUsers(): Promise<void> {
    try {
      const now = Date.now();
      const inactiveThreshold = 2 * 60 * 1000; // 2 minutes

      // Get all users in queue
      const queueData = await redis.zrange('strathspeed:queue:active', 0, -1);
      
      for (const userId of queueData) {
        const lastHeartbeat = await redis.get(`strathspeed:heartbeat:${userId}`);
        
        if (!lastHeartbeat || (now - parseInt(lastHeartbeat as string)) > inactiveThreshold) {
          // Remove inactive user
          await MatchingEngine.removeFromQueue(userId as string);
          
          // Notify user
          await pusher.trigger(`user-${userId}`, 'strathspeed-queue-left', {
            reason: 'timeout',
            timestamp: now,
          });
        }
      }
    } catch (error) {
      console.error('Error checking inactive users:', error);
    }
  }

  /**
   * Start cleanup process
   */
  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        await MatchingEngine.cleanupExpiredEntries();
      } catch (error) {
        console.error('Error in cleanup process:', error);
      }
    }, 30000); // Cleanup every 30 seconds
  }

  /**
   * Cleanup intervals on shutdown
   */
  public cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Export singleton instance
export default StrathSpeedEventService.getInstance(); 