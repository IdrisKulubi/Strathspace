# Periodic Message Fetching System

This document describes the periodic message fetching system implemented for the StrathSpace messaging feature. The system provides reliable message synchronization without real-time dependencies like Pusher.

## Overview

The periodic fetching system consists of two main hooks:

1. **`usePeriodicMessageFetch`** - Core periodic fetching functionality
2. **`useMessagingWithPeriodicFetch`** - Complete messaging interface with sending and optimistic updates

## Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   React Component   │◄──►│  Periodic Fetch     │◄──►│   Server Actions    │
│   (UI Layer)        │    │  Hook               │    │   (API Layer)       │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
           │                          │                          │
           │                          │                          │
           ▼                          ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│ Optimistic Updates  │    │ Smart Pausing       │    │ Exponential Backoff │
│ Error Handling      │    │ Memory Management   │    │ Retry Logic         │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

## Core Features

### 1. Smart Fetching Logic

- **Automatic Intervals**: Configurable fetch intervals (default: 4 seconds)
- **Typing Pause**: Automatically pauses fetching when user is typing
- **Typing Timeout**: Resumes fetching after user stops typing (default: 3 seconds)
- **Manual Control**: Ability to manually trigger fetches and control the system

### 2. Error Handling & Retry Logic

- **Exponential Backoff**: Implements exponential backoff for failed requests
- **Retry Configuration**: Customizable retry attempts, delays, and backoff factors
- **Error Recovery**: Graceful error handling with user-friendly messages
- **Network Resilience**: Continues working with poor network conditions

### 3. Memory Management & Cleanup

- **Proper Cleanup**: Automatically cleans up intervals and timeouts on unmount
- **Memory Efficiency**: Prevents memory leaks with proper ref management
- **State Synchronization**: Maintains consistent state across re-renders

### 4. Message Deduplication

- **Timestamp Tracking**: Tracks latest message timestamps to avoid duplicates
- **ID-based Filtering**: Filters out messages that already exist in the local state
- **Optimistic Updates**: Handles optimistic updates without creating duplicates

## Hook APIs

### usePeriodicMessageFetch

Basic periodic fetching hook for read-only message synchronization.

```typescript
const {
  messages,           // Latest messages from the conversation
  isFetching,         // Whether a fetch is in progress
  error,              // Any error that occurred
  hasMore,            // Whether there are more messages to load
  totalCount,         // Total number of messages
  refetch,            // Manual refetch function
  setUserTyping,      // Indicate user typing status
  clearError,         // Clear error state
  getIntervalId       // Get interval ID for debugging
} = usePeriodicMessageFetch(matchId, options);
```

#### Options

```typescript
interface UsePeriodicMessageFetchOptions {
  fetchInterval?: number;      // Fetch interval in ms (default: 4000)
  pauseOnTyping?: boolean;     // Pause during typing (default: true)
  typingTimeout?: number;      // Typing timeout in ms (default: 3000)
  retryConfig?: Partial<RetryConfig>; // Retry configuration
  enabled?: boolean;           // Enable/disable fetching (default: true)
  limit?: number;              // Messages per fetch (default: 50)
}
```

### useMessagingWithPeriodicFetch

Complete messaging interface with sending, optimistic updates, and periodic fetching.

```typescript
const {
  messages,           // All messages including optimistic ones
  isFetching,         // Whether fetching is in progress
  isSending,          // Whether a message is being sent
  error,              // Any error that occurred
  hasMore,            // Whether there are more messages
  totalCount,         // Total message count
  sendMessage,        // Send a new message
  refetch,            // Manual refetch
  setUserTyping,      // Set typing status
  clearError,         // Clear errors
  markAsRead,         // Mark conversation as read
  retryMessage,       // Retry a failed message
  getIntervalId       // Get interval ID
} = useMessagingWithPeriodicFetch(matchId, options);
```

## Usage Examples

### Basic Message Display

```typescript
import { usePeriodicMessageFetch } from '@/hooks/use-periodic-message-fetch';

function MessageList({ matchId }: { matchId: string }) {
  const { messages, isFetching, error, refetch } = usePeriodicMessageFetch(matchId);

  if (error) {
    return (
      <div className="error">
        {error}
        <button onClick={refetch}>Retry</button>
      </div>
    );
  }

  return (
    <div className="messages">
      {isFetching && <div>Loading...</div>}
      {messages.map(message => (
        <div key={message.id} className="message">
          <strong>{message.sender?.name}:</strong> {message.content}
        </div>
      ))}
    </div>
  );
}
```

### Complete Messaging Interface

