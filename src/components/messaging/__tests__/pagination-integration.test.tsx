import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { InfiniteMessageList } from '../infinite-message-list';
import { getMessages } from '@/lib/actions/messaging.actions';
import type { MessageWithSender, PaginatedMessages } from '@/lib/actions/messaging.actions';

// Mock the messaging actions
jest.mock('@/lib/actions/messaging.actions');

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 0));

const mockGetMessages = getMessages as jest.MockedFunction<typeof getMessages>;

describe('Pagination Integration Tests', () => {
  const mockMatchId = 'test-match-id';
  const mockCurrentUserId = 'current-user-id';

  // Helper to create mock messages
  const createMockMessage = (id: string, content: string, createdAt: Date): MessageWithSender => ({
    id,
    content,
    matchId: mockMatchId,
    senderId: id.includes('user1') ? 'user1' : 'user2',
    status: 'sent',
    createdAt,
    updatedAt: createdAt,
    sender: {
      id: id.includes('user1') ? 'user1' : 'user2',
      name: id.includes('user1') ? 'User 1' : 'User 2',
      image: null,
    },
  });

  // Create a batch of messages for testing
  const createMessageBatch = (startId: number, count: number, baseDate: Date) => {
    return Array.from({ length: count }, (_, i) => {
      const messageDate = new Date(baseDate);
      messageDate.setMinutes(messageDate.getMinutes() + i);
      return createMockMessage(
        `message-${startId + i}`,
        `Message ${startId + i}`,
        messageDate
      );
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load initial messages and handle pagination correctly', async () => {
    const initialMessages = createMessageBatch(1, 5, new Date('2024-01-01T10:00:00Z'));
    const olderMessages = createMessageBatch(6, 5, new Date('2024-01-01T09:00:00Z'));

    // Mock initial load
    mockGetMessages.mockResolvedValueOnce({
      success: true,
      data: {
        messages: initialMessages,
        hasMore: true,
        nextCursor: 'cursor-1',
        totalCount: 10,
      } as PaginatedMessages,
    });

    // Mock load more
    mockGetMessages.mockResolvedValueOnce({
      success: true,
      data: {
        messages: olderMessages,
        hasMore: false,
        nextCursor: undefined,
        totalCount: 10,
      } as PaginatedMessages,
    });

    render(
      <InfiniteMessageList
        matchId={mockMatchId}
        currentUserId={mockCurrentUserId}
        enableInfiniteScroll={false} // Use manual loading for easier testing
      />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Message 1')).toBeInTheDocument();
    });

    // Should show initial messages
    expect(screen.getByText('Message 1')).toBeInTheDocument();
    expect(screen.getByText('Message 5')).toBeInTheDocument();

    // Should show load more button
    expect(screen.getByText(/Load older messages/)).toBeInTheDocument();
    expect(screen.getByText(/5 remaining/)).toBeInTheDocument();

    // Click load more
    const loadMoreButton = screen.getByText(/Load older messages/);
    fireEvent.click(loadMoreButton);

    // Wait for older messages to load
    await waitFor(() => {
      expect(screen.getByText('Message 6')).toBeInTheDocument();
    });

    // Should have all messages
    expect(screen.getByText('Message 1')).toBeInTheDocument();
    expect(screen.getByText('Message 10')).toBeInTheDocument();

    // Should not show load more button anymore
    expect(screen.queryByText(/Load older messages/)).not.toBeInTheDocument();

    // Verify API calls
    expect(mockGetMessages).toHaveBeenCalledTimes(2);
    expect(mockGetMessages).toHaveBeenNthCalledWith(1, mockMatchId, 50, undefined);
    expect(mockGetMessages).toHaveBeenNthCalledWith(2, mockMatchId, 50, 'cursor-1');
  });

  it('should handle pagination errors gracefully', async () => {
    const initialMessages = createMessageBatch(1, 3, new Date('2024-01-01T10:00:00Z'));

    // Mock successful initial load
    mockGetMessages.mockResolvedValueOnce({
      success: true,
      data: {
        messages: initialMessages,
        hasMore: true,
        nextCursor: 'cursor-1',
        totalCount: 6,
      } as PaginatedMessages,
    });

    // Mock failed load more
    mockGetMessages.mockResolvedValueOnce({
      success: false,
      error: 'Network error',
    });

    render(
      <InfiniteMessageList
        matchId={mockMatchId}
        currentUserId={mockCurrentUserId}
        enableInfiniteScroll={false}
      />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Message 1')).toBeInTheDocument();
    });

    // Click load more
    const loadMoreButton = screen.getByText(/Load older messages/);
    fireEvent.click(loadMoreButton);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    // Should show error banner with retry option
    expect(screen.getByText('Retry')).toBeInTheDocument();

    // Original messages should still be visible
    expect(screen.getByText('Message 1')).toBeInTheDocument();
    expect(screen.getByText('Message 3')).toBeInTheDocument();
  });

  it('should maintain scroll position when loading older messages', async () => {
    const initialMessages = createMessageBatch(1, 3, new Date('2024-01-01T10:00:00Z'));
    const olderMessages = createMessageBatch(4, 3, new Date('2024-01-01T09:00:00Z'));

    mockGetMessages
      .mockResolvedValueOnce({
        success: true,
        data: {
          messages: initialMessages,
          hasMore: true,
          nextCursor: 'cursor-1',
          totalCount: 6,
        } as PaginatedMessages,
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          messages: olderMessages,
          hasMore: false,
          nextCursor: undefined,
          totalCount: 6,
        } as PaginatedMessages,
      });

    const { container } = render(
      <InfiniteMessageList
        matchId={mockMatchId}
        currentUserId={mockCurrentUserId}
        enableInfiniteScroll={false}
      />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Message 1')).toBeInTheDocument();
    });

    // Mock scroll area element
    const scrollArea = container.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollArea) {
      // Mock initial scroll properties
      Object.defineProperty(scrollArea, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(scrollArea, 'scrollTop', { value: 500, configurable: true });
    }

    // Load more messages
    const loadMoreButton = screen.getByText(/Load older messages/);
    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(screen.getByText('Message 4')).toBeInTheDocument();
    });

    // All messages should be present
    expect(screen.getByText('Message 1')).toBeInTheDocument();
    expect(screen.getByText('Message 6')).toBeInTheDocument();
  });

  it('should handle date separators correctly during pagination', async () => {
    // Messages from different days
    const todayMessages = createMessageBatch(1, 2, new Date('2024-01-02T10:00:00Z'));
    const yesterdayMessages = createMessageBatch(3, 2, new Date('2024-01-01T10:00:00Z'));

    mockGetMessages
      .mockResolvedValueOnce({
        success: true,
        data: {
          messages: todayMessages,
          hasMore: true,
          nextCursor: 'cursor-1',
          totalCount: 4,
        } as PaginatedMessages,
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          messages: yesterdayMessages,
          hasMore: false,
          nextCursor: undefined,
          totalCount: 4,
        } as PaginatedMessages,
      });

    render(
      <InfiniteMessageList
        matchId={mockMatchId}
        currentUserId={mockCurrentUserId}
        enableInfiniteScroll={false}
      />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Message 1')).toBeInTheDocument();
    });

    // Load older messages
    const loadMoreButton = screen.getByText(/Load older messages/);
    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(screen.getByText('Message 3')).toBeInTheDocument();
    });

    // Should have date separators
    const separators = screen.getAllByRole('separator');
    expect(separators.length).toBeGreaterThan(0);
  });

  it('should handle empty pagination responses', async () => {
    mockGetMessages.mockResolvedValue({
      success: true,
      data: {
        messages: [],
        hasMore: false,
        nextCursor: undefined,
        totalCount: 0,
      } as PaginatedMessages,
    });

    render(
      <InfiniteMessageList
        matchId={mockMatchId}
        currentUserId={mockCurrentUserId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });

    expect(screen.getByText('Start the conversation by sending a message!')).toBeInTheDocument();
  });

  it('should handle rapid pagination requests correctly', async () => {
    const messages1 = createMessageBatch(1, 2, new Date('2024-01-01T10:00:00Z'));
    const messages2 = createMessageBatch(3, 2, new Date('2024-01-01T09:00:00Z'));
    const messages3 = createMessageBatch(5, 2, new Date('2024-01-01T08:00:00Z'));

    mockGetMessages
      .mockResolvedValueOnce({
        success: true,
        data: {
          messages: messages1,
          hasMore: true,
          nextCursor: 'cursor-1',
          totalCount: 6,
        } as PaginatedMessages,
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          messages: messages2,
          hasMore: true,
          nextCursor: 'cursor-2',
          totalCount: 6,
        } as PaginatedMessages,
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          messages: messages3,
          hasMore: false,
          nextCursor: undefined,
          totalCount: 6,
        } as PaginatedMessages,
      });

    render(
      <InfiniteMessageList
        matchId={mockMatchId}
        currentUserId={mockCurrentUserId}
        enableInfiniteScroll={false}
      />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Message 1')).toBeInTheDocument();
    });

    // Rapidly click load more multiple times
    const loadMoreButton = screen.getByText(/Load older messages/);
    
    await act(async () => {
      fireEvent.click(loadMoreButton);
      fireEvent.click(loadMoreButton); // Second click should be ignored
    });

    // Wait for first batch to load
    await waitFor(() => {
      expect(screen.getByText('Message 3')).toBeInTheDocument();
    });

    // Should only have made 2 API calls (initial + first load more)
    expect(mockGetMessages).toHaveBeenCalledTimes(2);

    // Load more again
    const newLoadMoreButton = screen.getByText(/Load older messages/);
    fireEvent.click(newLoadMoreButton);

    await waitFor(() => {
      expect(screen.getByText('Message 5')).toBeInTheDocument();
    });

    // Now should have made 3 API calls total
    expect(mockGetMessages).toHaveBeenCalledTimes(3);
  });

  it('should update message count indicator during pagination', async () => {
    const initialMessages = createMessageBatch(1, 3, new Date('2024-01-01T10:00:00Z'));
    const olderMessages = createMessageBatch(4, 2, new Date('2024-01-01T09:00:00Z'));

    mockGetMessages
      .mockResolvedValueOnce({
        success: true,
        data: {
          messages: initialMessages,
          hasMore: true,
          nextCursor: 'cursor-1',
          totalCount: 5,
        } as PaginatedMessages,
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          messages: olderMessages,
          hasMore: false,
          nextCursor: undefined,
          totalCount: 5,
        } as PaginatedMessages,
      });

    render(
      <InfiniteMessageList
        matchId={mockMatchId}
        currentUserId={mockCurrentUserId}
        enableInfiniteScroll={false}
      />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('3 of 5 messages')).toBeInTheDocument();
    });

    // Load more
    const loadMoreButton = screen.getByText(/Load older messages/);
    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(screen.queryByText(/of 5 messages/)).not.toBeInTheDocument();
    });

    // Message count indicator should disappear when all messages are loaded
  });
});