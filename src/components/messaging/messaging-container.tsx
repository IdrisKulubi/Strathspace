"use client";

import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConversationList } from "./conversation-list";
import { MessageListContainer } from "./message-list-container";
import { MessageInputContainer } from "./message-input-container";
import { useConversationNavigation } from "@/hooks/use-conversation-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, MessageCircle, ArrowLeft, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessagingErrorBoundary, MessagingErrorFallback } from "./messaging-error-boundary";
import type { Conversation } from "@/lib/messaging/types";

interface MessagingContainerProps {
  className?: string;
}

// Animation variants for smooth transitions
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    x: direction < 0 ? "100%" : "-100%",
    opacity: 0
  })
};

// Loading skeleton component
function MessagingLoadingSkeleton() {
  return (
    <div className="h-full flex">
      <div className="w-full md:w-80 border-r">
        <Card className="h-full rounded-none border-0 md:border">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent className="p-2 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="flex-1 hidden md:flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    </div>
  );
}



/**
 * Main messaging container that integrates conversation list and message view
 * Handles conversation navigation and state management with responsive design
 * and smooth animations
 */
export function MessagingContainer({ className }: MessagingContainerProps) {
  const {
    conversations: rawConversations,
    activeConversationId,
    isLoading,
    error,
    selectConversation,
    refreshConversations,
  } = useConversationNavigation();

  // Convert ConversationPreview to Conversation type
  const conversations = rawConversations as Conversation[];

  const [isMobileConversationView, setIsMobileConversationView] = useState(false);
  const [slideDirection, setSlideDirection] = useState(0);

  // Find the active conversation
  const activeConversation = conversations.find(
    conv => conv.matchId === activeConversationId
  );

  const handleConversationSelect = (matchId: string) => {
    selectConversation(matchId);
    // On mobile, switch to conversation view with slide animation
    setSlideDirection(1);
    setIsMobileConversationView(true);
  };

  const handleBackToList = () => {
    setSlideDirection(-1);
    setIsMobileConversationView(false);
  };

  // Show loading skeleton while loading
  if (isLoading && conversations.length === 0) {
    return (
      <div className={cn("h-full", className)}>
        <MessagingLoadingSkeleton />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={cn("h-full", className)}>
        <MessagingErrorFallback error={error} onRetry={refreshConversations} />
      </div>
    );
  }

  return (
    <MessagingErrorBoundary>
      <motion.div
        className={cn("h-full flex relative overflow-hidden", className)}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Desktop Layout */}
        <div className="hidden md:flex h-full w-full">
          {/* Conversation List */}
          <motion.div
            className="w-80 border-r bg-background"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
          >
            <Card className="h-full rounded-none border-0">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Messages</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshConversations}
                    disabled={isLoading}
                  >
                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                <Suspense fallback={<div className="p-4">Loading conversations...</div>}>
                  <ConversationList
                    conversations={conversations}
                    activeConversationId={activeConversationId}
                    onConversationSelect={handleConversationSelect}
                    isLoading={isLoading}
                  />
                </Suspense>
              </CardContent>
            </Card>
          </motion.div>

          {/* Message View */}
          <motion.div
            className="flex-1 flex flex-col"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
          >
            <AnimatePresence mode="wait">
              {activeConversation ? (
                <motion.div
                  key={activeConversation.matchId}
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="h-full"
                >
                  <Card className="h-full rounded-none border-0">
                    <CardHeader className="pb-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="h-10 w-10 bg-gradient-to-br from-pink-100 to-rose-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-pink-700">
                              {activeConversation.otherUser.name
                                .split(" ")
                                .map(n => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </span>
                          </div>
                          <AnimatePresence>
                            {activeConversation.otherUser.isOnline && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-background rounded-full"
                              />
                            )}
                          </AnimatePresence>
                        </div>
                        
                        <div>
                          <CardTitle className="text-base">
                            {activeConversation.otherUser.name}
                          </CardTitle>
                          <motion.p
                            className="text-xs text-muted-foreground"
                            animate={{
                              color: activeConversation.otherUser.isOnline 
                                ? "rgb(34 197 94)" 
                                : "rgb(107 114 128)"
                            }}
                          >
                            {activeConversation.otherUser.isOnline ? "Online" : "Offline"}
                          </motion.p>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="flex-1 flex flex-col p-0">
                      <div className="flex-1 overflow-hidden">
                        <Suspense fallback={<div className="p-4">Loading messages...</div>}>
                          <MessageListContainer
                            matchId={activeConversation.matchId}
                            className="h-full"
                          />
                        </Suspense>
                      </div>
                      
                      <MessageInputContainer
                        matchId={activeConversation.matchId}
                        placeholder={`Message ${activeConversation.otherUser.name}...`}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="empty-state"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="h-full"
                >
                  <Card className="h-full rounded-none border-0">
                    <CardContent className="flex items-center justify-center h-full">
                      <div className="text-center space-y-4 max-w-sm">
                        <motion.div
                          animate={{ 
                            rotate: [0, 5, -5, 0],
                            scale: [1, 1.05, 1]
                          }}
                          transition={{ 
                            duration: 2,
                            repeat: Infinity,
                            repeatDelay: 3
                          }}
                        >
                          <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto" />
                        </motion.div>
                        <div>
                          <h3 className="text-lg font-medium">Select a conversation</h3>
                          <p className="text-sm text-muted-foreground">
                            Choose a conversation from the list to start messaging
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden h-full w-full relative">
          <AnimatePresence mode="wait" custom={slideDirection}>
            {!isMobileConversationView ? (
              <motion.div
                key="conversation-list"
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="absolute inset-0"
              >
                <Card className="h-full rounded-none border-0">
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Messages</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={refreshConversations}
                        disabled={isLoading}
                      >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex-1">
                    <Suspense fallback={<div className="p-4">Loading conversations...</div>}>
                      <ConversationList
                        conversations={conversations}
                        activeConversationId={activeConversationId}
                        onConversationSelect={handleConversationSelect}
                        isLoading={isLoading}
                      />
                    </Suspense>
                  </CardContent>
                </Card>
              </motion.div>
            ) : activeConversation ? (
              <motion.div
                key="conversation-view"
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="absolute inset-0"
              >
                <Card className="h-full rounded-none border-0">
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBackToList}
                        className="p-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="h-8 w-8 bg-gradient-to-br from-pink-100 to-rose-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-pink-700">
                              {activeConversation.otherUser.name
                                .split(" ")
                                .map(n => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </span>
                          </div>
                          <AnimatePresence>
                            {activeConversation.otherUser.isOnline && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-background rounded-full"
                              />
                            )}
                          </AnimatePresence>
                        </div>
                        
                        <div>
                          <CardTitle className="text-base">
                            {activeConversation.otherUser.name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {activeConversation.otherUser.isOnline ? "Online" : "Offline"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col p-0">
                    <div className="flex-1 overflow-hidden">
                      <Suspense fallback={<div className="p-4">Loading messages...</div>}>
                        <MessageListContainer
                          matchId={activeConversation.matchId}
                          className="h-full"
                        />
                      </Suspense>
                    </div>
                    
                    <MessageInputContainer
                      matchId={activeConversation.matchId}
                      placeholder={`Message ${activeConversation.otherUser.name}...`}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </MessagingErrorBoundary>
  );
}