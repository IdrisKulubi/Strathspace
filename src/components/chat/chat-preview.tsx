"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";
import { useMemo } from "react";

interface ChatPreviewProps {
  profile: {
    id: string;
    userId: string;
    firstName?: string;
    lastName?: string;
    profilePhoto: string | null;
    matchId: string;
    lastMessage: {
      content: string;
      createdAt: Date;
      isRead: boolean;
      senderId: string;
    };
  };
  currentUser: { id: string; image: string; name: string };
  onSelect: (matchId: string) => void;
  markAsRead: (matchId: string) => void;
  disableNavigation?: boolean;
  isActive?: boolean;
}

export function ChatPreview({ profile, currentUser, onSelect, markAsRead, disableNavigation = false, isActive = false }: ChatPreviewProps) {
  const hasUnread = !profile.lastMessage.isRead && 
                   profile.lastMessage.senderId !== currentUser.id;

  // Memoize the formatted time to prevent unnecessary re-renders
  const formattedTime = useMemo(() => {
    if (!profile.lastMessage?.createdAt) return '';
    return format(new Date(profile.lastMessage.createdAt), "HH:mm");
  }, [profile.lastMessage?.createdAt]);

  // Safely handle name display with fallbacks
  const displayName = useMemo(() => {
    if (profile.firstName && profile.lastName) {
      return `${profile.firstName} ${profile.lastName}`;
    }
    if (profile.firstName) {
      return profile.firstName;
    }
    return profile.userId || 'User';
  }, [profile.firstName, profile.lastName, profile.userId]);

  // Get initials for avatar fallback
  const initials = useMemo(() => {
    if (profile.firstName) {
      return profile.firstName[0]?.toUpperCase();
    }
    return profile.userId?.[0]?.toUpperCase() || 'U';
  }, [profile.firstName, profile.userId]);

  const handleClick = () => {
    if (hasUnread) {
      markAsRead(profile.matchId);
    }
    onSelect(profile.matchId);
  };

  return (
    <Button
      variant="ghost"
      className={cn("w-full h-auto p-4 rounded-none border-b border-border transition-colors", isActive ? "bg-accent/60 hover:bg-accent" : "hover:bg-accent/50")}
      onClick={handleClick}
    >
      {disableNavigation ? (
        <div className="flex items-center gap-4 w-full">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage 
              src={profile.profilePhoto || undefined}
              alt={displayName}
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 text-left">
            <div className="flex justify-between items-center mb-1.5">
              <p className="font-semibold truncate text-foreground">
                {displayName}
              </p>
              {profile.lastMessage && (
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {formattedTime}
                </span>
              )}
            </div>

            <p className={cn(
              "text-sm truncate",
              hasUnread 
                ? "text-foreground font-medium" 
                : "text-muted-foreground/80"
            )}>
              {profile.lastMessage?.content || 'No messages yet'}
            </p>
          </div>

          {hasUnread && (
            <div className="w-2.5 h-2.5 rounded-full bg-pink-500 dark:bg-pink-400 shrink-0 animate-pulse" />
          )}
        </div>
      ) : (
        <Link 
          href={`/chat/${profile.matchId}`}
          className="flex items-center gap-4 w-full"
          prefetch={true}
          replace={true}
        >
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage 
              src={profile.profilePhoto || undefined}
              alt={displayName}
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 text-left">
            <div className="flex justify-between items-center mb-1.5">
              <p className="font-semibold truncate text-foreground">
                {displayName}
              </p>
              {profile.lastMessage && (
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {formattedTime}
                </span>
              )}
            </div>

            <p className={cn(
              "text-sm truncate",
              hasUnread 
                ? "text-foreground font-medium" 
                : "text-muted-foreground/80"
            )}>
              {profile.lastMessage?.content || 'No messages yet'}
            </p>
          </div>

          {hasUnread && (
            <div className="w-2.5 h-2.5 rounded-full bg-pink-500 dark:bg-pink-400 shrink-0 animate-pulse" />
          )}
        </Link>
      )}
    </Button>
  );
} 