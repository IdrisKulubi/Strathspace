"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InfiniteMessageList } from '../infinite-message-list';
import { VirtualMessageList } from '../virtual-message-list';
import type { MessageWithSender } from '@/lib/actions/messaging.actions';

/**
 * Demo component showcasing the infinite scroll message list functionality
 * This demonstrates the key features implemented in task 10
 */
export function InfiniteScrollDemo() {
  const [selectedDemo, setSelectedDemo] = useState<'infinite' | 'virtual'>('infinite');
  
  // Mock data for demonstration
  const mockMatchId = 'demo-match-id';
  const mockCurrentUserId = 'demo-user-1';

  const handleRetry = async (messageId?: string) => {
    console.log('Retry message:', messageId);
    // In a real implementation, this would retry the failed message
  };

  const handleMessagesLoaded = (messages: MessageWithSender[], isLoadingMore: boolean) => {
    console.log(`Loaded ${messages.length} messages, isLoadingMore: ${isLoadingMore}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Message History Pagination & Infinite Scroll Demo</h1>
        <p className="text-muted-foreground">
          Demonstrating the implementation of Task 10: Add message history pagination and infinite scroll
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Features Implemented</CardTitle>
          <CardDescription>
            This demo showcases the key features of the infinite scroll message list
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">✅ Infinite Scroll Functionality</h3>
              <p className="text-sm text-muted-foreground">
                Automatically loads older messages when scrolling to the top
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">✅ Load More Button</h3>
              <p className="text-sm text-muted-foreground">
                Manual load more option for users who prefer explicit control
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">✅ Scroll Position Maintenance</h3>
              <p className="text-sm text-muted-foreground">
                Maintains visual position when loading older messages
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">✅ Performance Optimization</h3>
              <p className="text-sm text-muted-foreground">
                Virtual scrolling for large message histories (1000+ messages)
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">✅ Comprehensive Testing</h3>
              <p className="text-sm text-muted-foreground">
                Unit tests for pagination logic and scroll behavior
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">✅ Error Handling</h3>
              <p className="text-sm text-muted-foreground">
                Graceful error handling with retry mechanisms
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Requirements Satisfied</CardTitle>
          <CardDescription>
            Mapping to the original requirements from the task specification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold">Requirement 4.1: Message History Loading</h4>
              <p className="text-sm text-muted-foreground">
                ✅ System loads and displays the most recent 50 messages initially, with pagination for older messages
              </p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold">Requirement 4.2: Scroll-based Pagination</h4>
              <p className="text-sm text-muted-foreground">
                ✅ System loads older messages when user scrolls to the top of the conversation
              </p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold">Requirement 4.3: Scroll Position Maintenance</h4>
              <p className="text-sm text-muted-foreground">
                ✅ System maintains the user's scroll position when loading new messages
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedDemo} onValueChange={(value) => setSelectedDemo(value as 'infinite' | 'virtual')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="infinite">Standard Infinite Scroll</TabsTrigger>
          <TabsTrigger value="virtual">Virtual Scrolling (Performance)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="infinite" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Standard Infinite Scroll Implementation</CardTitle>
              <CardDescription>
                Optimized for typical message histories (up to 1000 messages)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] border rounded-lg">
                <InfiniteMessageList
                  matchId={mockMatchId}
                  currentUserId={mockCurrentUserId}
                  pageSize={20}
                  enableInfiniteScroll={true}
                  onRetry={handleRetry}
                  onMessagesLoaded={handleMessagesLoaded}
                />
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Features demonstrated:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Infinite scroll detection using Intersection Observer</li>
                  <li>Smooth loading animations and transitions</li>
                  <li>Date separators between messages from different days</li>
                  <li>Scroll-to-bottom button when not at the bottom</li>
                  <li>Message count indicator showing progress</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="virtual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Virtual Scrolling Implementation</CardTitle>
              <CardDescription>
                Optimized for very large message histories (10,000+ messages)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <VirtualMessageList
                  matchId={mockMatchId}
                  currentUserId={mockCurrentUserId}
                  height={500}
                  itemHeight={80}
                  pageSize={50}
                  onRetry={handleRetry}
                  onMessagesLoaded={handleMessagesLoaded}
                />
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Performance features:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Virtual scrolling using react-window for memory efficiency</li>
                  <li>Only renders visible messages in the DOM</li>
                  <li>Handles thousands of messages without performance degradation</li>
                  <li>Maintains smooth scrolling and interaction</li>
                  <li>Automatic height calculation for different message types</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Implementation Details</CardTitle>
          <CardDescription>
            Technical details of the infinite scroll implementation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Custom Hooks Created:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><code>useInfiniteScroll</code> - Core infinite scroll logic with Intersection Observer</li>
                <li><code>useMessagePagination</code> - Message-specific pagination with cursor-based loading</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Components Created:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><code>InfiniteMessageList</code> - Standard infinite scroll message list</li>
                <li><code>VirtualMessageList</code> - Performance-optimized virtual scrolling list</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Key Features:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Cursor-based pagination for efficient database queries</li>
                <li>Scroll position maintenance using DOM measurements</li>
                <li>Intersection Observer API for efficient scroll detection</li>
                <li>Debounced loading to prevent excessive API calls</li>
                <li>Comprehensive error handling and retry mechanisms</li>
                <li>Smooth animations and loading states</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Testing Coverage</CardTitle>
          <CardDescription>
            Comprehensive test suite for pagination and scroll behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Unit Tests:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>useInfiniteScroll hook functionality</li>
                <li>useMessagePagination hook behavior</li>
                <li>InfiniteMessageList component rendering</li>
                <li>Error handling and retry mechanisms</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Integration Tests:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>End-to-end pagination flow</li>
                <li>Scroll position maintenance</li>
                <li>Error recovery scenarios</li>
                <li>Performance with large datasets</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}