"use client";

import { useSimpleMessaging } from "@/hooks/use-simple-messaging";
import { MessageInput } from "@/components/messaging/message-input";

import { type Profile } from "@/db/schema";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RevealRequestButton } from "@/components/anonymous/RevealRequestButton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { markConversationAsRead } from "@/lib/actions/messaging.actions";

interface ChatWindowProps {
  matchId: string;
  partner: Profile;
  currentUserProfile: Profile | null;
  onClose?: () => void;
}

export const ChatWindow = ({
  matchId,
  onClose,
  partner,
  currentUserProfile,
}: ChatWindowProps) => {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isInChatPage = pathname?.startsWith("/chat/");

  const [performanceStats, setPerformanceStats] = useState<any>(null);

  // Use simple messaging system for debugging
  const { messages, isLoading, isSending, error, sendMessage, retryMessage } =
    useSimpleMessaging({
      matchId,
      enabled: true,
      pollingInterval: 4000,
    });

  // Simple logging for debugging
  useEffect(() => {
    console.log("💬 Simple messaging system active:", {
      matchId,
      partnerName: partner?.firstName,
      messageCount: messages.length,
    });
  }, [matchId, messages.length, partner]);

  // Mark messages as read when conversation is viewed
  useEffect(() => {
    if (session?.user?.id && matchId && messages.length > 0) {
      const markAsRead = async () => {
        try {
          await markConversationAsRead(matchId);
          console.log("📖 Messages marked as read for match:", matchId);
        } catch (error) {
          console.error("Error marking messages as read:", error);
        }
      };

      // Debounce the mark as read call
      const timer = setTimeout(markAsRead, 1000);
      return () => clearTimeout(timer);
    }
  }, [matchId, session?.user?.id, messages.length]);

  const partnerName = partner?.firstName
    ? `${partner.firstName}${partner.lastName ? ` ${partner.lastName}` : ""}`
    : "this persons";
  const matchDate = partner?.createdAt
    ? new Date(partner.createdAt).toLocaleDateString()
    : "recently";

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (isInChatPage) {
      router.push("/explore");
    }
  };

  const handleSendMessage = async (content: string) => {
    console.log("📤 ChatWindow handleSendMessage called:", {
      content: content?.substring(0, 50),
      hasContent: !!content?.trim(),
      hasSession: !!session?.user?.id,
      matchId,
      sendMessageFunction: typeof sendMessage,
    });

    if (!content?.trim()) {
      console.log("❌ No content to send");
      return;
    }

    if (!session?.user?.id) {
      console.log("❌ No session user ID");
      return;
    }

    try {
      console.log("🔄 Calling sendMessage...");
      const success = await sendMessage(content.trim());
      console.log("📡 SendMessage result:", success);

      if (success) {
        console.log("✅ Message sent successfully");
      } else {
        console.log("❌ Message failed to send");
      }
    } catch (error) {
      console.error("❌ Error in handleSendMessage:", error);
    }
  };

  const handleRetry = async (messageId?: string) => {
    if (messageId) {
      console.log("🔄 Retrying message:", messageId);
      await retryMessage(messageId);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Enhanced Chat Header with Performance Indicators */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <div>
              <h3 className="font-semibold text-lg">{partnerName}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Matched {matchDate}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Removed technical indicators */}
        </div>
      </div>

      {/* Match Info */}
      <div className="px-4 py-2 text-sm text-muted-foreground text-center border-b bg-muted/30">
        <div className="flex items-center justify-center gap-2">
          <Users className="h-4 w-4" />
          <span>
            You matched with {partnerName} on {matchDate}
          </span>
        </div>
      </div>

      {/* Anonymous Mode Notice */}
      {currentUserProfile?.anonymous && partner?.anonymous && (
        <div className="p-4 border-b text-center bg-muted/50">
          <p className="text-sm text-muted-foreground mb-2">
            You are both in Anonymous Mode. Choose to reveal your profiles?
          </p>
          <RevealRequestButton
            matchId={matchId}
            hasRequested={currentUserProfile?.anonymousRevealRequested ?? false}
          />
        </div>
      )}

      {/* Message List with Cached Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">
                Loading messages...
              </p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Start the conversation</p>
              <p className="text-sm text-muted-foreground">
                Send a message to {partnerName}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isCurrentUser = message.senderId === session?.user?.id;
              const showAvatar =
                !isCurrentUser &&
                (index === 0 ||
                  messages[index - 1]?.senderId !== message.senderId);

              return (
                <div
                  key={message.id || message.localId}
                  className={cn(
                    "flex gap-3",
                    isCurrentUser ? "justify-end" : "justify-start"
                  )}
                >
                  {!isCurrentUser && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {showAvatar
                        ? partner?.firstName?.[0]?.toUpperCase() || "?"
                        : ""}
                    </div>
                  )}

                  <div
                    className={cn(
                      "max-w-[70%] rounded-lg px-4 py-2",
                      isCurrentUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs opacity-70">
                        {format(new Date(message.createdAt), "HH:mm")}
                      </span>
                      {message.status === "sending" && (
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-current opacity-70"></div>
                      )}
                      {message.status === "failed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRetry(message.localId)}
                          className="text-xs h-auto p-0 text-destructive hover:text-destructive"
                        >
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Enhanced Message Input with Status */}
      <div className="border-t bg-card">
        <div className="p-4">
          <MessageInput
            onSend={handleSendMessage}
            disabled={isSending}
            placeholder="Type a message..."
          />

          {/* Simplified Status - Only show sending state */}
          {isSending && (
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="text-blue-600 animate-pulse">Sending...</span>
            </div>
          )}

          {/* Debug test buttons */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-2 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  console.log("🧪 Testing direct server action call...");
                  try {
                    const { testSendMessage } = await import(
                      "@/lib/test-send-message"
                    );
                    const result = await testSendMessage(
                      matchId,
                      "Test message"
                    );
                    console.log("🧪 Direct test result:", result);
                  } catch (error) {
                    console.error("🧪 Direct test error:", error);
                  }
                }}
              >
                Test Server Action
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  console.log("🔍 Checking database structure...");
                  try {
                    const { checkMessagesTable } = await import(
                      "@/lib/debug-db"
                    );
                    const result = await checkMessagesTable();
                    console.log("🔍 Database check result:", result);
                  } catch (error) {
                    console.error("🔍 Database check error:", error);
                  }
                }}
              >
                Check DB
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Error Display with Retry */}
      {error && (
        <div className="p-3 bg-destructive/10 border-t border-destructive/20">
          <div className="flex items-center justify-between">
            <span className="text-destructive text-sm">{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="text-xs"
            >
              Retry
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
