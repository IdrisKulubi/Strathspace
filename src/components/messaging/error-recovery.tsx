"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  MessageSquare,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOfflineQueue } from "@/lib/utils/offline-queue";
import { toast } from "@/hooks/use-toast";

interface ErrorRecoveryProps {
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Error recovery component that shows network status, offline queue,
 * and provides retry functionality
 */
export function ErrorRecovery({ onRetry, onDismiss, className }: ErrorRecoveryProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  
  const offlineQueue = useOfflineQueue();
  const queueStatus = offlineQueue.getStatus();

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

  // Listen to offline queue events
  useEffect(() => {
    const handleMessageSent = () => {
      toast({
        title: "Message sent",
        description: "Queued message was successfully delivered",
        variant: "default"
      });
    };

    const handleMessageFailed = (data: { messageId: string; error: string }) => {
      toast({
        title: "Message failed",
        description: `Failed to send message: ${data.error}`,
        variant: "destructive"
      });
    };

    const handleOnlineEvent = () => {
      toast({
        title: "Connection restored",
        description: "Syncing queued messages...",
        variant: "default"
      });
    };

    offlineQueue.addEventListener('message-sent', handleMessageSent);
    offlineQueue.addEventListener('message-failed', handleMessageFailed);
    offlineQueue.addEventListener('online', handleOnlineEvent);

    return () => {
      offlineQueue.removeEventListener('message-sent', handleMessageSent);
      offlineQueue.removeEventListener('message-failed', handleMessageFailed);
      offlineQueue.removeEventListener('online', handleOnlineEvent);
    };
  }, [offlineQueue]);

  const handleRetry = async () => {
    if (isRetrying) return;

    setIsRetrying(true);
    setSyncProgress(0);

    try {
      if (onRetry) {
        await onRetry();
      }

      // Sync offline queue if there are messages
      if (queueStatus.queueSize > 0) {
        const result = await offlineQueue.syncAll();
        
        if (result.successful > 0) {
          toast({
            title: "Messages synced",
            description: `Successfully sent ${result.successful} queued messages`,
            variant: "default"
          });
        }

        if (result.failed > 0) {
          toast({
            title: "Some messages failed",
            description: `${result.failed} messages could not be sent`,
            variant: "destructive"
          });
        }
      }

      setSyncProgress(100);
    } catch (error) {
      console.error('Retry failed:', error);
      toast({
        title: "Retry failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsRetrying(false);
      setTimeout(() => setSyncProgress(0), 1000);
    }
  };

  const handleClearQueue = () => {
    offlineQueue.clear();
    toast({
      title: "Queue cleared",
      description: "All queued messages have been removed",
      variant: "default"
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn("w-full max-w-md mx-auto", className)}
    >
      <Card className="border-2 border-dashed">
        <CardContent className="p-6 space-y-4">
          {/* Header with network status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                {isOnline ? "Connected" : "Offline"}
              </span>
            </div>
            
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Queue status */}
          {queueStatus.queueSize > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Queued messages
                  </span>
                </div>
                <Badge variant="secondary">
                  {queueStatus.queueSize}
                </Badge>
              </div>

              {queueStatus.failedMessages > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-orange-600">
                    {queueStatus.failedMessages} failed
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Sync progress */}
          <AnimatePresence>
            {isRetrying && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Syncing messages...</span>
                </div>
                <Progress value={syncProgress} className="h-2" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex-1"
              variant={isOnline ? "default" : "secondary"}
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {isOnline ? "Retry & Sync" : "Retry"}
                </>
              )}
            </Button>

            {queueStatus.queueSize > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                Details
              </Button>
            )}
          </div>

          {/* Queue details */}
          <AnimatePresence>
            {showDetails && queueStatus.queueSize > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 pt-3 border-t"
              >
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total queued:</span>
                    <span>{queueStatus.queueSize}</span>
                  </div>
                  
                  {queueStatus.failedMessages > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Failed:</span>
                      <span className="text-red-600">{queueStatus.failedMessages}</span>
                    </div>
                  )}

                  {queueStatus.oldestMessage && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Oldest:</span>
                      <span className="text-xs">
                        {queueStatus.oldestMessage.toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearQueue}
                    className="flex-1 text-xs"
                  >
                    Clear Queue
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status indicators */}
          <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
            {isOnline ? (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-orange-500" />
                <span>Messages will sync when online</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Compact error recovery component for inline use
 */
export function CompactErrorRecovery({ 
  onRetry, 
  error, 
  className 
}: { 
  onRetry: () => void; 
  error: string; 
  className?: string; 
}) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isOnline] = useState(navigator.onLine);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("flex items-center gap-2 p-3 bg-muted/50 rounded-lg border", className)}
    >
      <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">Connection issue</p>
        <p className="text-xs text-muted-foreground truncate">{error}</p>
      </div>

      <div className="flex items-center gap-1">
        {!isOnline && (
          <WifiOff className="h-3 w-3 text-red-500" />
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          disabled={isRetrying}
          className="h-7 px-2 text-xs"
        >
          {isRetrying ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            "Retry"
          )}
        </Button>
      </div>
    </motion.div>
  );
}

/**
 * Network status indicator component
 */
export function NetworkStatusIndicator({ className }: { className?: string }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineToast, setShowOfflineToast] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineToast(false);
      toast({
        title: "Connection restored",
        description: "You're back online",
        variant: "default"
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineToast(true);
      toast({
        title: "Connection lost",
        description: "Messages will be queued until connection is restored",
        variant: "destructive"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null; // Don't show anything when online
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-2 px-3 py-2 bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg",
        className
      )}
    >
      <WifiOff className="h-4 w-4 text-orange-600" />
      <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
        Offline - Messages will be queued
      </span>
    </motion.div>
  );
}