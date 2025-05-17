import { useEffect, useState, useCallback, useRef } from "react";
import Pusher from "pusher-js";
import type { Message, Profile } from "@/db/schema";
import { getChatMessages, sendMessage } from "@/lib/actions/chat.actions";
import { useSession } from "next-auth/react";
import type { Channel } from "pusher-js";
import { toast } from "./use-toast";

type MessageWithSender = Message & {
  sender?: {
    id: string;
    name: string;
    image: string | null;
  };
};

// Helper to ensure unique IDs for messages
const ensureUniqueId = (message: Message): Message => {
  if (!message.id || message.id === '') {
    console.warn('Message with empty ID detected, assigning temporary ID', message);
    return {
      ...message,
      id: `auto-gen-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    };
  }
  return message;
};

export const useChat = (matchId: string, initialPartner: Profile) => {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [partner, setPartner] = useState<Profile>(initialPartner);
  const [isTyping, setIsTyping] = useState(false);
  const [channel, setChannel] = useState<Channel>();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef<boolean>(false);
  const messageIdsRef = useRef<Set<string>>(new Set<string>());
  const pusherRef = useRef<Pusher | null>(null);

  const handleNewMessage = useCallback((message: Message) => {
    // Ensure the new message has a unique ID
    const processedMessage = ensureUniqueId(message);
    
    setMessages(prev => {
      // Check if this message ID already exists in our list
      const exists = prev.some(m => m.id === processedMessage.id);
      if (exists) {
        console.warn(`Duplicate message detected, generating new ID for: ${processedMessage.id}`);
        const uniqueMessage = {
          ...processedMessage,
          id: `${processedMessage.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        };
        return [uniqueMessage as MessageWithSender, ...prev];
      }
      
      // Add to our tracking set
      messageIdsRef.current.add(processedMessage.id);
      return [processedMessage as MessageWithSender, ...prev];
    });
  }, []);

  const handleTypingEvent = useCallback(({ isTyping }: { isTyping: boolean }) => {
    setIsTyping(isTyping);
  }, []);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initChat = async () => {
      try {
        setIsLoading(true);
        const { messages: chatMessages } = await getChatMessages(matchId);
        
        // Ensure all loaded messages have unique IDs
        const uniqueMessages = chatMessages.map(ensureUniqueId);
        
        // Create a set of IDs for tracking
        const messageIds = new Set<string>();
        const processedMessages: MessageWithSender[] = [];
        
        // Process each message to ensure uniqueness
        uniqueMessages.forEach(msg => {
          if (messageIds.has(msg.id)) {
            // Generate a unique ID for the duplicate
            const uniqueId = `${msg.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            console.warn(`Duplicate message ID detected on load: ${msg.id}, assigning new ID: ${uniqueId}`);
            const uniqueMsg = { ...msg, id: uniqueId };
            processedMessages.push(uniqueMsg as MessageWithSender);
            messageIds.add(uniqueId);
          } else {
            messageIds.add(msg.id);
            processedMessages.push(msg as MessageWithSender);
          }
        });
        
        // Update our tracking ref
        messageIdsRef.current = messageIds;
        setMessages(processedMessages);
        
        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
          authEndpoint: "/api/pusher/auth",
        });
        
        pusherRef.current = pusher;

        const channel = pusher.subscribe(`match-${matchId}`);
        channel.bind("new-message", handleNewMessage);
        channel.bind("typing", handleTypingEvent);
        setChannel(channel);
      } catch (error) {
        console.error("Failed to load messages:", error);
      } finally {
        setIsLoading(false);
      }

      return () => {
        if (channel) {
          channel.unbind_all();
          pusherRef.current?.unsubscribe(`match-${matchId}`);
        }
      };
    };

    initChat();
  }, [matchId, handleNewMessage, handleTypingEvent,channel]);

  const handleSend = useCallback(
    async (content: string) => {
      if (!content.trim() || !session?.user) return;

      // Generate unique ID for temporary message
      const uniqueId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      const tempMessage: MessageWithSender = {
        id: uniqueId,
        content,
        matchId,
        senderId: session.user.id,
        status: "sent",
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: {
          id: session.user.id,
          name: session.user.name || "",
          image: session.user.image || null
        }
      };

      // Track this ID
      messageIdsRef.current.add(uniqueId);
      
      setMessages(prev => [...prev, tempMessage]);

      try {
        const { message } = await sendMessage(matchId, content, session.user.id);
        
        // Make sure the returned message has a unique ID
        const processedMessage = ensureUniqueId(message as Message);
        
        // Before updating, check if this new ID already exists
        if (messageIdsRef.current.has(processedMessage.id) && processedMessage.id !== tempMessage.id) {
          // Generate a new unique ID
          processedMessage.id = `${processedMessage.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        }
        
        // Update tracking
        messageIdsRef.current.delete(tempMessage.id);
        messageIdsRef.current.add(processedMessage.id);
        
        setMessages(prev =>
          prev.map(m => m.id === tempMessage.id ? 
            { ...processedMessage, sender: tempMessage.sender } as MessageWithSender : m
          )
        );
      } catch (error) {
        console.error("Failed to send message:", error);
        
        // Remove from tracking
        messageIdsRef.current.delete(tempMessage.id);
        
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        toast({
          title: "Failed to send message",
          description: "Please try again",
          variant: "destructive"
        });
      }
    },
    [matchId, session?.user]
  );

  const handleTyping = useCallback(async (isTyping: boolean) => {
    channel?.trigger("client-typing", { isTyping });
  }, [channel]);

  return {
    messages,
    partner,
    isTyping,
    handleSend,
    handleTyping,
    loadMoreMessages: () => {}, // Implement pagination
    isLoading
  };
}; 