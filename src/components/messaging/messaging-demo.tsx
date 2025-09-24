"use client";

import { useState } from "react";
import { MessageBubble } from "./message-bubble";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { ConversationList } from "./conversation-list";
import type { Message, Conversation } from "@/lib/messaging/types";

/**
 * Demo component showcasing the messaging UI components
 * This demonstrates how all the components work together
 */
export function MessagingDemo() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hey! How are you doing?",
      matchId: "match-1",
      senderId: "user-2",
      status: "read",
      createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      updatedAt: new Date(Date.now() - 3600000),
    },
    {
      id: "2",
      content: "I'm doing great! Just working on some new features for the app. How about you?",
      matchId: "match-1",
      senderId: "current-user",
      status: "delivered",
      createdAt: new Date(Date.now() - 3000000), // 50 minutes ago
      updatedAt: new Date(Date.now() - 3000000),
    },
    {
      id: "3",
      content: "That sounds awesome! I'd love to hear more about it.",
      matchId: "match-1",
      senderId: "user-2",
      status: "read",
      createdAt: new Date(Date.now() - 1800000), // 30 minutes ago
      updatedAt: new Date(Date.now() - 1800000),
    },
  ]);

  const conversations: Conversation[] = [
    {
      matchId: "match-1",
      otherUser: {
        id: "user-2",
        name: "Alice Johnson",
        image: undefined,
        isOnline: true,
      },
      lastMessage: messages[messages.length - 1],
      unreadCount: 1,
      updatedAt: new Date(),
    },
    {
      matchId: "match-2",
      otherUser: {
        id: "user-3",
        name: "Bob Smith",
        image: undefined,
        isOnline: false,
      },
      lastMessage: {
        id: "4",
        content: "See you tomorrow!",
        matchId: "match-2",
        senderId: "current-user",
        status: "read",
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        updatedAt: new Date(Date.now() - 86400000),
      },
      unreadCount: 0,
      updatedAt: new Date(Date.now() - 86400000),
    },
  ];

  const handleSendMessage = async (content: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      content,
      matchId: "match-1",
      senderId: "current-user",
      status: "sending",
      createdAt: new Date(),
      updatedAt: new Date(),
      isOptimistic: true,
    };

    // Add optimistic message
    setMessages(prev => [...prev, newMessage]);

    // Simulate API call
    setTimeout(() => {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === newMessage.id
            ? { ...msg, status: "sent" as const, isOptimistic: false }
            : msg
        )
      );
    }, 1000);
  };

  const handleRetry = (message: Message) => {
    console.log("Retrying message:", message.id);
    // Implement retry logic here
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-center">Messaging Components Demo</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Conversation List Demo */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Conversation List</h2>
          <div className="border rounded-lg h-96">
            <ConversationList
              conversations={conversations}
              activeConversationId="match-1"
              onConversationSelect={(matchId) => console.log("Selected:", matchId)}
            />
          </div>
        </div>

        {/* Message List Demo */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Message List</h2>
          <div className="border rounded-lg h-96 flex flex-col">
            <MessageList
              messages={messages}
              currentUserId="current-user"
              onRetry={handleRetry}
            />
            <MessageInput
              onSend={handleSendMessage}
              onTyping={(isTyping) => console.log("Typing:", isTyping)}
              placeholder="Type your message..."
            />
          </div>
        </div>
      </div>

      {/* Individual Message Bubbles Demo */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Message Bubble Examples</h2>
        <div className="space-y-4 border rounded-lg p-4">
          <MessageBubble
            message={{
              id: "demo-1",
              content: "This is a message from another user",
              matchId: "match-1",
              senderId: "user-2",
              status: "read",
              createdAt: new Date(),
              updatedAt: new Date(),
            }}
            currentUserId="current-user"
            onRetry={handleRetry}
          />
          
          <MessageBubble
            message={{
              id: "demo-2",
              content: "This is my message with delivery status",
              matchId: "match-1",
              senderId: "current-user",
              status: "delivered",
              createdAt: new Date(),
              updatedAt: new Date(),
            }}
            currentUserId="current-user"
            onRetry={handleRetry}
          />
          
          <MessageBubble
            message={{
              id: "demo-3",
              content: "This message failed to send",
              matchId: "match-1",
              senderId: "current-user",
              status: "failed",
              createdAt: new Date(),
              updatedAt: new Date(),
            }}
            currentUserId="current-user"
            onRetry={handleRetry}
          />
        </div>
      </div>
    </div>
  );
}