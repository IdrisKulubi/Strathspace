import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import db from '@/db/drizzle';
import { speedDatingProfiles, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import MatchingEngine from '@/lib/strathspeed/matching-engine';
import EventService from '@/lib/strathspeed/event-service';
import { z } from 'zod';

const joinQueueSchema = z.object({
  preferences: z.object({
    anonymousMode: z.boolean().default(false),
    ageRange: z.tuple([z.number().min(18), z.number().max(100)]).optional(),
    genderPreference: z.enum(['male', 'female', 'non-binary', 'any']).optional(),
    interests: z.array(z.string()).max(10).optional(),
  }),
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
    const validation = joinQueueSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.issues 
        },
        { status: 400 }
      );
    }

    const { preferences } = validation.data;

    // Check if user has a speed dating profile
    let speedProfile = await db.query.speedDatingProfiles.findFirst({
      where: eq(speedDatingProfiles.userId, userId),
    });

    // Create profile if it doesn't exist
    if (!speedProfile) {
      await db.insert(speedDatingProfiles).values({
        userId,
        isActive: true,
        speedPoints: 0,
        totalSessions: 0,
        vibesReceived: 0,
        vibesSent: 0,
        currentStreak: 0,
        longestStreak: 0,
        anonymousModeDefault: preferences.anonymousMode,
        ageRangeMin: preferences.ageRange?.[0],
        ageRangeMax: preferences.ageRange?.[1],
        genderPreference: preferences.genderPreference,
        interests: preferences.interests || [],
      });

      // Fetch the newly created profile
      speedProfile = await db.query.speedDatingProfiles.findFirst({
        where: eq(speedDatingProfiles.userId, userId),
      });
    } else {
      // Update existing profile with new preferences
      await db.update(speedDatingProfiles)
        .set({
          anonymousModeDefault: preferences.anonymousMode,
          ageRangeMin: preferences.ageRange?.[0],
          ageRangeMax: preferences.ageRange?.[1],
          genderPreference: preferences.genderPreference,
          interests: preferences.interests || speedProfile.interests,
          lastActiveAt: new Date(),
        })
        .where(eq(speedDatingProfiles.userId, userId));
    }

    // Check if profile is active
    if (!speedProfile?.isActive) {
      return NextResponse.json(
        { error: 'Speed dating profile is not active' },
        { status: 403 }
      );
    }

    // Join the queue using the event service
    try {
      const result = await EventService.handleJoinQueue(userId, preferences);
      
      return NextResponse.json({
        success: true,
        data: {
          position: result.position,
          estimatedWaitTime: result.estimatedWaitTime,
          queueSize: result.queueSize,
          preferences,
          userId,
        },
        message: 'Successfully joined the StrathSpeed queue',
      });
    } catch (queueError) {
      console.error('Queue join error:', queueError);
      
      // Handle specific queue errors
      if (queueError instanceof Error) {
        if (queueError.message.includes('currently in a session')) {
          return NextResponse.json(
            { error: 'You are already in an active session' },
            { status: 409 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'Failed to join queue. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Join queue API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    // Leave the queue using the event service
    try {
      const result = await EventService.handleLeaveQueue(userId);
      
      return NextResponse.json({
        success: true,
        data: result,
        message: 'Successfully left the StrathSpeed queue',
      });
    } catch (queueError) {
      console.error('Queue leave error:', queueError);
      return NextResponse.json(
        { error: 'Failed to leave queue' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Leave queue API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 