import { useEffect, useState, useCallback, useRef } from "react";
import Pusher from "pusher-js";
import type { Message, Profile } from "@/db/schema";
import { getChatMessages, sendMessage } from "@/lib/actions/chat.actions";
import { useSession } from "next-auth/react";
import type { Channel } from "pusher-js";
import { toast } from "./use-toast";
import { CACHE_KEYS, CACHE_TTL } from "@/lib/constants/cache";
import {  getCachedData, setCachedData } from "@/lib/utils/redis-helpers";

type MessageWithSender = Message & {
  sender?: {
    id: string;
    name: string;
    image: string | null;
  };
};

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
  const cacheKeyRef = useRef<string>(CACHE_KEYS.CHAT.MESSAGES(matchId));

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
        
        // Update the cache with the new messages
        const updatedMessages = [uniqueMessage as MessageWithSender, ...prev];
        setCachedData(
          cacheKeyRef.current, 
          updatedMessages, 
          CACHE_TTL.CHAT.MESSAGES,
          { compress: true }
        ).catch(err => console.error("Failed to update message cache:", err));
        
        return updatedMessages;
      }
      
      // Add to our tracking set
      messageIdsRef.current.add(processedMessage.id);
      
      // Update the cache with the new messages  
      const updatedMessages = [processedMessage as MessageWithSender, ...prev];
      setCachedData(
        cacheKeyRef.current, 
        updatedMessages, 
        CACHE_TTL.CHAT.MESSAGES,
        { compress: true }
      ).catch(err => console.error("Failed to update message cache:", err));
      
      return updatedMessages;
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
        
        // Try to get messages from cache first
        const cachedMessages = await getCachedData<MessageWithSender[]>(cacheKeyRef.current);
        
        if (cachedMessages && Array.isArray(cachedMessages) && cachedMessages.length > 0) {
          console.log("Using cached messages");
          
          // Ensure all cached messages have unique IDs and build ID tracking set
          const messageIds = new Set<string>();
          const processedMessages = cachedMessages.map(msg => {
            const processedMsg = ensureUniqueId(msg);
            messageIds.add(processedMsg.id);
            return processedMsg as MessageWithSender;
          });
          
          messageIdsRef.current = messageIds;
          setMessages(processedMessages);
          
          // Still fetch fresh messages in the background to update cache
          getChatMessages(matchId)
            .then(({ messages: freshMessages }) => {
              if (freshMessages.length > cachedMessages.length) {
                // Process new messages and update state
                const uniqueMessages = freshMessages.map(ensureUniqueId);
                const messageIds = new Set<string>();
                const processedMessages: MessageWithSender[] = [];
                
                uniqueMessages.forEach(msg => {
                  if (messageIds.has(msg.id)) {
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
                
                // Update our tracking ref and state
                messageIdsRef.current = messageIds;
                setMessages(processedMessages);
                
                // Update cache with fresh data
                setCachedData(
                  cacheKeyRef.current, 
                  processedMessages, 
                  CACHE_TTL.CHAT.MESSAGES,
                  { compress: true }
                ).catch(err => console.error("Failed to update message cache:", err));
              }
            })
            .catch(err => console.error("Error fetching fresh messages:", err));
        } else {
          // No cache or invalid cache, fetch from DB
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
          
          // Cache the messages
          setCachedData(
            cacheKeyRef.current, 
            processedMessages, 
            CACHE_TTL.CHAT.MESSAGES,
            { compress: true }
          ).catch(err => console.error("Failed to cache messages:", err));
        }
        
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
  }, [matchId, handleNewMessage, handleTypingEvent, channel]);

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
      
      // Update messages state and cache
      setMessages(prev => {
        const updatedMessages = [...prev, tempMessage];
        
        // Update cache with optimistic update
        setCachedData(
          cacheKeyRef.current, 
          updatedMessages, 
          CACHE_TTL.CHAT.MESSAGES,
          { compress: true }
        ).catch(err => console.error("Failed to update message cache:", err));
        
        return updatedMessages;
      });

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
        
        // Update messages state
        setMessages(prev => {
          const updatedMessages = prev.map(m => 
            m.id === tempMessage.id ? 
              { ...processedMessage, sender: tempMessage.sender } as MessageWithSender : m
          );
          
          // Update cache with confirmed message
          setCachedData(
            cacheKeyRef.current, 
            updatedMessages, 
            CACHE_TTL.CHAT.MESSAGES,
            { compress: true }
          ).catch(err => console.error("Failed to update message cache:", err));
          
          return updatedMessages;
        });
      } catch (error) {
        console.error("Failed to send message:", error);
        
        // Remove from tracking
        messageIdsRef.current.delete(tempMessage.id);
        
        // Update messages state and cache on error
        setMessages(prev => {
          const updatedMessages = prev.filter(m => m.id !== tempMessage.id);
          
          // Update cache to remove failed message
          setCachedData(
            cacheKeyRef.current, 
            updatedMessages, 
            CACHE_TTL.CHAT.MESSAGES,
            { compress: true }
          ).catch(err => console.error("Failed to update message cache:", err));
          
          return updatedMessages;
        });
        
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
    
    // Cache typing status for this user in this match
    if (session?.user?.id) {
      const typingKey = CACHE_KEYS.CHAT.TYPING(matchId, session.user.id);
      setCachedData(typingKey, { isTyping }, isTyping ? 10 : 1)
        .catch(err => console.error("Failed to cache typing status:", err));
    }
  }, [channel, matchId, session?.user?.id]);

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