```typescript
import { useMessagingWithPeriodicFetch } from '@/hooks/use-messaging-with-periodic-fetch';

function MessagingInterface({ matchId }: { matchId: string }) {
  const [inputValue, setInputValue] = useState('');
  
  const {
    messages,
    isSending,
    sendMessage,
    setUserTyping,
    retryMessage
  } = useMessagingWithPeriodicFetch(matchId);

  const handleSend = async () => {
    if (inputValue.trim()) {
      await sendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setUserTyping(e.target.value.length > 0);
  };

  return (
    <div>
      <div className="messages">
        {messages.map(message => (
          <div key={message.id} className="message">
            {message.content}
            {message.status === 'failed' && (
              <button onClick={() => retryMessage(message.id)}>
                Retry
              </button>
            )}
          </div>
        ))}
      </div>
      
      <div className="input-area">
        <input
          value={inputValue}
          onChange={handleInputChange}
          onBlur={() => setUserTyping(false)}
          placeholder="Type a message..."
        />
        <button onClick={handleSend} disabled={isSending}>
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
```

### Advanced Configuration

```typescript
const messagingHook = useMessagingWithPeriodicFetch(matchId, {
  fetchInterval: 5000,        // 5 second intervals
  pauseOnTyping: true,        // Pause during typing
  typingTimeout: 2000,        // 2 second typing timeout
  autoMarkAsRead: true,       // Auto-mark messages as read
  enableOptimisticUpdates: true, // Show messages immediately
  retryConfig: {
    maxRetries: 5,            // More retry attempts
    baseDelay: 2000,          // Longer base delay
    maxDelay: 30000,          // Longer max delay
    backoffFactor: 1.5        // Gentler backoff
  }
});
```

## Performance Considerations

### Fetch Optimization

1. **Smart Intervals**: Only fetches when necessary
2. **Typing Pause**: Prevents unnecessary requests during active typing
3. **Deduplication**: Avoids processing duplicate messages
4. **Cursor-based Pagination**: Efficient loading of message history

### Memory Management

1. **Cleanup on Unmount**: All intervals and timeouts are properly cleaned up
2. **Ref Usage**: Uses refs to prevent unnecessary re-renders
3. **State Optimization**: Minimizes state updates and re-computations

### Network Efficiency

1. **Exponential Backoff**: Reduces server load during network issues
2. **Retry Logic**: Intelligent retry strategies for different error types
3. **Request Batching**: Efficient message fetching with configurable limits

## Error Handling

### Error Types

The system handles various error scenarios:

- **Network Errors**: Connection failures, timeouts
- **Authentication Errors**: Invalid or expired sessions
- **Validation Errors**: Invalid message content or parameters
- **Server Errors**: Database issues, internal server errors

### Recovery Strategies

1. **Automatic Retry**: Uses exponential backoff for retryable errors
2. **User Feedback**: Provides clear error messages and retry options
3. **Graceful Degradation**: Continues working with cached data when possible
4. **Manual Recovery**: Allows users to manually trigger retries

## Testing

The system includes comprehensive tests covering:

- Basic functionality and configuration
- Typing pause behavior
- Error handling and recovery
- Message deduplication
- Cleanup and memory management
- Edge cases and race conditions

Run tests with:

```bash
npm test src/hooks/__tests__/use-periodic-message-fetch.test.ts
```

## Integration with Existing System

The periodic fetching system integrates seamlessly with the existing messaging infrastructure:

- **Server Actions**: Uses existing `getMessages`, `sendMessage` actions
- **Error Handling**: Leverages existing error utilities and retry logic
- **Type Safety**: Fully typed with existing TypeScript interfaces
- **Authentication**: Works with NextAuth.js session management

## Migration from Pusher

This system is designed to replace Pusher-based real-time messaging:

1. **Phase 1**: Implement alongside existing Pusher system
2. **Phase 2**: Gradually migrate conversations to periodic fetching
3. **Phase 3**: Remove Pusher dependencies completely

The periodic fetching provides similar user experience to real-time updates while being more reliable and easier to maintain.

## Troubleshooting

### Common Issues

1. **Messages Not Updating**: Check if `enabled` is true and `matchId` is valid
2. **High Network Usage**: Increase `fetchInterval` or optimize message limits
3. **Memory Leaks**: Ensure components using the hooks are properly unmounted
4. **Typing Not Pausing**: Verify `setUserTyping` is called correctly

### Debug Information

Use the `getIntervalId()` function to check if the periodic fetching is active:

```typescript
const { getIntervalId } = usePeriodicMessageFetch(matchId);
console.log('Interval active:', !!getIntervalId());
```

### Performance Monitoring

Monitor the hook's performance by tracking:

- Fetch frequency and success rates
- Error rates and types
- Memory usage over time
- Network request patterns

## Future Enhancements

Potential improvements to the system:

1. **WebSocket Fallback**: Hybrid approach with WebSocket support
2. **Offline Support**: Queue messages when offline
3. **Push Notifications**: Integration with browser push notifications
4. **Message Encryption**: End-to-end encryption support
5. **Advanced Caching**: More sophisticated caching strategies