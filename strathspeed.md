# StrathSpeed - Live Video Speed Dating Feature
## Development Plan & Implementation Strategy

---

## 🎯 Executive Summary

**StrathSpeed** is a live video speed-dating feature for StrathSpace that enables instant 1:1 video connections between users. The MVP focuses on real-time matching, secure video chat, and seamless mobile experience with 60-90 second sessions.

**Key Success Metrics:**
- Sub-200ms video connection latency
- 95%+ successful connection rate
- Mobile-first responsive design
- Scalable to 1000+ concurrent users

---

## 🏗 Technical Architecture Overview

### Core Technology Stack
```
Frontend: Next.js 15 (App Router) + React 19
Styling: Tailwind CSS + shadcn/ui  
Database: NeonDB (PostgreSQL) + Drizzle ORM ✅ **INTEGRATED**
Real-time: Redis + WebSockets/Socket.io
Video: Daily.co API (WebRTC)
State Management: Zustand + React Query
Authentication: Existing StrathSpace auth system ✅ **EXISTING**
```

### **Integration with Existing StrathSpace:**
- ✅ **Users & Profiles**: Leverages your existing user/profile tables
- ✅ **Authentication**: Uses current auth system (no new login required)
- ✅ **Matches**: Successful "vibes" can create traditional matches
- ✅ **Messaging**: Vibe recipients can chat via existing message system
- ✅ **UI Components**: Reuses shadcn/ui components for consistency

### System Components
1. **Matching Engine** - Redis-based queue system
2. **Video Service** - Daily.co integration layer
3. **Real-time Signaling** - WebSocket connections
4. **Session Management** - Room lifecycle control
5. **Moderation System** - Report/block functionality
6. **Gamification Engine** - Points and achievements

---

## 📋 Phase-by-Phase Implementation Plan

### **PHASE 1: Foundation & Core Infrastructure** ⏱ Week 1-2

#### 1.1 Database Schema Design ✅ **COMPLETED**

**Note:** The database schema has been added to your existing `schema.ts` file. Here's what was added:

**New Tables Added:**
- `speed_dating_profiles` - User preferences and gamification stats
- `speed_sessions` - Video session management with Daily.co integration
- `session_outcomes` - User actions (vibe/skip/report) per session
- `icebreaker_prompts` - Conversation starters with categories
- `speed_reports` - Enhanced reporting system for video sessions
- `speed_blocks` - StrathSpeed-specific blocking functionality

**Key Features of the Schema:**
- **Gamification Built-in**: Points, streaks, badges stored in `speed_dating_profiles`
- **Anonymous Mode Support**: Session-level anonymity tracking
- **Daily.co Integration**: Room URLs and connection quality tracking
- **Enhanced Reporting**: Detailed moderation with admin actions
- **Optimized Indexes**: For high-performance querying under load
- **Proper Relations**: Full Drizzle ORM relationship mapping

**Leverages Existing Infrastructure:**
- Uses your existing `users` table as the foundation
- Integrates with current `profiles` table for user preferences
- Can potentially create matches in your existing `matches` table for successful "vibes"

#### 1.2 Redis Queue Architecture
```typescript
// Queue structure design
interface QueueUser {
  userId: string;
  socketId: string;
  joinedAt: number;
  preferences: {
    anonymousMode: boolean;
  };
}

// Redis keys structure
const REDIS_KEYS = {
  ACTIVE_QUEUE: 'strathspeed:queue:active',
  USER_SESSION: 'strathspeed:session:{userId}',
  ROOM_DATA: 'strathspeed:room:{roomId}',
  RECENT_MATCHES: 'strathspeed:recent:{userId}'
};
```

#### 1.3 Core API Routes Setup
```typescript
// API Routes Structure
/api/strathspeed/
  ├── join-queue        POST  - Join matching queue
  ├── leave-queue       POST  - Leave queue  
  ├── session-action    POST  - Vibe/Skip/Report actions
  ├── room-status       GET   - Get room connection status
  ├── profile           GET   - Get user's speed dating profile
  ├── profile           PUT   - Update speed dating preferences
  ├── stats             GET   - Get user's gamification stats
  ├── leaderboard       GET   - Get campus leaderboard
  ├── icebreakers       GET   - Get random icebreaker prompts
  └── report            POST  - Report user behavior

// Integration with existing StrathSpace APIs
/api/users/[id]         GET   - Leverage existing user data
/api/profiles/[id]      GET   - Use existing profile system
/api/matches           POST   - Create match for successful "vibes"
```

---

### **PHASE 2: Video Infrastructure Integration** ⏱ Week 2-3

