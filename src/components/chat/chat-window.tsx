"use client";

import { useSimpleMessaging } from "@/hooks/use-simple-messaging";
import { MessageInput } from "@/components/messaging/message-input";

import { type Profile } from "@/db/schema";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RevealRequestButton } from "@/components/anonymous/RevealRequestButton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, MessageCircle } from "lucide-react";
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
  const searchParams = useSearchParams();
  const isInChatPage = pathname?.startsWith("/chat/");
  const sourceParam = searchParams.get('source');

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
      // If we came from matches modal, navigate back to it
      if (sourceParam === 'matches') {
        router.push("/matches?show=matches");
      } else {
        router.push("/matches");
      }
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

  const containerHeightClass = isInChatPage ? "h-screen" : "h-full";

  return (
    <div className={`flex flex-col ${containerHeightClass} bg-[#2B1A3D]`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3D2652]/50 bg-[#2B1A3D]">
      <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="p-2 hover:bg-[#3D2652] text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-9 w-9">
                <AvatarImage src={partner?.profilePhoto || undefined} alt={partnerName} />
<AvatarFallback className="bg-gradient-to-br from-[#fb51c2] to-[#ff88de] text-white text-xs font-semibold">
                  {partnerName?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              {/* Online indicator placeholder */}
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-[#2B1A3D] rounded-full" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">{partnerName}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>Matched {matchDate}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Right-side actions placeholder */}
        </div>
      </div>

      {/* Anonymous Mode Notice */}
      {currentUserProfile?.anonymous && partner?.anonymous && (
        <div className="p-4 border-b border-[#3D2652]/50 text-center bg-[#2B1A3D]">
          <p className="text-sm text-gray-400 mb-2">
            You are both in Anonymous Mode. Choose to reveal your profiles?
          </p>
          <RevealRequestButton
            matchId={matchId}
            hasRequested={currentUserProfile?.anonymousRevealRequested ?? false}
          />
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#1F1129]">
        {isLoading && messages.length === 0 ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={cn("flex gap-3", i % 2 === 0 ? "justify-start" : "justify-end")}>
                <div className={cn("max-w-[70%] rounded-[20px] px-4 py-3", i % 2 === 0 ? "bg-purple-800/30" : "bg-pink-500/20")}
                     style={{ minHeight: 20, width: i % 3 === 0 ? 180 : 120 }} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-white">Start the conversation</p>
              <p className="text-sm text-gray-400">
                Send a message to {partnerName}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {isLoading && (
              <div className="opacity-70 space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={`sk-${i}`} className={cn("flex gap-3", i % 2 === 0 ? "justify-start" : "justify-end")}>
                    <div className={cn("max-w-[60%] rounded-[20px] px-4 py-2", i % 2 === 0 ? "bg-purple-800/30" : "bg-pink-500/20")} />
                  </div>
                ))}
              </div>
            )}
            {messages.map((message, index) => {
              const isCurrentUser = message.senderId === session?.user?.id;
              const showAvatar =
                index === 0 || messages[index - 1]?.senderId !== message.senderId;

              return (
                <div
                  key={message.id || message.localId}
                  className={cn(
                    "flex gap-3",
                    isCurrentUser ? "justify-end" : "justify-start"
                  )}
                >
                  {/* Left avatar for partner messages */}
                  {!isCurrentUser && (
                    showAvatar ? (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={partner?.profilePhoto || undefined} alt={partnerName} />
                        <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-600 text-white text-xs font-semibold">
                          {partnerName?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-8" />
                    )
                  )}

                  <div
                    className={cn(
                      "max-w-[70%] rounded-[20px] px-4 py-2",
                      isCurrentUser
? "bg-gradient-to-r from-[#fb51c2] via-[#ff6cd4] to-[#ff88de] text-white shadow-lg shadow-pink-500/20"
                        : "bg-[#3D2652] text-white border border-[#4D3662]/50"
                    )}
                  >
                    <p className="text-[15px] leading-relaxed">{message.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">
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

                  {/* Right avatar for current user's messages */}
                  {isCurrentUser && (
                    showAvatar ? (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={(session?.user as any)?.image || undefined} alt="You" />
<AvatarFallback className="bg-gradient-to-br from-[#fb51c2] to-[#ff88de] text-white text-xs font-semibold">
                          {session?.user?.name?.[0]?.toUpperCase() || "Y"}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-8" />
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-[#3D2652]/50 bg-[#2B1A3D]">
        <div className="p-4">
          <MessageInput
            onSend={handleSendMessage}
            disabled={isSending}
            placeholder="Type a message..."
          />

          {/* Sending status */}
          {isSending && (
            <div className="mt-2 text-xs text-gray-400">
              <span className="text-pink-400 animate-pulse">Sending...</span>
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
