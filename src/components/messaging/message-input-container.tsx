"use client";

import { useState, useCallback } from "react";
import { MessageInput } from "./message-input";
import { sendMessageAction } from "@/lib/actions/messaging.actions";
import { useToast } from "@/hooks/use-toast";

interface MessageInputContainerProps {
  matchId: string;
  placeholder?: string;
  onMessageSent?: () => void;
}

/**
 * Container component that handles message sending for a specific conversation
 */
export function MessageInputContainer({ 
  matchId, 
  placeholder = "Type a message...",
  onMessageSent 
}: MessageInputContainerProps) {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  /**
   * Handle sending a message
   */
  const handleSend = useCallback(async (content: string) => {
    if (!content.trim() || isSending) return;

    setIsSending(true);
    
    try {
      const result = await sendMessageAction(matchId, content.trim());
      
      if (result.success) {
        // Message sent successfully
        onMessageSent?.();
        toast({
          title: "Message sent",
          description: "Your message has been delivered successfully.",
        });
      } else {
        // Handle error
        toast({
          title: "Failed to send message",
          description: result.error || "Please try again.",
          variant: "destructive",
        });
        throw new Error(result.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Failed to send message",
        description: "Please try again.",
        variant: "destructive",
      });
      throw error; // Re-throw so MessageInput can handle it
    } finally {
      setIsSending(false);
    }
  }, [matchId, isSending, onMessageSent]);

  /**
   * Handle typing indicator (placeholder for future implementation)
   */
  const handleTyping = useCallback((isTyping: boolean) => {
    // TODO: Implement typing indicators
    console.log("Typing:", isTyping);
  }, []);

  return (
    <MessageInput
      onSend={handleSend}
      onTyping={handleTyping}
      disabled={isSending}
      placeholder={placeholder}
      maxLength={1000}
    />
  );
}