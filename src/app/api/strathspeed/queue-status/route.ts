import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import EventService from '@/lib/strathspeed/event-service';
import MatchingEngine from '@/lib/strathspeed/matching-engine';

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user's current queue position
    const positionData = await EventService.getQueuePosition(userId);
    
    // Get overall queue statistics
    const queueStats = await MatchingEngine.getQueueStats();

    if (positionData) {
      // User is in queue
      return NextResponse.json({
        success: true,
        data: {
          inQueue: true,
          position: positionData.position,
          estimatedWaitTime: positionData.estimatedWaitTime,
          queueSize: positionData.queueSize,
          stats: {
            totalInQueue: queueStats.totalInQueue,
            avgWaitTime: queueStats.avgWaitTime,
            oldestWaitTime: queueStats.oldestWaitTime,
          },
        },
      });
    } else {
      // User is not in queue
      return NextResponse.json({
        success: true,
        data: {
          inQueue: false,
          stats: {
            totalInQueue: queueStats.totalInQueue,
            avgWaitTime: queueStats.avgWaitTime,
            oldestWaitTime: queueStats.oldestWaitTime,
          },
        },
      });
    }
  } catch (error) {
    console.error('Queue status API error:', error);
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    );
  }
} 