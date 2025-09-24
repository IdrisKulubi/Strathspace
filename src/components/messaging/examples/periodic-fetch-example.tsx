/**
 * Example component demonstrating the usePeriodicMessageFetch hook
 * This shows how to integrate the hook with a messaging interface
 */

import React, { useState } from 'react';
import { usePeriodicMessageFetch } from '@/hooks/use-periodic-message-fetch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, RefreshCw, MessageSquare } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PeriodicFetchExampleProps {
  matchId: string;
  currentUserId: string;
}

export function PeriodicFetchExample({ matchId, currentUserId }: PeriodicFetchExampleProps) {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Use the periodic message fetch hook
  const {
    messages,
    isFetching,
    error,
    hasMore,
    totalCount,
    refetch,
    setUserTyping,
    clearError,
    getIntervalId
  } = usePeriodicMessageFetch(matchId, {
    fetchInterval: 4000, // 4 seconds
    pauseOnTyping: true,
    typingTimeout: 3000, // 3 seconds
    enabled: true,
    limit: 50,
    retryConfig: {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2
    }
  });

  // Handle input changes and typing detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Detect typing state
    const nowTyping = value.length > 0;
    if (nowTyping !== isTyping) {
      setIsTyping(nowTyping);
      setUserTyping(nowTyping);
    }
  };

  // Handle input blur (stop typing)
  const handleInputBlur = () => {
    setIsTyping(false);
    setUserTyping(false);
  };

  // Format timestamp for display
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(date));
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Header with stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Periodic Message Fetch Demo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium">Total Messages</div>
              <div className="text-muted-foreground">{totalCount}</div>
            </div>
            <div>
              <div className="font-medium">Loaded</div>
              <div className="text-muted-foreground">{messages.length}</div>
            </div>
            <div>
              <div className="font-medium">Has More</div>
              <div className="text-muted-foreground">{hasMore ? 'Yes' : 'No'}</div>
            </div>
            <div>
              <div className="font-medium">Interval ID</div>
              <div className="text-muted-foreground text-xs">
                {getIntervalId() ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status indicators */}
      <div className="flex gap-2 flex-wrap">
        {isFetching && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Fetching...
          </Badge>
        )}
        {isTyping && (
          <Badge variant="outline" className="flex items-center gap-1">
            ⌨️ Typing (fetch paused)
          </Badge>
        )}
        {!isFetching && !error && (
          <Badge variant="default" className="flex items-center gap-1">
            ✅ Connected
          </Badge>
        )}
      </div>

      {/* Error display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={clearError}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        <Button
          onClick={() => refetch()}
          disabled={isFetching}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Manual Refresh
        </Button>
        <Button
          onClick={clearError}
          disabled={!error}
          variant="outline"
          size="sm"
        >
          Clear Error
        </Button>
      </div>

      {/* Typing simulation input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Typing Simulation</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="Type here to simulate user typing (pauses fetch)..."
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-2">
            When you type, periodic fetching will pause. It resumes 3 seconds after you stop typing.
          </p>
        </CardContent>
      </Card>

      {/* Messages display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Messages ({messages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No messages yet
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.senderId === currentUserId ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                      message.senderId === currentUserId
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="text-sm">{message.content}</div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="text-xs opacity-70">
                        {message.sender?.name || 'Unknown'}
                      </div>
                      <div className="text-xs opacity-70">
                        {formatTime(message.createdAt)}
                      </div>
                    </div>
                    {message.status && (
                      <div className="text-xs opacity-70 mt-1">
                        Status: {message.status}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {hasMore && (
            <div className="text-center mt-4">
              <Badge variant="outline">More messages available</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debug info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs space-y-1 font-mono">
            <div>Match ID: {matchId}</div>
            <div>Current User: {currentUserId}</div>
            <div>Is Fetching: {isFetching.toString()}</div>
            <div>Is Typing: {isTyping.toString()}</div>
            <div>Error: {error || 'None'}</div>
            <div>Has More: {hasMore.toString()}</div>
            <div>Total Count: {totalCount}</div>
            <div>Loaded Count: {messages.length}</div>
            <div>Interval Active: {getIntervalId() ? 'Yes' : 'No'}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PeriodicFetchExample;