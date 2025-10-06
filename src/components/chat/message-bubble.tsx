"use client";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Message } from "@/db/schema";

interface MessageBubbleProps {
  message: Message;
  isUser: boolean;
  partnerName?: string;
  partnerImage?: string;
  showAvatar?: boolean;
}

export const MessageBubble = ({ 
  message, 
  isUser, 
  partnerName, 
  partnerImage,
  showAvatar = false 
}: MessageBubbleProps) => {
  const messageStatus = message?.status || "sent";
  const isSent = messageStatus === "sent";
  const isDelivered = messageStatus === "delivered";
  const isRead = messageStatus === "read";

  const content = message?.content || "";
  const contentLength = content.length;
  const isLongMessage = contentLength > 100;
  
  const messageDate = message?.createdAt ? new Date(message.createdAt) : new Date();
  const formattedTime = format(messageDate, "HH:mm");

  // Get initials for avatar fallback
  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn(
      "flex gap-2 items-end",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar for partner messages */}
      {!isUser && showAvatar && (
        <Avatar className="h-8 w-8 border-2 border-transparent flex-shrink-0">
          <AvatarImage src={partnerImage} alt={partnerName} />
          <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-600 text-white text-xs font-semibold">
            {getInitials(partnerName)}
          </AvatarFallback>
        </Avatar>
      )}
      {!isUser && !showAvatar && <div className="w-8 flex-shrink-0" />}

      {/* Message bubble */}
      <div className={cn(
        "flex flex-col gap-0.5",
        "max-w-[75%] sm:max-w-[70%] md:max-w-[60%]"
      )}>
        <div className={cn(
          "rounded-[20px] transition-all duration-200",
          isLongMessage ? "px-4 py-3" : "px-4 py-2.5",
          isUser
            ? "bg-gradient-to-r from-[#E13A96] via-[#E84FA7] to-[#EF65B8] text-white shadow-lg shadow-pink-500/20"
            : "bg-[#3D2652] text-white border border-[#4D3662]/50",
          isUser ? "rounded-br-md" : "rounded-bl-md"
        )}>
          <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
            {content}
          </p>
        </div>
        
        {/* Time and status indicators - shown below bubble */}
        <div className={cn(
          "flex items-center gap-1.5 px-2",
          isUser ? "justify-end" : "justify-start"
        )}>
          <span className="text-[11px] text-gray-500">
            {formattedTime}
          </span>
          
          {isUser && (
            <div className="flex items-center">
              {isSent && <span className="text-[10px] text-gray-500">✓</span>}
              {isDelivered && <span className="text-[10px] text-gray-500">✓✓</span>}
              {isRead && <span className="text-[10px] text-blue-400">✓✓</span>}
            </div>
          )}
        </div>
      </div>

      {/* Spacer for user messages to align with avatar space */}
      {isUser && <div className="w-8 flex-shrink-0" />}
    </div>
  );
};
