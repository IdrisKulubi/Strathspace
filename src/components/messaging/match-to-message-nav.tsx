'use client'

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { navigateToMessaging } from "@/lib/actions/match-messaging.actions";
import { cn } from "@/lib/utils";

interface MatchToMessageNavProps {
  matchId: string;
  partnerName: string;
  hasMessages?: boolean;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  children?: React.ReactNode;
}

/**
 * Component that handles navigation from match view to messaging
 * Provides proper authorization checks and conversation initialization
 */
export function MatchToMessageNav({
  matchId,
  partnerName,
  hasMessages = false,
  className,
  variant = "default",
  size = "default",
  showIcon = true,
  children
}: MatchToMessageNavProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleNavigateToMessaging = async () => {
    if (isNavigating) return;

    setIsNavigating(true);

    try {
      const result = await navigateToMessaging(matchId);

      if (result.success) {
        // Navigate to the conversation with source parameter for proper back navigation
        const redirectPath = result.data.redirectPath;
        // Add source=matches query param to indicate we came from matches modal
        const pathWithSource = redirectPath.includes('?') 
          ? `${redirectPath}&source=matches`
          : `${redirectPath}?source=matches`;
        router.push(pathWithSource);
        
        // Show success toast
        toast({
          title: hasMessages ? "Opening conversation" : "Starting conversation",
          description: hasMessages 
            ? `Continuing your chat with ${partnerName}`
            : `You can now message ${partnerName}`,
          className: "bg-gradient-to-r from-blue-500 to-purple-500 text-white border-none",
        });
      } else {
        throw new Error(result.error || "Failed to open conversation");
      }
    } catch (error) {
      console.error("Error navigating to messaging:", error);
      
      toast({
        title: "Unable to open conversation",
        description: error instanceof Error 
          ? error.message 
          : "Please try again in a moment",
        variant: "destructive",
      });
    } finally {
      setIsNavigating(false);
    }
  };

  // If children are provided, render them as the clickable element
  if (children) {
    return (
      <div 
        onClick={handleNavigateToMessaging}
        className={cn(
          "cursor-pointer transition-opacity",
          isNavigating && "opacity-50 pointer-events-none",
          className
        )}
      >
        {children}
      </div>
    );
  }

  // Default button rendering
  return (
    <Button
      onClick={handleNavigateToMessaging}
      disabled={isNavigating}
      variant={variant}
      size={size}
      className={cn(
        "transition-all duration-200",
        variant === "default" && "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600",
        className
      )}
    >
      {isNavigating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          {showIcon && <MessageCircle className="h-4 w-4" />}
          <span className="ml-2">
            {hasMessages ? "Continue Chat" : "Start Chat"}
          </span>
          <ArrowRight className="h-4 w-4 ml-1" />
        </>
      )}
    </Button>
  );
}

/**
 * Simplified version for quick message button
 */
export function QuickMessageButton({
  matchId,
  partnerName,
  hasMessages = false,
  className
}: {
  matchId: string;
  partnerName: string;
  hasMessages?: boolean;
  className?: string;
}) {
  return (
    <MatchToMessageNav
      matchId={matchId}
      partnerName={partnerName}
      hasMessages={hasMessages}
      variant="outline"
      size="sm"
      className={cn(
        "rounded-full border-blue-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20",
        className
      )}
    >
      <MessageCircle className="h-4 w-4 text-blue-500" />
    </MatchToMessageNav>
  );
}

/**
 * Message card component for match lists
 */
export function MessageCard({
  matchId,
  partnerName,
  partnerImage,
  hasMessages = false,
  lastMessageAt,
  className
}: {
  matchId: string;
  partnerName: string;
  partnerImage?: string | null;
  hasMessages?: boolean;
  lastMessageAt?: Date;
  className?: string;
}) {
  return (
    <MatchToMessageNav
      matchId={matchId}
      partnerName={partnerName}
      hasMessages={hasMessages}
      className={cn(
        "block w-full p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* Partner Avatar */}
        <div className="relative">
          {partnerImage ? (
            <img
              src={partnerImage}
              alt={partnerName}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
              {partnerName.charAt(0).toUpperCase()}
            </div>
          )}
          
          {/* Message indicator */}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <MessageCircle className="h-3 w-3 text-white" />
          </div>
        </div>

        {/* Partner Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {partnerName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {hasMessages 
              ? lastMessageAt 
                ? `Last message ${new Date(lastMessageAt).toLocaleDateString()}`
                : "Continue your conversation"
              : "Start your first message"
            }
          </p>
        </div>

        {/* Arrow indicator */}
        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
      </div>
    </MatchToMessageNav>
  );
}