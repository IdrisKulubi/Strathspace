"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessageInputProps } from "@/lib/messaging/types";

/**
 * MessageInput component with auto-resize textarea and send functionality
 * Supports typing indicators, character limits, and keyboard shortcuts
 */
export function MessageInput({
  onSend,
  onTyping,
  disabled = false,
  placeholder = "Type a message...",
  maxLength = 1000,
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
    <div className="border-t bg-background p-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isSending}
              className={cn(
                "min-h-[40px] max-h-[120px] resize-none rounded-2xl border-2 transition-colors",
                "focus:border-primary/50 focus:ring-1 focus:ring-primary/20",
                isOverLimit && "border-orange-300 focus:border-orange-400",
                content.length >= maxLength && "border-red-300 focus:border-red-400"
              )}
              style={{ height: "40px" }} // Initial height
            />
            
            {/* Character count indicator */}
            {content.length > maxLength * 0.8 && (
              <div className="absolute bottom-2 right-2">
                <Badge
                  variant={isOverLimit ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {content.length}/{maxLength}
                </Badge>
              </div>
            )}
          </div>
          
          <Button
            type="submit"
            disabled={!canSend}
            className={cn(
              "rounded-2xl h-10 w-10 p-0 transition-all duration-200",
              canSend
                ? "bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
                : "bg-muted"
            )}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Helper text */}
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>Press Enter to send, Shift+Enter for new line</span>
          {content.length >= maxLength && (
            <span className="text-red-500 font-medium">
              Character limit reached
            </span>
          )}
        </div>
      </form>
    </div>
  );
}