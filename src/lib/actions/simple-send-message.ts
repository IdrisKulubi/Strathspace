'use server'

import { randomUUID } from "crypto";
import db from "@/db/drizzle";
import { messages, users } from "@/db/schema";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function simpleSendMessage(formData: FormData) {
  console.log('🔧 Simple send message called');
  
  try {
    // Get session
    const session = await auth();
    console.log('🔧 Session:', { hasSession: !!session, userId: session?.user?.id });
    
    if (!session?.user?.id) {
      console.log('❌ No session');
      return { success: false, error: 'Not authenticated' };
    }

    // Get form data
    const matchId = formData.get('matchId') as string;
    const content = formData.get('content') as string;
    
    console.log('🔧 Form data:', { matchId, contentLength: content?.length });

    if (!matchId || !content) {
      console.log('❌ Missing data');
      return { success: false, error: 'Missing matchId or content' };
    }

    // Insert message
    console.log('🔧 Inserting message...');
    
    // Generate a UUID for the message ID
    const messageId = randomUUID();
    
    const [newMessage] = await db
      .insert(messages)
      .values({
        id: messageId,
        matchId,
        senderId: session.user.id,
        content,
        status: 'sent'
      })
      .returning();
    
    console.log('🔧 Message inserted:', { id: newMessage.id });

    // Get sender info
    console.log('🔧 Getting sender info...');
    const sender = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        id: true,
        name: true,
        image: true
      }
    });

    if (!sender) {
      console.log('❌ No sender found');
      return { success: false, error: 'Sender not found' };
    }

    console.log('🔧 Sender found:', { name: sender.name });

    const result = {
      ...newMessage,
      sender
    };

    console.log('🔧 Returning result');
    revalidatePath(`/chat/${matchId}`);
    
    return { success: true, data: result };

  } catch (error) {
    console.error('❌ Simple send message error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}