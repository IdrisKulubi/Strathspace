import { NextRequest, NextResponse } from 'next/server';
import { seedIcebreakers } from '@/lib/strathspeed/seed-icebreakers';

export async function POST(request: NextRequest) {
  try {
    await seedIcebreakers();
    return NextResponse.json({ 
      success: true, 
      message: 'Icebreakers seeded successfully' 
    });
  } catch (error) {
    console.error('Seeding error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 