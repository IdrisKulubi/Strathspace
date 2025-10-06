"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessageInputProps } from "@/lib/messaging/types";

/**
 * MessageInput component with auto-resize textarea and send functionality
 * Supports typing indicators, character limits, and keyboard shortcuts
 * Redesigned with dark purple theme and pink heart send button
 */
export function MessageInput({
  onSend,
  onTyping,
  disabled = false,
  placeholder = "Type a message...",
  maxLength = 2000,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea based on content
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";
    
    // Calculate new height (min 40px, max 120px for ~6 lines)
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 40), 120);
    textarea.style.height = `${newHeight}px`;
  };

  // Handle content changes
  const handleContentChange = (value: string) => {
    // Enforce character limit
    if (value.length > maxLength) {
      value = value.slice(0, maxLength);
    }
    
    setContent(value);
    
    // Handle typing indicator
    if (onTyping) {
      onTyping(true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  // Handle form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const trimmedContent = content.trim();
    if (!trimmedContent || isSending || disabled) return;

    setIsSending(true);
    
    try {
      await onSend(trimmedContent);
      setContent("");
      
      // Stop typing indicator
      if (onTyping) {
        onTyping(false);
      }
      
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize on content change
  useEffect(() => {
    adjustTextareaHeight();
  }, [content]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const isOverLimit = content.length > maxLength * 0.9; // Show warning at 90%
  const canSend = content.trim().length > 0 && !isSending && !disabled;

  return (
    <div className="bg-[#2B1A3D] border-t border-[#3D2652]/50 p-4">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3 items-end relative">
          {/* Message Input */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isSending}
              className={cn(
                "min-h-[48px] max-h-[120px] resize-none rounded-3xl transition-all duration-200",
                "bg-[#3D2652] border-[#4D3662] text-white placeholder:text-gray-400",
"focus:border-[#fb51c2]/50 focus:ring-2 focus:ring-[#fb51c2]/20",
                "focus-visible:ring-2 focus-visible:ring-[#fb51c2]/20 focus-visible:ring-offset-0",
                "px-5 py-3 text-[15px]",
                isOverLimit && "border-orange-400/50 focus:border-orange-400",
                content.length >= maxLength && "border-red-400/50 focus:border-red-400"
              )}
              style={{ height: "48px" }} // Initial height
            />
            
            {/* Character count indicator - only show when approaching limit */}
            {content.length > maxLength * 0.85 && (
              <div className="absolute bottom-3 right-4">
                <span
                  className={cn(
                    "text-xs font-medium",
                    isOverLimit ? "text-orange-400" : "text-gray-500",
                    content.length >= maxLength && "text-red-400"
                  )}
                >
                  {content.length}/{maxLength}
                </span>
              </div>
            )}
          </div>
          
          {/* Heart Send Button */}
          <Button
            type="submit"
            disabled={!canSend}
            size="icon"
            className={cn(
              "rounded-full h-12 w-12 flex-shrink-0 transition-all duration-300 border-0",
              "hover:scale-110 active:scale-95",
canSend
                ? "bg-gradient-to-br from-[#fb51c2] via-[#ff6cd4] to-[#ff88de] hover:from-[#e646b6] hover:via-[#ff63cf] hover:to-[#ff7dd9] shadow-lg shadow-pink-500/30"
                : "bg-[#3D2652] text-gray-600 cursor-not-allowed"
            )}
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <Heart 
                className={cn(
                  "h-5 w-5 transition-all duration-200",
                  canSend ? "text-white fill-white" : "text-gray-600"
                )} 
              />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
