import { NextResponse } from "next/server";
import { auth } from "@/auth";
import db from "@/db/drizzle";
import { matches, messages, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { matchId, content } = await req.json();
    if (!matchId || !content?.trim()) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
    }

    // Ensure the user is part of the match
    const match = await db.query.matches.findFirst({
      where: eq(matches.id, matchId),
      columns: { id: true, user1Id: true, user2Id: true },
    });

    if (!match || (match.user1Id !== session.user.id && match.user2Id !== session.user.id)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const [newMessage] = await db
      .insert(messages)
      .values({
        id: randomUUID(),
        matchId,
        senderId: session.user.id,
        content: content.trim(),
        status: "sent",
      })
      .returning();

    const sender = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { id: true, name: true, image: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...newMessage,
        sender,
      },
    });
  } catch (error) {
    console.error("/api/messages/send error", error);
    return NextResponse.json({ success: false, error: "Failed to send message" }, { status: 500 });
  }
}
