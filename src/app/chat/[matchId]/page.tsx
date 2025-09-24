import { MessagingContainer } from "@/components/messaging";
import { getConversationFromMatch } from "@/lib/actions/match-messaging.actions";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import db from "@/db/drizzle";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";

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
    // Use the new optimized server action
    const conversationResult = await getConversationFromMatch(matchId);

    if (!conversationResult.success) {
      console.error("Failed to get conversation:", conversationResult.error);
      redirect("/matches");
      return;
    }

    const currentUserProfile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, session.user.id),
    });

    if (!currentUserProfile) {
      console.error("Failed to fetch user profile.");
      redirect("/matches");
      return;
    }

    console.log("🚀 NEW MESSAGING SYSTEM - Chat Page Loaded:", {
      matchId,
      hasConversation: conversationResult.data.conversationExists,
      partnerName: conversationResult.data.partner.name,
      usingOptimizedSystem: true,
    });

    return (
      <div className="h-screen bg-background">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <Spinner className="h-8 w-8 text-pink-500" />
            </div>
          }
        >
          <MessagingContainer
            matchId={matchId}
            initialPartner={conversationResult.data.partner}
            currentUserProfile={currentUserProfile}
          />
        </Suspense>
      </div>
    );
  } catch (error) {
    console.error("ChatPage Error:", error);
    redirect("/matches");
  }
}
