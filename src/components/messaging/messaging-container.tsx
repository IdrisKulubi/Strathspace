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
        <div className="hidden md:flex h-full w-full bg-[#2B1A3D]">
          {/* Conversation List */}
          <motion.div
            className="w-[380px] border-r border-[#3D2652]/50 bg-[#2B1A3D]"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
          >
            <div className="h-full flex flex-col">
              <div className="px-4 pt-5 pb-3 border-b border-[#3D2652]/50">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-pink-400">Strathspace</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshConversations}
                    disabled={isLoading}
                    className="text-gray-400 hover:text-white hover:bg-[#3D2652]"
                  >
                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <Suspense fallback={<div className="p-4 text-gray-400">Loading conversations...</div>}>
                  <ConversationList
                    conversations={conversations}
                    activeConversationId={activeConversationId}
                    onConversationSelect={handleConversationSelect}
                    isLoading={isLoading}
                  />
                </Suspense>
              </div>
            </div>
          </motion.div>

          {/* Message View */}
          <motion.div
            className="flex-1 flex flex-col bg-[#2B1A3D]"
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
                  className="h-full flex flex-col"
                >
                  {/* Chat Header */}
                  <div className="px-6 py-4 border-b border-[#3D2652]/50 bg-[#2B1A3D]">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="h-11 w-11 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-white">
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
                              className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-500 border-2 border-[#2B1A3D] rounded-full"
                            />
                          )}
                        </AnimatePresence>
                      </div>
                      
                      <div>
                        <h3 className="text-base font-semibold text-white">
                          {activeConversation.otherUser.name}
                        </h3>
                        <motion.p
                          className="text-sm"
                          animate={{
                            color: activeConversation.otherUser.isOnline 
                              ? "rgb(34 197 94)" 
                              : "rgb(156 163 175)"
                          }}
                        >
                          {activeConversation.otherUser.isOnline ? "Online" : "Offline"}
                        </motion.p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Messages Area */}
                  <div className="flex-1 overflow-hidden bg-[#1F1129]">
                    <Suspense fallback={<div className="p-4 text-gray-400">Loading messages...</div>}>
                      <MessageListContainer
                        matchId={activeConversation.matchId}
                        className="h-full"
                      />
                    </Suspense>
                  </div>
                  
                  {/* Message Input */}
                  <MessageInputContainer
                    matchId={activeConversation.matchId}
                    placeholder={`Type a message...`}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="empty-state"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="h-full flex items-center justify-center bg-[#1F1129]"
                >
                  <div className="text-center space-y-4 max-w-sm px-6">
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
                      <MessageCircle className="h-16 w-16 text-pink-500/50 mx-auto" />
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-medium text-white">Select a conversation</h3>
                      <p className="text-sm text-gray-400">
                        Choose a conversation from the list to start messaging
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden h-full w-full relative bg-[#2B1A3D]">
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
                <div className="h-full flex flex-col bg-[#2B1A3D]">
                  <div className="px-4 pt-5 pb-3 border-b border-[#3D2652]/50">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold text-pink-400">Strathspace</h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={refreshConversations}
                        disabled={isLoading}
                        className="text-gray-400 hover:text-white hover:bg-[#3D2652]"
                      >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <Suspense fallback={<div className="p-4 text-gray-400">Loading conversations...</div>}>
                      <ConversationList
                        conversations={conversations}
                        activeConversationId={activeConversationId}
                        onConversationSelect={handleConversationSelect}
                        isLoading={isLoading}
                      />
                    </Suspense>
                  </div>
                </div>
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
                <div className="h-full flex flex-col bg-[#2B1A3D]">
                  {/* Mobile Chat Header */}
                  <div className="px-4 py-3 border-b border-[#3D2652]/50 bg-[#2B1A3D]">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBackToList}
                        className="p-2 hover:bg-[#3D2652] text-white"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      
                      <div className="flex items-center gap-3 flex-1">
                        <div className="relative">
                          <div className="h-10 w-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-white">
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
                                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-[#2B1A3D] rounded-full"
                              />
                            )}
                          </AnimatePresence>
                        </div>
                        
                        <div>
                          <h3 className="text-base font-semibold text-white">
                            {activeConversation.otherUser.name}
                          </h3>
                          <p className="text-xs text-gray-400">
                            {activeConversation.otherUser.isOnline ? "Online" : "Offline"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Messages Area */}
                  <div className="flex-1 overflow-hidden bg-[#1F1129]">
                    <Suspense fallback={<div className="p-4 text-gray-400">Loading messages...</div>}>
                      <MessageListContainer
                        matchId={activeConversation.matchId}
                        className="h-full"
                      />
                    </Suspense>
                  </div>
                  
                  {/* Message Input */}
                  <MessageInputContainer
                    matchId={activeConversation.matchId}
                    placeholder={`Type a message...`}
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </MessagingErrorBoundary>
  );
}