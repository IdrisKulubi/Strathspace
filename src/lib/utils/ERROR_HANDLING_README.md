# Messaging System Error Handling & Retry Mechanisms

This document describes the comprehensive error handling and retry mechanisms implemented for the messaging system as part of task 9.

## Overview

The error handling system provides:
- **Comprehensive error classification and handling**
- **Exponential backoff retry mechanisms**
- **Offline message queuing**
- **Circuit breaker pattern for preventing cascading failures**
- **User-friendly error recovery components**
- **Extensive testing coverage**

## Architecture

### Core Components

#### 1. Error Classification (`messaging-errors.utils.ts`)
- **MessagingErrorType**: Enum defining all possible error types
- **MessagingError**: Standardized error interface with retry information
- **Error normalization**: Converts various error types to consistent format
- **User-friendly error messages**: Translates technical errors to user-readable messages

#### 2. Retry Utilities (`retry-utils.ts`)
- **Exponential backoff**: Configurable retry logic with jitter
- **RetryQueue**: Manages failed operations for background retry
- **CircuitBreaker**: Prevents cascading failures during outages
- **Batch retry**: Handles multiple operations efficiently

#### 3. Offline Queue (`offline-queue.ts`)
- **Message persistence**: Stores messages in localStorage when offline
- **Automatic sync**: Processes queued messages when connection restored
- **Event system**: Notifies components of queue status changes
- **Cleanup**: Removes old messages automatically

#### 4. Error Recovery Hook (`use-error-recovery.ts`)
- **State management**: Tracks errors, retry attempts, and statistics
- **Operation wrapper**: Executes functions with automatic retry
- **Network monitoring**: Detects online/offline status changes
- **Callback system**: Notifies on recovery or permanent failure

### UI Components

#### 1. Enhanced Message Input (`enhanced-message-input.tsx`)
- **Offline detection**: Shows network status and queues messages
- **Error recovery**: Displays retry options for failed sends
- **Queue integration**: Shows queued message count
- **Graceful degradation**: Works seamlessly offline

#### 2. Enhanced Message List (`enhanced-message-list.tsx`)
- **Error boundaries**: Catches and handles component errors
- **Retry mechanisms**: Allows retry of failed load operations
- **Queue display**: Shows queued messages alongside server messages
- **Loading states**: Provides feedback during operations

#### 3. Error Recovery Components (`error-recovery.tsx`)
- **Network status**: Visual indicator of connection state
- **Queue management**: Shows queue status and allows manual sync
- **Retry controls**: Buttons for manual retry operations
- **Progress feedback**: Shows sync progress and results

## Usage Examples

### Basic Error Handling

```typescript
import { useErrorRecovery } from '@/hooks/use-error-recovery';

function MyComponent() {
  const { state, actions } = useErrorRecovery({
    showToasts: true,
    onRecovery: (attempts) => console.log(`Recovered after ${attempts} attempts`),
    onPermanentFailure: (error) => console.error('Operation failed permanently', error)
  });

  const handleOperation = async () => {
    try {
      await actions.executeWithRetry(async () => {
        // Your operation here
        await someApiCall();
      });
    } catch (error) {
      // Handle permanent failure
      console.error('Operation failed:', error);
    }
  };

  return (
    <div>
      {state.error && (
        <ErrorMessage 
          error={actions.getErrorMessage()} 
          onRetry={actions.retry}
        />
      )}
      <button onClick={handleOperation}>
        Execute Operation
      </button>
    </div>
  );
}
```

### Offline Queue Usage

```typescript
import { useOfflineQueue } from '@/lib/utils/offline-queue';

function MessageSender() {
  const offlineQueue = useOfflineQueue();

  const sendMessage = async (content: string) => {
    if (navigator.onLine) {
      try {
        await sendMessageToServer(content);
      } catch (error) {
        // Queue for later if send fails
        offlineQueue.enqueueMessage(matchId, content);
      }
    } else {
      // Queue immediately when offline
      offlineQueue.enqueueMessage(matchId, content);
    }
  };

  return (
    <div>
      <QueueStatus status={offlineQueue.getStatus()} />
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
```

### Server Action Integration

```typescript
import { withErrorHandling, createMessagingError, MessagingErrorType } from '@/lib/utils/messaging-errors.utils';

export async function sendMessage(formData: FormData): Promise<ActionResult<Message>> {
  return withErrorHandling(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      throw createMessagingError(
        MessagingErrorType.AUTH_ERROR,
        "Authentication required"
      );
    }

    // Your implementation here
    const result = await saveMessageToDatabase(data);
    return result;
  }, 'sendMessage');
}
```

## Configuration

### Retry Configuration

```typescript
const retryConfig: RetryConfig = {
  maxRetries: 3,           // Maximum retry attempts
  baseDelay: 1000,         // Initial delay in ms
  maxDelay: 30000,         // Maximum delay in ms
  backoffFactor: 2,        // Exponential backoff multiplier
  jitterFactor: 0.1,       // Random jitter (10%)
  retryableErrors: [       // Which errors to retry
    MessagingErrorType.NETWORK_ERROR,
    MessagingErrorType.DATABASE_ERROR
  ]
};
```

### Offline Queue Configuration

