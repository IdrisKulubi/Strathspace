'use client'

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageCircle, 
  Heart, 
  Clock, 
  Users, 
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getMatchesForMessaging, getConversationStats } from "@/lib/actions/match-messaging.actions";
import { MatchToMessageNav, MessageCard } from "./match-to-message-nav";
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

interface ConversationStats {
  messageCount: number;
  lastMessageAt?: Date;
  unreadCount: number;
  partnerName: string;
}

/**
 * Component that displays matches with messaging integration
 * Shows conversation status and provides navigation to messaging
 */
export function MatchesWithMessaging() {
  const [matches, setMatches] = useState<MatchWithMessaging[]>([]);
  const [conversationStats, setConversationStats] = useState<Record<string, ConversationStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const loadMatches = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

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
        const newStats: Record<string, ConversationStats> = {};
        
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
        description: "Please try refreshing the page",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  const handleRefresh = () => {
    loadMatches(true);
  };

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

  // Separate matches into categories
  const activeConversations = matches.filter(match => match.hasMessages);
  const newMatches = matches.filter(match => !match.hasMessages);

  if (isLoading) {
    return <MatchesLoadingSkeleton />;
  }

  if (matches.length === 0) {
    return <EmptyMatchesState />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Your Matches
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {matches.length} match{matches.length !== 1 ? 'es' : ''} • {activeConversations.length} active conversation{activeConversations.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Active Conversations */}
      {activeConversations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-500" />
              Active Conversations
              <Badge variant="secondary" className="ml-auto">
                {activeConversations.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeConversations.map((match) => {
              const stats = conversationStats[match.matchId];
              const partnerName = getPartnerDisplayName(match.partner);
              const partnerImage = getPartnerImage(match.partner);

              return (
                <div key={match.matchId} className="relative">
                  <MessageCard
                    matchId={match.matchId}
                    partnerName={partnerName}
                    partnerImage={partnerImage}
                    hasMessages={true}
                    lastMessageAt={match.lastMessageAt}
                    className="hover:bg-blue-50 dark:hover:bg-blue-950/20"
                  />
                  
                  {/* Unread indicator */}
                  {stats && stats.unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute top-2 right-2 animate-pulse"
                    >
                      {stats.unreadCount}
                    </Badge>
                  )}
                  
                  {/* Message count */}
                  {stats && (
                    <div className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400">
                      {stats.messageCount} message{stats.messageCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* New Matches */}
      {newMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              New Matches
              <Badge variant="secondary" className="ml-auto">
                {newMatches.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {newMatches.map((match) => {
              const partnerName = getPartnerDisplayName(match.partner);
              const partnerImage = getPartnerImage(match.partner);

              return (
                <div key={match.matchId} className="relative">
                  <MessageCard
                    matchId={match.matchId}
                    partnerName={partnerName}
                    partnerImage={partnerImage}
                    hasMessages={false}
                    className="hover:bg-pink-50 dark:hover:bg-pink-950/20 border-pink-200 dark:border-pink-800"
                  />
                  
                  {/* New match indicator */}
                  <Badge 
                    variant="outline" 
                    className="absolute top-2 right-2 border-pink-300 text-pink-600 bg-pink-50 dark:bg-pink-950/20"
                  >
                    New
                  </Badge>
                  
                  {/* Match date */}
                  <div className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(match.createdAt).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Ready to start conversations?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click on any match to begin messaging
              </p>
            </div>
            <Button 
              onClick={() => window.location.href = '/chat'}
              variant="outline"
              className="gap-2 border-blue-300 hover:border-blue-500"
            >
              <MessageCircle className="h-4 w-4" />
              View All Chats
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Loading skeleton for matches
 */
function MatchesLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-9 w-20" />
      </div>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-lg border">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48 mt-2" />
              </div>
              <Skeleton className="h-5 w-5" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Empty state when no matches exist
 */
function EmptyMatchesState() {
  return (
    <Card className="text-center py-12">
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              No matches yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Start swiping to find your perfect match!
            </p>
          </div>
          
          <Button 
            onClick={() => window.location.href = '/explore'}
            className="gap-2"
          >
            <Heart className="h-4 w-4" />
            Start Exploring
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}