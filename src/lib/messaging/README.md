# Messaging System Infrastructure

This directory contains the core infrastructure for the StrathSpace messaging system, designed to replace the Pusher-based real-time messaging with a more reliable database-driven approach.

## Overview

The messaging system uses Next.js Server Actions for database operations and periodic fetching for real-time-like updates. This approach provides better reliability and works well with poor network conditions.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │◄──►│ Server Actions  │◄──►│   PostgreSQL    │
│   (shadcn UI)   │    │   (messaging)   │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Periodic Fetch  │    │ Error Handling  │    │ Existing Schema │
│ (3-5 seconds)   │    │ & Validation    │    │ (messages table)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Core Components

### 1. Server Actions (`/actions/messaging.actions.ts`)

Main server-side functions for messaging operations:

- `sendMessage(formData)` - Send a new message
- `sendMessageAction(matchId, content)` - Alternative send function
- `getMessages(matchId, limit, before)` - Get paginated messages
- `getConversations()` - Get user's conversation list
- `updateMessageStatus(messageId, status)` - Update message read status
- `markConversationAsRead(matchId)` - Mark all messages as read

### 2. Database Utilities (`/utils/messaging-db.utils.ts`)

Optimized database query functions:

- `validateUserMatchAccess()` - Check user permissions
- `getConversationMessages()` - Efficient message fetching
- `getAllUnreadCounts()` - Batch unread count queries
- `getLatestMessagesForMatches()` - Latest message per conversation
- `insertMessage()` - Create new messages
- `updateMatchTimestamp()` - Update conversation activity

### 3. Validation (`/validators/messaging.validators.ts`)

Zod schemas for input validation:

- `sendMessageSchema` - Message sending validation
- `getMessagesSchema` - Message fetching validation
- `messageContentSchema` - Content validation rules
- `validateMessageComprehensive()` - Advanced content checks

### 4. Error Handling (`/utils/messaging-errors.utils.ts`)

Comprehensive error management:

- `MessagingErrorType` - Standardized error types
- `createMessagingError()` - Error creation utilities
- `retryWithBackoff()` - Exponential backoff retry logic
- `withErrorHandling()` - Async operation wrapper
- `getUserFriendlyErrorMessage()` - User-facing error messages

### 5. Types (`/types/messaging.types.ts`)

TypeScript interfaces and types:

- `MessageWithSender` - Message with sender info
- `ConversationPreview` - Conversation list item
- `PaginatedMessages` - Paginated message response
- `MessagingState` - Client state management
- `MESSAGING_CONSTANTS` - System constants

## Usage Examples

### Sending a Message

```typescript
import { sendMessageAction } from "@/lib/messaging";

// Using the action function
const result = await sendMessageAction(matchId, "Hello there!");

if (result.success) {
  console.log("Message sent:", result.data);
} else {
  console.error("Failed to send:", result.error);
}

// Using form data (for form submissions)
const formData = new FormData();
formData.append("matchId", matchId);
formData.append("content", messageContent);

const result = await sendMessage(formData);
```

### Getting Messages with Pagination

```typescript
import { getMessages } from "@/lib/messaging";

// Get latest 50 messages
const result = await getMessages(matchId);

// Get older messages (pagination)
const olderMessages = await getMessages(matchId, 50, result.data?.nextCursor);

if (result.success) {
  const { messages, hasMore, nextCursor } = result.data;
  // Handle messages...
}
```

### Getting Conversations

```typescript
import { getConversations } from "@/lib/messaging";

const result = await getConversations();

if (result.success) {
  result.data.forEach((conversation) => {
    console.log(
      `${conversation.otherUser.name}: ${conversation.lastMessage?.content}`
    );
    console.log(`Unread: ${conversation.unreadCount}`);
  });
}
```

### Error Handling

```typescript
import {
  withErrorHandling,
  getUserFriendlyErrorMessage,
} from "@/lib/messaging";

const result = await withErrorHandling(async () => {
  return await someMessagingOperation();
}, "sending message");

if (!result.success) {
  const friendlyMessage = getUserFriendlyErrorMessage(result.error);
  // Show to user...
}
```

## Validation

### Message Content Validation

```typescript
import {
  validateMessageContent,
  validateMessageComprehensive,
} from "@/lib/messaging";

// Basic validation
const basic = validateMessageContent(content);
if (!basic.isValid) {
  console.error(basic.error);
}

// Comprehensive validation
const comprehensive = validateMessageComprehensive(content, {
  checkSubstantive: true,
  checkSpam: true,
  checkFormatting: true,
});

if (!comprehensive.isValid) {
  console.error(comprehensive.errors);
}
```

## Database Schema

The system uses the existing database schema:

```sql
-- Messages table (existing)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  match_id UUID REFERENCES matches(id) NOT NULL,
  sender_id TEXT REFERENCES users(id) NOT NULL,
  status TEXT DEFAULT 'sent' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX match_id_idx ON messages(match_id);
CREATE INDEX sender_id_idx ON messages(sender_id);
CREATE INDEX created_at_idx ON messages(created_at);
```

## Performance Considerations

### Database Optimization

- **Indexes**: Proper indexing on `match_id`, `sender_id`, and `created_at`
- **Pagination**: Cursor-based pagination for efficient large dataset handling
- **Batch Queries**: Single queries for multiple operations where possible
- **Connection Pooling**: Efficient database connection management

### Client-Side Optimization

- **Optimistic Updates**: Show messages immediately before server confirmation
- **Periodic Fetching**: Smart fetching that pauses during user activity
- **Message Caching**: Cache messages for offline access
- **Virtual Scrolling**: For very long conversations

## Error Recovery

### Retry Logic

```typescript
import { retryWithBackoff, DEFAULT_RETRY_CONFIG } from "@/lib/messaging";

const result = await retryWithBackoff(
  () => sendMessageAction(matchId, content),
  {
    ...DEFAULT_RETRY_CONFIG,
    maxRetries: 5,
  }
);
```

### Error Types

- **Retryable**: Network errors, database errors, unknown errors
- **Non-retryable**: Validation errors, authentication errors, permission errors

## Security

### Authentication & Authorization

- All server actions require valid authentication
- User access to conversations is validated on every operation
- Message content is sanitized and validated

### Input Validation

- Comprehensive Zod schema validation
- Content length limits (1-1000 characters)
- UUID format validation for IDs
- Rate limiting considerations

## Testing

### Unit Tests

```bash
# Run messaging tests
npm test src/lib/actions/__tests__/messaging.actions.test.ts
```

### Integration Tests

Integration tests require a test database setup and are marked as skipped by default.

## Migration from Pusher

This infrastructure is designed to replace the existing Pusher-based system:

1. **Phase 1**: Implement alongside existing system
2. **Phase 2**: Gradual migration with feature flags
3. **Phase 3**: Remove Pusher dependencies

## Constants

```typescript
export const MESSAGING_CONSTANTS = {
  MESSAGE_MAX_LENGTH: 1000,
  MESSAGE_MIN_LENGTH: 1,
  PAGINATION_DEFAULT_LIMIT: 50,
  PAGINATION_MAX_LIMIT: 100,
  FETCH_INTERVAL: 4000, // 4 seconds
  TYPING_TIMEOUT: 3000, // 3 seconds
  RETRY_CONFIG: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  },
};
```

## Future Enhancements

- WebSocket support for real-time updates
- Message encryption for enhanced security
- File attachment support
- Message search functionality
- Typing indicators
- Message reactions
- Thread support
