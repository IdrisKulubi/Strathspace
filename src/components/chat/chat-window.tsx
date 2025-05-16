"use client";

import { useChat } from "@/hooks/use-chat";
import { MessageBubble } from "./message-bubble";
import { ChatHeader } from "./chat-header";
import { ChatInput } from "./chat-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import { type Profile } from "@/db/schema";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { useEffect, useRef } from "react";
import { markMessagesAsRead } from "@/lib/actions/chat.actions";
import { usePathname, useRouter } from "next/navigation";


interface ChatWindowProps {
  matchId: string;
  partner: Profile;
  onClose?: () => void;
}

export const ChatWindow = ({ matchId, onClose, partner }: ChatWindowProps) => {
  console.time('ChatWindow - initialization');
  const {
    messages,
    isTyping,
    handleSend,
    handleTyping,
    isLoading,
  } = useChat(matchId, partner);
  console.timeEnd('ChatWindow - initialization');

  const router = useRouter();
  const pathname = usePathname();
  const isInChatPage = pathname?.startsWith('/chat/');

  const { data: session } = useSession();
  const { markAsRead } = useUnreadMessages(session?.user.id ?? "");
  const markAsReadRef = useRef(markAsRead);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const hasMarkedReadRef = useRef(false);

  // Safely handle potentially undefined partner
  const partnerName = partner?.firstName || "this person";
  const matchDate = partner?.createdAt ? new Date(partner.createdAt).toLocaleDateString() : "recently";

  // Define a reliable close handler
  const handleClose = () => {
    if (onClose) {
      // Use provided onClose if available
      onClose();
    } else if (isInChatPage) {
      // Fallback to navigation if in a dedicated chat page
      router.push('/explore');
    }
  };

  useEffect(() => {
    markAsReadRef.current = markAsRead;
  }, [markAsRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current && messages.length > 0) {
      const scrollArea = scrollAreaRef.current;
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }, [messages.length]);

  // Fix for infinite update loop - only mark as read once when component mounts
  useEffect(() => {
    const markRead = async () => {
      if (hasMarkedReadRef.current || !session?.user?.id) return;
      
      try {
        console.time('ChatWindow - markAsRead');
        markAsReadRef.current(matchId);
        await markMessagesAsRead(matchId, session.user.id);
        hasMarkedReadRef.current = true;
        console.timeEnd('ChatWindow - markAsRead');
      } catch (error) {
        console.error('Error marking messages as read:', error);
        console.timeEnd('ChatWindow - markAsRead');
      }
    };

    markRead();
  }, [matchId, session]);

  // Prepare message lists for rendering
  const regularMessages = messages.slice(0, Math.max(0, messages.length - 5));
  const animatedMessages = messages.slice(Math.max(0, messages.length - 5));

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader 
        partner={partner}
        onClose={handleClose}
      />

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner className="h-8 w-8 text-pink-500" />
        </div>
      ) : (
        <>
          <div className="px-4 py-2 text-sm text-muted-foreground text-center border-b">
            You matched with {partnerName} on {matchDate}
          </div>
          
          <ScrollArea 
            className="flex-1 p-4"
            ref={scrollAreaRef}
          >
            <div className="flex flex-col space-y-4">
              {/* Only animate the last 5 messages for better performance */}
              {regularMessages.map((message) => (
                <div
                  key={`regular-${message.id}`}
                  className={cn(
                    "flex",
                    message.senderId === session?.user.id ? "justify-end" : "justify-start"
                  )}
                >
                  <MessageBubble 
                    message={message} 
                    isUser={message.senderId === session?.user.id}
                  />
                </div>
              ))}
              
              <AnimatePresence initial={false}>
                {animatedMessages.map((message) => (
                  <motion.div
                    key={`animated-${message.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "flex",
                      message.senderId === session?.user.id ? "justify-end" : "justify-start"
                    )}
                  >
                    <MessageBubble 
                      message={message} 
                      isUser={message.senderId === session?.user.id}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            {isTyping && (
              <div className="flex items-center gap-2 text-muted-foreground mt-4">
                <TypingIndicator />
                <span>{partnerName} is typing...</span>
              </div>
            )}
          </ScrollArea>

          <ChatInput 
            onSend={handleSend}
            onTyping={handleTyping}
          />
          
          {!isInChatPage && (
            <div className="flex justify-center gap-4 py-4 border-t">
              <button className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <button className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </button>
              <button className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const TypingIndicator = () => {
  // Create a stable array to avoid regenerating on each render
  const dots = [
    { id: 'typing-dot-1', delay: '0s' },
    { id: 'typing-dot-2', delay: '0.2s' },
    { id: 'typing-dot-3', delay: '0.4s' }
  ];
  
  return (
    <div className="flex space-x-1">
      {dots.map(dot => (
        <div
          key={dot.id}
          className="w-2 h-2 bg-primary rounded-full animate-bounce"
          style={{ animationDelay: dot.delay }}
        />
      ))}
    </div>
  );
};
