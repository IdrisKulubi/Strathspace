import db from "@/db/drizzle";
import { Message, messages } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { User } from "next-auth";
export const updateMessageStatus = async (
  messageIds: string[],
  status: Message["status"],
  matchId: string,
  currentUser: User
) => {
  await db.update(messages)
    .set({ status })
    .where(inArray(messages.id, messageIds));
  
  // Note: Real-time notifications removed - using periodic fetching instead
}; 
