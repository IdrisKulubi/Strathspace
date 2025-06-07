import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { StrathSpeedProvider } from '@/components/strathspeed/providers/StrathSpeedProvider';
import { StrathSpeedMobileApp } from '@/components/strathspeed/StrathSpeedMobileApp';

export default async function StrathSpeedPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  return (
    <StrathSpeedProvider userId={session.user.id}>
      <StrathSpeedMobileApp />
    </StrathSpeedProvider>
  );
}

export const metadata = {
  title: 'StrathSpeed - Live Video Speed Dating',
  description: 'Meet new people through quick video chats. Find your vibe in 90 seconds!',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
}; 