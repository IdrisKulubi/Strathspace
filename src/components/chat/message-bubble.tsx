"use client";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Message } from "@/db/schema";


interface MessageBubbleProps {
  message: Message;
  isUser: boolean;
}

export const MessageBubble = ({ message, isUser }: MessageBubbleProps) => {
  const messageStatus = message?.status || "sent";
  const isSent = messageStatus === "sent";
  const isDelivered = messageStatus === "delivered";
  const isRead = messageStatus === "read";

  const content = message?.content || "";
  const contentLength = content.length;
  const isShortMessage = contentLength < 20;
  const isLongMessage = contentLength > 100;

  return (
    <div className={cn(
      "flex flex-col gap-1",
      "max-w-[85%] sm:max-w-[75%] md:max-w-[65%]", 
      isUser ? "ml-auto" : "mr-auto"
    )}>
      <div className={cn(
        "rounded-2xl transition-colors",
        isShortMessage 
          ? "px-2 py-1.5" 
          : isLongMessage 
            ? "p-2.5 sm:p-3" 
            : "px-2.5 py-2 sm:p-2.5",
        isShortMessage ? "text-sm" : isLongMessage ? "text-[0.925rem]" : "text-base",
        isShortMessage ? "w-fit" : "w-full",
        isUser
          ? "bg-gradient-to-r from-pink-500 to-rose-400 text-white"
          : "bg-secondary border border-border/50 text-foreground",
        isUser ? "rounded-br-sm" : "rounded-bl-sm"
      )}>
        <p className="break-words whitespace-pre-wrap">{content}</p>
        
        <div className={cn(
          "flex items-center gap-2",
          isShortMessage ? "mt-0" : "mt-1"
        )}>
          <span className={cn(
            "text-xs opacity-75",
            isUser ? "text-white/90" : "text-muted-foreground"
          )}>
            {format(new Date(message?.createdAt || new Date()), "HH:mm")}
          </span>
          
          {isUser && (
            <div className="flex items-center gap-0.5 text-[0.7rem]">
              {isSent && <span className="text-blue-300/80">✓</span>}
              {isDelivered && <span className="text-blue-300/80">✓✓</span>}
              {isRead && <span className="text-blue-600">✓✓</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