```typescript
const queueOptions: OfflineQueueOptions = {
  maxQueueSize: 100,       // Maximum queued messages
  maxMessageAge: 86400000, // 24 hours in ms
  storageKey: 'msg_queue', // localStorage key
  retryConfig: retryConfig // Retry configuration
};
```

## Error Types

| Error Type | Retryable | Description |
|------------|-----------|-------------|
| `VALIDATION_ERROR` | No | Invalid input data |
| `AUTH_ERROR` | No | Authentication required |
| `PERMISSION_ERROR` | No | Insufficient permissions |
| `NETWORK_ERROR` | Yes | Connection issues |
| `DATABASE_ERROR` | Yes | Database operation failed |
| `RATE_LIMIT_ERROR` | Yes | Too many requests |
| `MESSAGE_NOT_FOUND` | No | Message doesn't exist |
| `MATCH_NOT_FOUND` | No | Conversation doesn't exist |
| `UNKNOWN_ERROR` | Yes | Unexpected error |

## Testing

The implementation includes comprehensive tests:

### Unit Tests
- **Retry utilities**: Test exponential backoff, circuit breaker, retry queue
- **Offline queue**: Test message queuing, persistence, sync operations
- **Error recovery hook**: Test state management, retry logic, callbacks

### Integration Tests
- **Component integration**: Test UI components with error handling
- **End-to-end flows**: Test complete offline-to-online scenarios
- **Error scenarios**: Test various failure modes and recovery

### Running Tests

```bash
# Run all error handling tests
npm test -- --testPathPattern="error|retry|offline"

# Run specific test suites
npm test retry-utils.test.ts
npm test offline-queue.test.ts
npm test use-error-recovery.test.ts
npm test error-handling-integration.test.tsx
```

## Performance Considerations

### Memory Management
- **Queue size limits**: Prevents unlimited memory growth
- **Message cleanup**: Removes old messages automatically
- **Event listener cleanup**: Proper cleanup on component unmount

### Network Efficiency
- **Batch operations**: Groups multiple retries together
- **Smart fetching**: Pauses during user activity
- **Exponential backoff**: Reduces server load during outages

### User Experience
- **Optimistic updates**: Shows messages immediately
- **Progress feedback**: Indicates retry and sync progress
- **Graceful degradation**: Works seamlessly offline

## Monitoring and Debugging

### Error Statistics
The error recovery system tracks:
- Total errors encountered
- Retry attempts made
- Successful recoveries
- Permanent failures

### Debug Information
- Console logging for retry attempts
- Error context and stack traces
- Queue status and message details
- Network status changes

### Production Monitoring
Consider integrating with:
- Error tracking services (Sentry, Bugsnag)
- Performance monitoring (New Relic, DataDog)
- Custom analytics for retry patterns

## Best Practices

### Error Handling
1. **Use specific error types** for better user experience
2. **Provide retry options** for transient failures
3. **Show progress feedback** during long operations
4. **Gracefully degrade** when services are unavailable

### Retry Logic
1. **Use exponential backoff** to avoid overwhelming servers
2. **Add jitter** to prevent thundering herd problems
3. **Limit retry attempts** to avoid infinite loops
4. **Circuit break** during extended outages

### Offline Support
1. **Queue critical operations** when offline
2. **Persist queue state** across browser sessions
3. **Sync automatically** when connection restored
4. **Provide manual sync** options for user control

### Testing
1. **Test error scenarios** thoroughly
2. **Mock network conditions** (offline, slow, intermittent)
3. **Verify retry behavior** with different error types
4. **Test queue persistence** and recovery

## Future Enhancements

### Potential Improvements
- **Smart retry scheduling**: Adjust retry timing based on error patterns
- **Priority queuing**: Handle urgent messages first
- **Conflict resolution**: Handle message ordering conflicts
- **Background sync**: Sync during idle periods
- **Compression**: Reduce storage space for queued messages
- **Encryption**: Secure queued message content

### Integration Opportunities
- **Service worker**: Enhanced offline capabilities
- **Push notifications**: Notify when messages sync
- **Analytics**: Track error patterns and user behavior
- **A/B testing**: Optimize retry strategies

## Troubleshooting

### Common Issues

#### Messages not syncing when online
- Check network connectivity
- Verify queue status with `getStatus()`
- Look for authentication errors
- Check browser console for errors

#### High retry rates
- Monitor server health
- Check retry configuration
- Look for rate limiting
- Verify error classification

#### Queue growing too large
- Check `maxQueueSize` setting
- Verify cleanup is running
- Look for persistent failures
- Consider manual queue clearing

#### Performance issues
- Monitor retry frequency
- Check queue processing interval
- Look for memory leaks
- Verify event listener cleanup

### Debug Commands

```javascript
// Check queue status
console.log(offlineQueue.getStatus());

// View queued messages
console.log(offlineQueue.getQueuedMessages());

// Check error recovery state
console.log(errorRecovery.state);

// Manual sync
await offlineQueue.syncAll();
```

## Conclusion

This comprehensive error handling system provides robust, user-friendly error recovery for the messaging system. It handles network issues gracefully, provides clear feedback to users, and ensures messages are delivered reliably even in challenging network conditions.

The implementation follows best practices for retry logic, offline support, and user experience while maintaining high performance and reliability standards.