#### 2.1 Daily.co Integration Service
```typescript
// Service layer for video functionality
export class VideoService {
  async createRoom(sessionId: string): Promise<DailyRoom>
  async generateToken(roomId: string, userId: string): Promise<string>
  async deleteRoom(roomId: string): Promise<void>
  async getRoomInfo(roomId: string): Promise<RoomInfo>
}
```

#### 2.2 WebRTC Component Architecture
```
components/
  video/
    VideoRoom.tsx           - Main video chat container
    VideoControls.tsx       - Mute/leave/report controls
    ConnectionStatus.tsx    - Connection quality indicator
    IcebreakerCard.tsx     - Conversation prompt display
    SessionTimer.tsx        - 60-90s countdown timer
```

#### 2.3 Connection Flow Logic
1. User joins queue → WebSocket connection established
2. Match found → Create Daily.co room
3. Generate access tokens for both users
4. Send room details via WebSocket
5. Users join video room simultaneously
6. Display icebreaker prompt
7. Start session timer

---

### **PHASE 3: Real-time Matching Engine** ⏱ Week 3-4

#### 3.1 WebSocket Event Architecture
```typescript
// Client → Server Events
interface ClientEvents {
  'join-queue': { preferences: UserPreferences };
  'leave-queue': {};
  'session-action': { action: 'vibe' | 'skip' | 'report'; sessionId: string };
  'heartbeat': {};
}

// Server → Client Events
interface ServerEvents {
  'queue-joined': { position: number };
  'match-found': { roomId: string; token: string; icebreaker: string };
  'session-ended': { reason: string };
  'queue-left': {};
}
```

#### 3.2 Matching Algorithm
```typescript
class MatchingEngine {
  async findMatch(user: QueueUser): Promise<QueueUser | null> {
    // 1. Get next user in FIFO queue
    // 2. Check if users haven't been matched recently (Redis cache)
    // 3. Validate both users still online
    // 4. Create session and remove from queue
    // 5. Return match or null
  }
  
  async preventRecentMatches(userId1: string, userId2: string): Promise<void> {
    // Cache recent matches for 30 minutes to prevent immediate re-matching
  }
}
```

#### 3.3 Queue Management System
- FIFO-based matching with Redis lists
- Heartbeat mechanism to remove inactive users
- Automatic queue cleanup every 30 seconds
- Prevent same-user matching with recent match cache

---

### **PHASE 4: User Interface Development** ⏱ Week 4-5

#### 4.1 Main UI Components Structure
```
app/strathspeed/
  page.tsx              - Main entry point
  components/
    QueueScreen.tsx     - Waiting for match UI
    VideoSession.tsx    - Active video chat interface
    SessionResult.tsx   - Post-session vibe/skip screen
    StrathSpeedHome.tsx - Feature landing/stats
```

#### 4.2 Mobile-First Responsive Design
- Vertical video layout optimized for mobile
- Touch-friendly controls (large buttons)
- Swipe gestures for quick actions
- Dark mode support matching StrathSpace theme
- PWA-ready for app-like experience

#### 4.3 State Management Strategy
```typescript
// Zustand store for StrathSpeed state
interface StrathSpeedStore {
  // Queue state
  queueStatus: 'idle' | 'joining' | 'waiting' | 'matched';
  queuePosition: number;
  
  // Session state
  currentSession: Session | null;
  sessionTimer: number;
  icebreaker: string;
  
  // Actions
  joinQueue: () => Promise<void>;
  leaveQueue: () => void;
  sendSessionAction: (action: SessionAction) => Promise<void>;
}
```

---

### **PHASE 5: Moderation & Safety Features** ⏱ Week 5-6

#### 5.1 Report System Implementation
```typescript
interface ReportData {
  sessionId: string;
  reportedUserId: string;
  reportType: 'inappropriate_content' | 'harassment' | 'spam' | 'other';
  description?: string;
  timestamp: Date;
}
```

#### 5.2 Auto-Moderation Features
- Session timeout enforcement (90s max)
- Rate limiting for queue joins (max 1 every 10s)
- Automatic disconnection on multiple reports
- Block list management per user

#### 5.3 Safety UI Components
- Prominent report button in video interface
- Block confirmation modal
- Safety tips display before first session
- Emergency disconnect with single tap

---

### **PHASE 6: Gamification System** ⏱ Week 6-7

#### 6.1 Points & Achievements System
```typescript
interface UserStats {
  speedPoints: number;
  totalSessions: number;
  vibesReceived: number;
  vibesSent: number;
  currentStreak: number;
  longestStreak: number;
  badges: Badge[];
}

interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  unlockedAt: Date;
}
```

