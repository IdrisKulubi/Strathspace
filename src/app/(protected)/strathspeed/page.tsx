import { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import db from '@/db/drizzle';
import { speedDatingProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { StrathSpeedApp } from '@/components/strathspeed/StrathSpeedApp';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

async function getStrathSpeedProfile(userId: string) {
  try {
    const profile = await db.query.speedDatingProfiles.findFirst({
      where: eq(speedDatingProfiles.userId, userId),
    });
    return profile;
  } catch (error) {
    console.error('Error fetching StrathSpeed profile:', error);
    return null;
  }
}

function StrathSpeedLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-purple-500" />
            <h3 className="font-semibold mb-2">Loading StrathSpeed...</h3>
            <p className="text-sm text-muted-foreground">
              Setting up your speed dating experience
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function StrathSpeedPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Get user's StrathSpeed profile
  const speedProfile = await getStrathSpeedProfile(session.user.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
      <Suspense fallback={<StrathSpeedLoading />}>
        <StrathSpeedApp 
          userId={session.user.id}
          userName={session.user.name || ''}
          userEmail={session.user.email || ''}
          initialProfile={speedProfile || null}
        />
      </Suspense>
    </div>
  );
}

export const metadata = {
  title: 'StrathSpeed - Live Video Speed Dating | StrathSpace',
  description: 'Connect instantly with other students through live video speed dating. Find your vibe in 90 seconds or less.',
  keywords: ['speed dating', 'video chat', 'university dating', 'student connections', 'StrathSpace'],
}; 