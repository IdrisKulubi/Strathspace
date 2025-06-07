import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import EventService from '@/lib/strathspeed/event-service';
import { z } from 'zod';

const sessionActionSchema = z.object({
  action: z.enum(['vibe', 'skip', 'report']),
  sessionId: z.string().min(1),
  reportReason: z.string().optional(),
});

export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json();
    const validation = sessionActionSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.issues 
        },
        { status: 400 }
      );
    }

    const { action, sessionId, reportReason } = validation.data;

    // Validate report reason if action is report
    if (action === 'report' && !reportReason) {
      return NextResponse.json(
        { error: 'Report reason is required when reporting' },
        { status: 400 }
      );
    }

    // Handle the session action
    try {
      const result = await EventService.handleSessionAction(
        userId, 
        action, 
        sessionId, 
        reportReason
      );
      
      return NextResponse.json({
        success: true,
        data: result,
        message: result.message || 'Action completed successfully',
      });
    } catch (actionError) {
      console.error('Session action error:', actionError);
      
      // Handle specific action errors
      if (actionError instanceof Error) {
        if (actionError.message.includes('Session not found')) {
          return NextResponse.json(
            { error: 'Session not found or has expired' },
            { status: 404 }
          );
        }
        if (actionError.message.includes('Unauthorized')) {
          return NextResponse.json(
            { error: 'You are not authorized to perform this action' },
            { status: 403 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'Failed to process action. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Session action API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 