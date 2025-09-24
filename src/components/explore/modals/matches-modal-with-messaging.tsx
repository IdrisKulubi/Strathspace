'use client'

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageCircle, 
  Heart, 
  Clock, 
  X,
  ArrowRight,
  User
} from "lucide-react";
import { Profile } from "@/db/schema";
import { useToast } from "@/hooks/use-toast";
import { getMatchesForMessaging, getConversationStats } from "@/lib/actions/match-messaging.actions";
import { MatchToMessageNav } from "@/components/messaging/match-to-message-nav";
import { cn } from "@/lib/utils";

interface MatchWithMessaging {
  matchId: string;
  partner: {
    id: string;
    name: string;
    image?: string | null;
    firstName?: string;
    lastName?: string;
    profilePhoto?: string | null;
    anonymous?: boolean;
    anonymousAvatar?: string | null;
  };
  hasMessages: boolean;
  lastMessageAt?: Date;
  createdAt: Date;
}

interface MatchesModalWithMessagingProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { id: string; image: string; name: string };
}

/**
 * Enhanced matches modal with messaging integration
 * Shows matches and provides direct navigation to messaging
 */
export function MatchesModalWithMessaging({
  isOpen,
  onClose,
  currentUser
}: MatchesModalWithMessagingProps) {
  const [matches, setMatches] = useState<MatchWithMessaging[]>([]);
  const [conversationStats, setConversationStats] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadMatches = async () => {
    setIsLoading(true);
    try {
      const result = await getMatchesForMessaging();
      
      if (result.success) {
        setMatches(result.data);
        
        // Load conversation stats for matches with messages
        const matchesWithMessages = result.data.filter(match => match.hasMessages);
        const statsPromises = matchesWithMessages.map(async (match) => {
          const statsResult = await getConversationStats(match.matchId);
          return {
            matchId: match.matchId,
            stats: statsResult.success ? statsResult.data : null
          };
        });

        const statsResults = await Promise.all(statsPromises);
        const newStats: Record<string, any> = {};
        
        statsResults.forEach(({ matchId, stats }) => {
          if (stats) {
            newStats[matchId] = stats;
          }
        });
        
        setConversationStats(newStats);
      } else {
        throw new Error(result.error || "Failed to load matches");
      }
    } catch (error) {
      console.error("Error loading matches:", error);
      toast({
        title: "Unable to load matches",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMatches();
    }
  }, [isOpen]);

  const getPartnerDisplayName = (partner: MatchWithMessaging['partner']) => {
    if (partner.anonymous) {
      return "Anonymous User";
    }
    return partner.firstName || partner.name;
  };

  const getPartnerImage = (partner: MatchWithMessaging['partner']) => {
    if (partner.anonymous) {
      return partner.anonymousAvatar 
        ? `/avatars/${partner.anonymousAvatar}.svg`
        : null;
    }
    return partner.profilePhoto || partner.image;
  };

  const activeConversations = matches.filter(match => match.hasMessages);
  const newMatches = matches.filter(match => !match.hasMessages);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Your Matches
            {!isLoading && (
              <Badge variant="secondary" className="ml-auto">
                {matches.length}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {isLoading ? (
            <MatchesLoadingSkeleton />
          ) : matches.length === 0 ? (
            <EmptyMatchesState />
          ) : (
            <>
              {/* Active Conversations */}
              {activeConversations.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <MessageCircle className="h-4 w-4 text-blue-500" />
                    Active Conversations
                    <Badge variant="outline" className="text-xs">
                      {activeConversations.length}
                    </Badge>
                  </div>
                  
                  {activeConversations.map((match) => {
                    const stats = conversationStats[match.matchId];
                    const partnerName = getPartnerDisplayName(match.partner);
                    const partnerImage = getPartnerImage(match.partner);

                    return (
                      <MatchCard
                        key={match.matchId}
                        match={match}
                        partnerName={partnerName}
                        partnerImage={partnerImage}
                        stats={stats}
                        onClose={onClose}
                        type="conversation"
                      />
                    );
                  })}
                </div>
              )}

              {/* New Matches */}
              {newMatches.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Heart className="h-4 w-4 text-pink-500" />
                    New Matches
                    <Badge variant="outline" className="text-xs">
                      {newMatches.length}
                    </Badge>
                  </div>
                  
                  {newMatches.map((match) => {
                    const partnerName = getPartnerDisplayName(match.partner);
                    const partnerImage = getPartnerImage(match.partner);

                    return (
                      <MatchCard
                        key={match.matchId}
                        match={match}
                        partnerName={partnerName}
                        partnerImage={partnerImage}
                        onClose={onClose}
                        type="new"
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!isLoading && matches.length > 0 && (
          <div className="flex-shrink-0 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button 
              onClick={() => {
                onClose();
                window.location.href = '/chat';
              }}
              variant="outline"
              className="w-full gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              View All Chats
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Individual match card component
 */
function MatchCard({
  match,
  partnerName,
  partnerImage,
  stats,
  onClose,
  type
}: {
  match: MatchWithMessaging;
  partnerName: string;
  partnerImage: string | null;
  stats?: any;
  onClose: () => void;
  type: 'conversation' | 'new';
}) {
  return (
    <MatchToMessageNav
      matchId={match.matchId}
      partnerName={partnerName}
      hasMessages={match.hasMessages}
      className={cn(
        "block w-full p-3 rounded-lg border transition-all duration-200 hover:shadow-md",
        type === 'conversation' 
          ? "border-blue-200 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20"
          : "border-pink-200 hover:border-pink-300 hover:bg-pink-50 dark:hover:bg-pink-950/20"
      )}
    >
      <div onClick={onClose}>
        <div className="flex items-center gap-3">
          {/* Partner Avatar */}
          <div className="relative flex-shrink-0">
            {partnerImage ? (
              <img
                src={partnerImage}
                alt={partnerName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold",
                match.partner.anonymous 
                  ? "bg-gradient-to-br from-purple-500 to-pink-500"
                  : "bg-gradient-to-br from-blue-500 to-purple-500"
              )}>
                {match.partner.anonymous ? (
                  <User className="h-6 w-6" />
                ) : (
                  partnerName.charAt(0).toUpperCase()
                )}
              </div>
            )}
            
            {/* Status indicator */}
            <div className={cn(
              "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center",
              type === 'conversation' ? "bg-blue-500" : "bg-pink-500"
            )}>
              {type === 'conversation' ? (
                <MessageCircle className="h-3 w-3 text-white" />
              ) : (
                <Heart className="h-3 w-3 text-white" />
              )}
            </div>
          </div>

          {/* Partner Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {partnerName}
            </h3>
            
            {type === 'conversation' ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                {stats && (
                  <>
                    <span>{stats.messageCount} message{stats.messageCount !== 1 ? 's' : ''}</span>
                    {stats.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                        {stats.unreadCount} new
                      </Badge>
                    )}
                  </>
                )}
                {match.lastMessageAt && (
                  <span className="text-xs">
                    {new Date(match.lastMessageAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <Clock className="h-3 w-3" />
                <span>Matched {new Date(match.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Action indicator */}
          <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
        </div>
      </div>
    </MatchToMessageNav>
  );
}

/**
 * Loading skeleton
 */
function MatchesLoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-4 w-4" />
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state
 */
function EmptyMatchesState() {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
        <Heart className="h-8 w-8 text-gray-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        No matches yet
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
        Start swiping to find your perfect match!
      </p>
      
      <Button 
        onClick={() => window.location.href = '/explore'}
        size="sm"
        className="gap-2"
      >
        <Heart className="h-4 w-4" />
        Start Exploring
      </Button>
    </div>
  );
}