#### 6.2 Reward Mechanics
- +10 points per completed session
- +25 points for receiving a "vibe"
- +50 points for mutual vibes (match)
- Streak bonuses (2x points after 5 consecutive sessions)
- Weekly challenges and seasonal events

---

### **PHASE 7: Testing & Performance Optimization** ⏱ Week 7-8

#### 7.1 Load Testing Strategy
- Simulate 100+ concurrent video sessions
- Redis queue performance under load
- WebSocket connection stability testing
- Mobile network condition testing (3G/4G/5G)

#### 7.2 Edge Case Handling
```typescript
// Key edge cases to test and handle
const EDGE_CASES = [
  'User disconnects mid-session',
  'Network interruption during matching',
  'Daily.co room creation failure',
  'WebSocket connection drops',
  'Rapid queue join/leave attempts',
  'Session timeout with active video',
  'Simultaneous "vibe" actions'
];
```

#### 7.3 Performance Monitoring
- Video connection quality metrics
- Queue wait time analytics
- Session completion rates
- User engagement tracking
- Error rate monitoring

---

## 🔧 Technical Implementation Details

### WebSocket Connection Management
```typescript
// Real-time connection handling
class StrathSpeedSocket {
  connect(userId: string): void;
  joinQueue(preferences: UserPreferences): Promise<void>;
  onMatchFound(callback: (match: MatchData) => void): void;
  onSessionEnd(callback: (reason: string) => void): void;
  disconnect(): void;
}
```

### Video Session Lifecycle
```
1. Match Found → Create Daily.co room
2. Generate tokens → Send to both users
3. Users join → Start session timer
4. Show icebreaker → Enable video/audio
5. Session ends → Show action buttons
6. Process actions → Update database
7. Clean up room → Return users to queue (if skip)
```

### Database Optimization
- ✅ **Indexes Added**: All critical queries have optimized indexes
- **Session Partitioning**: Partition by date for historical data (Phase 7)
- **Redis Caching**: Icebreaker prompts, active queues, recent matches
- **Connection Pooling**: Leverage existing NeonDB pool configuration
- **Query Optimization**: Use existing Drizzle ORM patterns for consistency

---

## 📊 Success Metrics & KPIs

### Technical Metrics
- **Connection Success Rate**: >95%
- **Video Latency**: <200ms average
- **Queue Wait Time**: <30 seconds
- **Session Completion Rate**: >80%
- **Concurrent Users Supported**: 1000+

### User Engagement Metrics
- **Daily Active Users**: Track StrathSpeed usage
- **Session Duration**: Average time spent per session
- **Vibe Rate**: Percentage of sessions ending in vibes
- **Return Rate**: Users coming back within 24 hours
- **Streak Engagement**: Users maintaining daily streaks

---

## 🚀 Deployment Strategy

### Staging Environment
1. Deploy to staging with limited user base (50 users)
2. Run comprehensive testing scenarios
3. Monitor performance and gather feedback
4. Fix critical issues and optimize

### Production Rollout
1. **Soft Launch**: 10% of user base (campus ambassadors)
2. **Beta Testing**: 25% rollout with feature flags
3. **Full Launch**: 100% rollout with monitoring
4. **Post-Launch**: Continuous monitoring and optimization

---

## 🛡 Risk Mitigation

### Technical Risks
- **Daily.co API limits**: Implement failover to Twilio Video
- **Redis queue overflow**: Auto-scaling with queue limits
- **WebSocket connection failures**: Automatic reconnection logic
- **Database performance**: Read replicas and caching

### Product Risks
- **Low adoption**: Gamification and social proof features
- **Safety concerns**: Robust moderation and reporting
- **Network issues**: Graceful degradation on poor connections
- **Server costs**: Usage-based scaling and optimization

---

## 📅 Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| 1 | Week 1-2 | Database schema, Redis architecture, API routes |
| 2 | Week 2-3 | Daily.co integration, video components |
| 3 | Week 3-4 | WebSocket events, matching engine |
| 4 | Week 4-5 | UI components, mobile optimization |
| 5 | Week 5-6 | Moderation system, safety features |
| 6 | Week 6-7 | Gamification, points system |
| 7 | Week 7-8 | Testing, optimization, deployment |

**Total Development Time**: 8 weeks
**Team Size**: 2-3 full-stack developers
**Launch Target**: End of Week 8

---

*This plan provides a comprehensive roadmap for implementing StrathSpeed as a production-ready feature. Each phase builds upon the previous one, ensuring a solid foundation while maintaining rapid development pace.*
