"use client";

import { useCachedMessaging } from "@/hooks/use-cached-messaging";
import { VirtualMessageList } from "@/components/messaging/virtual-message-list";
import { MessageInput } from "@/components/messaging/message-input";
import { performanceMonitor, MemoryMonitor } from "@/lib/messaging/performance";
import { messageCache } from "@/lib/messaging/cache";
import { type Profile } from "@/db/schema";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RevealRequestButton } from "@/components/anonymous/RevealRequestButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Wifi, WifiOff, Users, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { markConversationAsRead } from "@/lib/actions/messaging.actions";

interface ChatWindowProps {
  matchId: string;
  partner: Profile;
  currentUserProfile: Profile | null;
  onClose?: () => void;
}

export const ChatWindow = ({ matchId, onClose, partner, currentUserProfile }: ChatWindowProps) => {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isInChatPage = pathname?.startsWith('/chat/');
  
  const [performanceStats, setPerformanceStats] = useState<any>(null);

  // Use the new optimized messaging system with caching and offline support
  const {
    messages,
    isLoading,
    isSending,
    isOnline,
    error,
    sendMessage,
    retryMessage,
    getCacheStats,
    clearCache
  } = useCachedMessaging({
    matchId,
    enabled: true,
    pollingInterval: 4000,
    retryInterval: 5000,
    maxRetries: 3
  });

  // Performance monitoring and memory tracking
  useEffect(() => {
    console.log('🚀 NEW OPTIMIZED MESSAGING SYSTEM ACTIVE:', {
      matchId,
      partnerName: partner?.firstName || partner?.name,
      messageCount: messages.length,
      isOnline,
      hasOfflineSupport: true,
      hasVirtualScrolling: true,
      hasPerformanceMonitoring: true,
      cacheStats: getCacheStats()
    });

    // Start memory monitoring
    const stopMemoryMonitoring = MemoryMonitor.startMonitoring(30000);
    
    // Record performance metrics
    performanceMonitor.recordQuery({
      operation: 'optimized-chat-window-mount',
      duration: performance.now(),
      timestamp: Date.now(),
      success: true,
      metadata: { 
        matchId, 
        messageCount: messages.length,
        partnerName: partner?.firstName || partner?.name,
        isOnline
      }
    });

    // Update performance stats periodically
    const statsInterval = setInterval(() => {
      const stats = performanceMonitor.getStats();
      const memoryStats = MemoryMonitor.getMemoryStats();
      setPerformanceStats({ ...stats, memory: memoryStats });
    }, 10000);

    return () => {
      stopMemoryMonitoring();
      clearInterval(statsInterval);
    };
  }, [matchId, messages.length, partner, isOnline, getCacheStats]);

  // Mark messages as read when conversation is viewed
  useEffect(() => {
    if (session?.user?.id && matchId && messages.length > 0) {
      const markAsRead = async () => {
        try {
          await markConversationAsRead(matchId);
          console.log('📖 Messages marked as read for match:', matchId);
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      };
      
      // Debounce the mark as read call
      const timer = setTimeout(markAsRead, 1000);
      return () => clearTimeout(timer);
    }
  }, [matchId, session?.user?.id, messages.length]);

  const partnerName = partner?.firstName || partner?.name || "this person";
  const matchDate = partner?.createdAt ? new Date(partner.createdAt).toLocaleDateString() : "recently";

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (isInChatPage) {
      router.push('/explore');
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !session?.user?.id) return;
    
    console.log('📤 Sending message with new system:', { content: content.substring(0, 50) + '...', isOnline });
    
    const success = await sendMessage(matchId, content);
    
    if (!success && !isOnline) {
      console.log('📱 Message queued for offline sending');
    }
  };

  const handleRetry = async (messageId?: string) => {
    if (messageId) {
      console.log('🔄 Retrying message:', messageId);
      await retryMessage(messageId);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Enhanced Chat Header with Performance Indicators */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClose}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <div>
              <h3 className="font-semibold text-lg">{partnerName}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Matched {matchDate}</span>
                <Badge variant={isOnline ? "default" : "secondary"} className="text-xs">
                  {isOnline ? (
                    <>
                      <Wifi className="h-3 w-3 mr-1" />
                      Online
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3 mr-1" />
                      Offline
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <MessageCircle className="h-3 w-3 mr-1" />
            {messages.length}
          </Badge>
          
          {performanceStats && (
            <Badge variant="outline" className="text-xs">
              {Math.round(performanceStats.averageQueryTime)}ms avg
            </Badge>
          )}
        </div>
      </div>

      {/* Match Info */}
      <div className="px-4 py-2 text-sm text-muted-foreground text-center border-b bg-muted/30">
        <div className="flex items-center justify-center gap-2">
          <Users className="h-4 w-4" />
          <span>You matched with {partnerName} on {matchDate}</span>
        </div>
      </div>
      
      {/* Anonymous Mode Notice */}
      {currentUserProfile?.anonymous && partner?.anonymous && (
        <div className="p-4 border-b text-center bg-muted/50">
          <p className="text-sm text-muted-foreground mb-2">
            You are both in Anonymous Mode. Choose to reveal your profiles?
          </p>
          <RevealRequestButton 
            matchId={matchId} 
            hasRequested={currentUserProfile?.anonymousRevealRequested ?? false}
          />
        </div>
      )}

      {/* Virtual Message List with Performance Optimization */}
      <VirtualMessageList
        matchId={matchId}
        currentUserId={session?.user?.id || ""}
        height={window.innerHeight - 200} // Dynamic height
        itemHeight={80}
        pageSize={100}
        onRetry={handleRetry}
        onMessagesLoaded={(msgs, isLoadingMore) => {
          console.log('📨 Messages loaded with virtual scrolling:', { 
            count: msgs.length, 
            isLoadingMore,
            cacheHit: getCacheStats().messageCount > 0
          });
        }}
        className="flex-1"
      />

      {/* Enhanced Message Input with Status */}
      <div className="border-t bg-card">
        <div className="p-4">
          <MessageInput
            onSend={handleSendMessage}
            disabled={isSending}
            placeholder={
              isOnline 
                ? "Type a message..." 
                : "Offline - message will be sent when online"
            }
            className={cn(
              "transition-all duration-200",
              !isOnline && "bg-muted/50"
            )}
          />
          
          {/* Status Bar */}
          <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className={cn(
                "flex items-center gap-1",
                isOnline ? "text-green-600" : "text-orange-600"
              )}>
                {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isOnline ? "Connected" : "Offline"}
              </span>
              
              {isSending && (
                <span className="text-blue-600 animate-pulse">Sending...</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span>{messages.length} messages</span>
              
              {getCacheStats().messageCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {getCacheStats().messageCount} cached
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Display with Retry */}
      {error && (
        <div className="p-3 bg-destructive/10 border-t border-destructive/20">
          <div className="flex items-center justify-between">
            <span className="text-destructive text-sm">{error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
              className="text-xs"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Debug Panel (Development Only) */}
      {process.env.NODE_ENV === 'development' && performanceStats && (
        <div className="p-2 bg-muted/30 border-t text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Avg: {Math.round(performanceStats.averageQueryTime)}ms</span>
            <span>Cache: {getCacheStats().messageCount} msgs</span>
            <span>Memory: {performanceStats.memory?.current ? Math.round(performanceStats.memory.current / 1024 / 1024) + 'MB' : 'N/A'}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearCache}
              className="text-xs h-auto p-1"
            >
              Clear Cache
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
