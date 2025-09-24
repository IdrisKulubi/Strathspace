# Match-to-Messaging Integration

This document describes the integration between the existing match functionality and the new messaging system in StrathSpace.

## Overview

The integration connects the swiping/matching system with the messaging infrastructure, allowing users to seamlessly transition from discovering matches to having conversations. The system maintains proper authorization, handles anonymous users, and provides a smooth user experience.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Match System  │◄──►│   Integration   │◄──►│ Messaging System│
│   (Swipes/Likes)│    │    Layer        │    │ (Conversations) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Explore Actions │    │ Match-Messaging │    │ Messaging Actions│
│ Match Creation  │    │    Actions      │    │ Send/Receive    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Key Components

### 1. Server Actions (`match-messaging.actions.ts`)

Core server-side functions that bridge matches and messaging:

- **`getConversationFromMatch(matchId)`** - Get conversation details for a match
- **`createConversationFromMatch(matchId)`** - Initialize conversation from match
- **`getMatchesForMessaging()`** - Get all matches with messaging status
- **`navigateToMessaging(matchId)`** - Handle navigation from match to chat
- **`validateMatchAccess(matchId)`** - Check user authorization for match
- **`getConversationStats(matchId)`** - Get message counts and activity

### 2. UI Components

#### Navigation Components (`match-to-message-nav.tsx`)

- **`MatchToMessageNav`** - Main navigation component with loading states
- **`QuickMessageButton`** - Compact button for quick messaging access
- **`MessageCard`** - Card component for match lists with messaging info

#### Match Display (`matches-with-messaging.tsx`)

- **`MatchesWithMessaging`** - Full matches page with conversation status
- **`MatchesModalWithMessaging`** - Modal version for mobile/overlay use

### 3. Integration Points

#### From Explore/Swipe Flow
```typescript
// When a match is created in explore.actions.ts
const result = await recordSwipe(profileId, "like");
if (result.isMatch) {
  // Match created - now available for messaging
  // User can navigate to conversation via MatchToMessageNav
}
```

#### From Match Lists
```typescript
// Display matches with messaging status
const matches = await getMatchesForMessaging();
matches.forEach(match => {
  // Show conversation status, unread counts, etc.
  // Provide navigation to messaging
});
```

#### To Messaging System
```typescript
// Navigate from match to conversation
const result = await navigateToMessaging(matchId);
if (result.success) {
  router.push(result.data.redirectPath); // /chat/{matchId}
}
```

## Data Flow

### 1. Match Creation Flow
```
User Swipes Right → Match Created → Available for Messaging
     ↓                   ↓                    ↓
explore.actions.ts → matches table → match-messaging.actions.ts
```

### 2. Conversation Initialization Flow
```
User Clicks Message → Validate Access → Initialize Conversation → Navigate to Chat
        ↓                   ↓                    ↓                    ↓
MatchToMessageNav → validateMatchAccess → createConversationFromMatch → /chat/{matchId}
```

### 3. Message Sending Flow
```
User Sends Message → Validate Match Access → Store Message → Update Match Timestamp
        ↓                      ↓                  ↓                    ↓
messaging.actions.ts → validateUserAccess → messages table → matches.updatedAt
```

## Authorization Model

### Match-Based Authorization
- Users can only message people they've matched with
- Both users must have swiped right on each other
- Authorization is validated on every messaging operation

### Access Validation
```typescript
// Check if user has access to a match/conversation
const access = await validateMatchAccess(matchId);
if (!access.data.hasAccess) {
  throw new Error("Unauthorized access to conversation");
}
```

### Anonymous User Support
- Anonymous users can match and message
- Partner information respects anonymity settings
- Avatar and name display logic handles anonymous mode

## Database Schema Integration

### Existing Tables Used
```sql
-- Matches table (existing)
matches {
  id: UUID PRIMARY KEY
  user1_id: TEXT REFERENCES users(id)
  user2_id: TEXT REFERENCES users(id)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP -- Updated when messages are sent
  last_message_at: TIMESTAMP -- Tracks conversation activity
}

-- Messages table (existing)
messages {
  id: UUID PRIMARY KEY
  match_id: UUID REFERENCES matches(id) -- Links to match
  sender_id: TEXT REFERENCES users(id)
  content: TEXT
  status: TEXT -- 'sent', 'delivered', 'read'
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

### Key Relationships
- `messages.match_id` → `matches.id` (conversation grouping)
- `matches.user1_id/user2_id` → `users.id` (participants)
- Authorization based on match participation

## API Endpoints Integration

### Enhanced Messaging Actions
The existing messaging actions now include match validation:

```typescript
// Enhanced sendMessage with match validation
export async function sendMessage(formData: FormData) {
  // 1. Validate user authentication
  // 2. Validate match access via validateUserAccess()
  // 3. Send message
  // 4. Update match timestamp
}

