"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useErrorRecovery } from "@/hooks/use-error-recovery";
import { useOfflineQueue } from "@/lib/utils/offline-queue";
import { CompactErrorRecovery, NetworkStatusIndicator } from "./error-recovery";
import { toast } from "@/hooks/use-toast";
import type { MessageInputProps } from "@/lib/messaging/types";

interface EnhancedMessageInputProps extends Omit<MessageInputProps, 'onSend'> {
  matchId: string;
  onSend: (content: string) => Promise<void>;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

/**
 * Enhanced MessageInput with comprehensive error handling, retry mechanisms,
 * and offline queue support
 */
export function EnhancedMessageInput({
  matchId,
  onSend,
  onTyping,
  disabled = false,
  placeholder = "Type a message...",
  maxLength = 1000,
}: EnhancedMessageInputProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Error recovery and offline queue
  const { state: errorState, actions: errorActions } = useErrorRecovery({
    showToasts: true,
    useOfflineQueue: true,
    onRecovery: (attempts) => {
      toast({
        title: "Message sent",
        description: attempts > 1 ? `Delivered after ${attempts} attempts` : "Message delivered successfully",
        variant: "default"
      });
    },
    onPermanentFailure: (error) => {
      toast({
        title: "Failed to send message",
        description: "Message has been queued and will be sent when connection is restored",
        variant: "destructive"
      });
    }
  });

  const offlineQueue = useOfflineQueue();

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-resize textarea based on content
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 40), 120);
    textarea.style.height = `${newHeight}px`;
  };

  // Handle content changes with typing indicator
  const handleContentChange = (value: string) => {
    if (value.length > maxLength) {
      value = value.slice(0, maxLength);
    }
    
    setContent(value);
    
    // Handle typing indicator
    if (onTyping) {
      onTyping(true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  // Enhanced message sending with error handling and offline support
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const trimmedContent = content.trim();
    if (!trimmedContent || isSending || disabled) return;

    setIsSending(true);
    
    try {
      if (isOnline) {
        // Online - attempt to send with retry logic
        await errorActions.executeWithRetry(
          async () => {
            await onSend(trimmedContent);
          },
          `Send message in match ${matchId}`
        );
      } else {
        // Offline - queue the message
        const messageId = offlineQueue.enqueueMessage(matchId, trimmedContent);
        
        toast({
          title: "Message queued",
          description: "Message will be sent when connection is restored",
          variant: "default"
        });
      }

      // Clear input on success or when queued
      setContent("");
      
      // Stop typing indicator
      if (onTyping) {
        onTyping(false);
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

    } catch (error) {
      console.error("Failed to send message:", error);
      
      // If online send failed, offer to queue the message
      if (isOnline) {
        const shouldQueue = await new Promise<boolean>((resolve) => {
          toast({
            title: "Send failed",
            description: "Would you like to queue this message for later?",
            variant: "destructive",
            action: (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolve(true)}
                >
                  Queue
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => resolve(false)}
                >
                  Cancel
                </Button>
              </div>
            )
          });
        });

        if (shouldQueue) {
          offlineQueue.enqueueMessage(matchId, trimmedContent);
          setContent("");
          
          toast({
            title: "Message queued",
            description: "Message will be sent when possible",
            variant: "default"
          });
        }
      }
    } finally {
      setIsSending(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  const isOverLimit = content.length > maxLength * 0.9;
  const canSend = content.trim().length > 0 && !isSending && !disabled;
  const queuedMessages = offlineQueue.getQueuedMessagesForMatch(matchId);

  return (
    <div className="space-y-2">
      {/* Network status indicator */}
      <NetworkStatusIndicator />

      {/* Error recovery component */}
      {errorState.error && (
        <CompactErrorRecovery
          onRetry={errorActions.retry}
          error={errorActions.getErrorMessage()}
        />
      )}

      {/* Queued messages indicator */}
      {queuedMessages.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-1">
            <WifiOff className="h-3 w-3 text-blue-600" />
            <span className="text-xs font-medium text-blue-800 dark:text-blue-200">
              {queuedMessages.length} message{queuedMessages.length !== 1 ? 's' : ''} queued
            </span>
          </div>
        </div>
      )}

      {/* Input form */}
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
                  content.length >= maxLength && "border-red-300 focus:border-red-400",
                  !isOnline && "border-dashed border-orange-300"
                )}
                style={{ height: "40px" }}
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
              ) : errorState.error ? (
                <AlertTriangle className="h-4 w-4" />
              ) : !isOnline ? (
                <WifiOff className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* Helper text */}
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Press Enter to send, Shift+Enter for new line</span>
              {!isOnline && (
                <Badge variant="outline" className="text-xs">
                  Offline mode
                </Badge>
              )}
            </div>
            
            {content.length >= maxLength && (
              <span className="text-red-500 font-medium">
                Character limit reached
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}