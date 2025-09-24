/**
 * Test function to verify sendMessage server action works
 */

import { sendMessage } from '@/lib/actions/messaging.actions';

export async function testSendMessage(matchId: string, content: string) {
  console.log('🧪 Testing sendMessage server action...');
  
  try {
    const formData = new FormData();
    formData.append('matchId', matchId);
    formData.append('content', content);
    
    console.log('🧪 FormData prepared:', {
      matchId,
      content,
      entries: Array.from(formData.entries())
    });
    
    const result = await sendMessage(formData);
    
    console.log('🧪 Test result:', {
      success: result.success,
      error: result.error,
      hasData: !!result.data
    });
    
    return result;
  } catch (error) {
    console.error('🧪 Test error:', error);
    throw error;
  }
}