// Enhanced getMessages with match validation
export async function getMessages(matchId: string) {
  // 1. Validate user authentication
  // 2. Validate match access
  // 3. Return paginated messages
}
```

### New Match-Messaging Actions
```typescript
// Get matches ready for messaging
GET /api/matches-messaging → getMatchesForMessaging()

// Navigate to conversation
POST /api/navigate-messaging → navigateToMessaging(matchId)

// Get conversation statistics
GET /api/conversation-stats → getConversationStats(matchId)
```

## User Experience Flow

### 1. Discovery to Messaging
```
Explore Profiles → Swipe Right → Match Created → "Start Chat" Button → Conversation
```

### 2. Match Management
```
View Matches → See Conversation Status → Click to Message → Open Chat Interface
```

### 3. Conversation Continuation
```
Chat List → Select Conversation → Continue Messaging → Real-time Updates
```

## Error Handling

### Authorization Errors
- Invalid match access → Redirect to matches page
- Expired sessions → Redirect to login
- Blocked users → Show appropriate message

### Database Errors
- Connection failures → Retry with exponential backoff
- Constraint violations → User-friendly error messages
- Transaction failures → Rollback and retry

### UI Error States
- Loading states during navigation
- Error messages for failed operations
- Fallback UI for missing data

## Performance Considerations

### Caching Strategy
- Match lists cached for 5 minutes
- Conversation stats cached per session
- Message lists use cursor-based pagination

### Database Optimization
- Indexes on `match_id`, `sender_id`, `created_at`
- Efficient queries for conversation lists
- Batch operations for status updates

### Client-Side Optimization
- Lazy loading of conversation details
- Optimistic updates for message sending
- Background refresh of match status

## Testing Strategy

### Integration Tests
- Complete match-to-message flow
- Authorization validation
- Anonymous user scenarios
- Error handling paths

### Unit Tests
- Individual action functions
- UI component behavior
- Authorization logic
- Data transformation

### E2E Tests
- User journey from swipe to message
- Cross-browser compatibility
- Mobile responsiveness
- Real-time updates

## Security Considerations

### Data Protection
- Message content validation and sanitization
- Rate limiting on message sending
- Audit logging for security events

### Privacy
- Anonymous user data protection
- Message encryption (future enhancement)
- User blocking and reporting integration

### Authorization
- JWT token validation
- Match-based access control
- Session management

## Future Enhancements

### Real-time Features
- WebSocket integration for live messaging
- Typing indicators
- Online status indicators
- Push notifications

### Advanced Messaging
- File attachments
- Message reactions
- Message threading
- Voice messages

### Analytics Integration
- Conversation engagement metrics
- Match-to-message conversion rates
- User behavior tracking

## Migration Notes

### From Existing Chat System
The integration maintains compatibility with the existing Pusher-based chat system during the transition period. Both systems can operate simultaneously with feature flags controlling which users see which interface.

### Database Migrations
No schema changes required - the integration uses existing tables and relationships. New indexes may be added for performance optimization.

### Deployment Strategy
1. Deploy integration code alongside existing system
2. Test with subset of users
3. Gradually migrate users to new system
4. Remove old system once migration is complete

## Troubleshooting

### Common Issues
1. **Match not found errors** - Check match ID validity and user access
2. **Authorization failures** - Verify user session and match participation
3. **Message sending failures** - Check network connectivity and rate limits
4. **UI navigation issues** - Verify route configuration and component props

### Debug Tools
- Server action logging for API calls
- Client-side error boundaries for UI issues
- Database query logging for performance issues
- Network request monitoring for connectivity problems

## Configuration

### Environment Variables
```env
# Messaging system configuration
MESSAGING_RATE_LIMIT=10 # messages per minute
MESSAGING_MAX_LENGTH=1000 # characters
MESSAGING_FETCH_INTERVAL=4000 # milliseconds

# Integration settings
MATCH_MESSAGING_ENABLED=true
ANONYMOUS_MESSAGING_ENABLED=true
```

### Feature Flags
- `enableMatchMessaging` - Enable/disable integration
- `enableAnonymousMessaging` - Allow anonymous user messaging
- `enableRealTimeUpdates` - Enable WebSocket updates