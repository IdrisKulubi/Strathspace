import { NextResponse } from "next/server";
import { auth } from "@/auth";
import db from "@/db/drizzle";
import { messages, matches } from "@/db/schema";
import { and, desc, eq, lt, or } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get("matchId");
    const limitParam = searchParams.get("limit");
    const before = searchParams.get("before");

    const limit = Math.min(Math.max(parseInt(limitParam || "30", 10) || 30, 1), 100);

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!matchId) {
      return NextResponse.json({ success: false, error: "matchId is required" }, { status: 400 });
    }

    // Validate access: user must be a participant in the match
    const match = await db.query.matches.findFirst({
      where: and(
        eq(matches.id, matchId),
        or(eq(matches.user1Id, session.user.id), eq(matches.user2Id, session.user.id))
      ),
      columns: { id: true },
    });
    if (!match) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    let whereCond = eq(messages.matchId, matchId);
    if (before) {
      whereCond = and(whereCond, lt(messages.createdAt, new Date(before)));
    }

    const results = await db.query.messages.findMany({
      where: whereCond,
      orderBy: [desc(messages.createdAt)],
      limit: limit + 1,
      with: {
        sender: { columns: { id: true, name: true, image: true } },
      },
    });

    const hasMore = results.length > limit;
    const trimmed = hasMore ? results.slice(0, -1) : results;
    const ordered = trimmed.reverse();

    const totalCount = await db.query.messages.findMany({
      where: eq(messages.matchId, matchId),
      columns: { id: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        messages: ordered.map((m) => ({ ...m, status: m.status })),
        hasMore,
        nextCursor: hasMore ? trimmed[trimmed.length - 1]?.createdAt?.toISOString() : undefined,
        totalCount: totalCount.length,
      },
    });
  } catch (error) {
    console.error("/api/messages/list error", error);
    return NextResponse.json({ success: false, error: "Failed to load messages" }, { status: 500 });
  }
}
