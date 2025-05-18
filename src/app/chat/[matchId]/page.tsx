import { ChatWindow } from "@/components/chat/chat-window";
import { getMatchDetails } from "@/lib/actions/chat.actions";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import db from "@/db/drizzle";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
    return;
  }

  const { matchId } = await params;

  try {
    const matchDetails = await getMatchDetails(matchId, session.user.id);

    const currentUserProfile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, session.user.id),
    });

    if (!matchDetails || !currentUserProfile) {
      console.error("Failed to fetch match details or user profile.");
      redirect("/matches");
      return;
    }
    
    const { match, partner } = matchDetails;

    return <ChatWindow matchId={match.id} partner={partner} currentUserProfile={currentUserProfile} />;
  } catch (error) {
    console.error("ChatPage Error:", error);
    redirect("/matches");
  }
} 