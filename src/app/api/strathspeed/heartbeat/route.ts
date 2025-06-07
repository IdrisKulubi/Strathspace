import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import EventService from '@/lib/strathspeed/event-service';
import { z } from 'zod';

const heartbeatSchema = z.object({
  timestamp: z.number(),
});

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Parse and validate request body
    const body = await request.json();
    const validation = heartbeatSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.issues 
        },
        { status: 400 }
      );
    }

    const { timestamp } = validation.data;

    // Update heartbeat
    await EventService.handleHeartbeat(userId, timestamp);
    
    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Heartbeat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 