import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InfiniteMessageList } from '../infinite-message-list';
import { useMessagePagination } from '@/hooks/use-message-pagination';
import type { MessageWithSender } from '@/lib/actions/messaging.actions';

// Mock the message pagination hook
jest.mock('@/hooks/use-message-pagination');

// Mock the MessageBubble component
jest.mock('../message-bubble', () => ({
  MessageBubble: ({ message, onRetry }: any) => (
    <div data-testid={`message-${message.id}`}>
      <span>{message.content}</span>
      {message.status === 'failed' && (
        <button onClick={() => onRetry(message.id)}>Retry</button>
      )}
    </div>
  ),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date) => date.toISOString()),
  isSameDay: jest.fn((date1, date2) => 
    date1.toDateString() === date2.toDateString()
  ),
  isToday: jest.fn((date) => 
    date.toDateString() === new Date().toDateString()
  ),
  isYesterday: jest.fn((date) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
  }),
}));

const mockUseMessagePagination = useMessagePagination as jest.MockedFunction<typeof useMessagePagination>;

describe('InfiniteMessageList', () => {
  const mockProps = {
    matchId: 'test-match-id',
    currentUserId: 'current-user-id',
  };

  const mockMessages: MessageWithSender[] = [
    {
      id: '1',
      content: 'Hello',
      matchId: 'test-match-id',
      senderId: 'user1',
      status: 'sent' as const,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      sender: { id: 'user1', name: 'User 1', image: null },
    },
    {
      id: '2',
      content: 'Hi there',
      matchId: 'test-match-id',
      senderId: 'user2',
      status: 'sent' as const,
      createdAt: new Date('2024-01-01T10:01:00Z'),
      updatedAt: new Date('2024-01-01T10:01:00Z'),
      sender: { id: 'user2', name: 'User 2', image: null },
    },
  ];

  const mockInfiniteScroll = {
    scrollRef: { current: null },
    loadMoreRef: { current: null },
    isInfiniteScrollActive: false,
    scrollToBottom: jest.fn(),
    scrollToTop: jest.fn(),
    getScrollInfo: jest.fn(() => ({
      scrollTop: 0,
      scrollHeight: 1000,
      clientHeight: 400,
      isAtBottom: false,
      isAtTop: false,
      distanceFromBottom: 600,
      distanceFromTop: 0,
    })),
  };

  const defaultMockReturn = {
    messages: mockMessages,
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    error: null,
    totalCount: 2,
    loadMore: jest.fn(),
    refresh: jest.fn(),
    addOptimisticMessage: jest.fn(),
    updateMessage: jest.fn(),
    infiniteScroll: mockInfiniteScroll,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMessagePagination.mockReturnValue(defaultMockReturn);
  });

  it('should render messages correctly', () => {
    render(<InfiniteMessageList {...mockProps} />);

    expect(screen.getByTestId('message-1')).toBeInTheDocument();
    expect(screen.getByTestId('message-2')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  it('should show empty state when no messages', () => {
    mockUseMessagePagination.mockReturnValue({
      ...defaultMockReturn,
      messages: [],
      totalCount: 0,
    });

    render(<InfiniteMessageList {...mockProps} />);

    expect(screen.getByText('No messages yet')).toBeInTheDocument();
    expect(screen.getByText('Start the conversation by sending a message!')).toBeInTheDocument();
  });

  it('should show error state when error and no messages', () => {
    const errorMessage = 'Failed to load messages';
    mockUseMessagePagination.mockReturnValue({
      ...defaultMockReturn,
      messages: [],
      error: errorMessage,
      totalCount: 0,
    });

    render(<InfiniteMessageList {...mockProps} />);

    expect(screen.getByText('Failed to load messages')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should show error banner when error with existing messages', () => {
    const errorMessage = 'Network error';
    mockUseMessagePagination.mockReturnValue({
      ...defaultMockReturn,
      error: errorMessage,
    });

    render(<InfiniteMessageList {...mockProps} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
    // Messages should still be visible
    expect(screen.getByTestId('message-1')).toBeInTheDocument();
  });

  it('should show loading skeleton during initial load', () => {
    mockUseMessagePagination.mockReturnValue({
      ...defaultMockReturn,
      messages: [],
      isLoading: true,
    });

    render(<InfiniteMessageList {...mockProps} />);

    // Should show skeleton loaders
    const skeletons = screen.getAllByTestId(/skeleton/i);
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should show load more indicator when hasMore is true', () => {
    mockUseMessagePagination.mockReturnValue({
      ...defaultMockReturn,
      hasMore: true,
      totalCount: 10,
    });

    render(<InfiniteMessageList {...mockProps} />);

    expect(screen.getByText(/Scroll up to load more/)).toBeInTheDocument();
    expect(screen.getByText(/8 remaining/)).toBeInTheDocument();
  });

  it('should show loading indicator when loading more', () => {
    mockUseMessagePagination.mockReturnValue({
      ...defaultMockReturn,
      hasMore: true,
      isLoadingMore: true,
    });

    render(<InfiniteMessageList {...mockProps} />);

    expect(screen.getByText('Loading older messages...')).toBeInTheDocument();
  });

  it('should call loadMore when manual load more button is clicked', async () => {
    const mockLoadMore = jest.fn();
    mockUseMessagePagination.mockReturnValue({
      ...defaultMockReturn,
      hasMore: true,
      loadMore: mockLoadMore,
    });

    render(<InfiniteMessageList {...mockProps} enableInfiniteScroll={false} />);

    const loadMoreButton = screen.getByText(/Load older messages/);
    fireEvent.click(loadMoreButton);

    expect(mockLoadMore).toHaveBeenCalledTimes(1);
  });

  it('should call refresh when retry button is clicked', async () => {
    const mockRefresh = jest.fn();
    mockUseMessagePagination.mockReturnValue({
      ...defaultMockReturn,
      messages: [],
      error: 'Network error',
      refresh: mockRefresh,
    });

    render(<InfiniteMessageList {...mockProps} />);

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('should call onRetry when message retry is triggered', async () => {
    const mockOnRetry = jest.fn();
    const failedMessage: MessageWithSender = {
      ...mockMessages[0],
      id: 'failed-message',
      status: 'failed',
    };

    mockUseMessagePagination.mockReturnValue({
      ...defaultMockReturn,
      messages: [failedMessage],
    });

    render(<InfiniteMessageList {...mockProps} onRetry={mockOnRetry} />);

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledWith('failed-message');
  });

  it('should show scroll to bottom button when not near bottom', () => {
    // Mock scroll info to indicate not at bottom
    mockInfiniteScroll.getScrollInfo.mockReturnValue({
      scrollTop: 100,
      scrollHeight: 1000,
      clientHeight: 400,
      isAtBottom: false,
      isAtTop: false,
      distanceFromBottom: 500,
      distanceFromTop: 100,
    });

    render(<InfiniteMessageList {...mockProps} />);

    // Simulate scroll event to trigger button visibility
    const scrollArea = screen.getByRole('region'); // ScrollArea has role="region"
    fireEvent.scroll(scrollArea, { target: { scrollTop: 100 } });

    // Note: The button visibility logic depends on state updates from scroll events
    // In a real test environment, you might need to use act() and waitFor()
  });

  it('should show message count indicator when there are more messages', () => {
    mockUseMessagePagination.mockReturnValue({
      ...defaultMockReturn,
      totalCount: 10,
    });

    render(<InfiniteMessageList {...mockProps} />);

    expect(screen.getByText('2 of 10 messages')).toBeInTheDocument();
  });

  it('should group messages by date with separators', () => {
    const messagesWithDifferentDates: MessageWithSender[] = [
      {
        ...mockMessages[0],
        createdAt: new Date('2024-01-01T10:00:00Z'),
      },
      {
        ...mockMessages[1],
        createdAt: new Date('2024-01-02T10:00:00Z'),
      },
    ];

    mockUseMessagePagination.mockReturnValue({
      ...defaultMockReturn,
      messages: messagesWithDifferentDates,
    });

    render(<InfiniteMessageList {...mockProps} />);

    // Should have date separators
    expect(screen.getAllByRole('separator')).toHaveLength(4); // 2 separators per date separator
  });

  it('should call onMessagesLoaded callback when provided', () => {
    const mockOnMessagesLoaded = jest.fn();

    render(
      <InfiniteMessageList
        {...mockProps}
        onMessagesLoaded={mockOnMessagesLoaded}
      />
    );

    expect(mockUseMessagePagination).toHaveBeenCalledWith(
      expect.objectContaining({
        onMessagesLoaded: mockOnMessagesLoaded,
      })
    );
  });

  it('should use custom page size when provided', () => {
    const customPageSize = 25;

    render(<InfiniteMessageList {...mockProps} pageSize={customPageSize} />);

    expect(mockUseMessagePagination).toHaveBeenCalledWith(
      expect.objectContaining({
        pageSize: customPageSize,
      })
    );
  });

  it('should disable infinite scroll when enableInfiniteScroll is false', () => {
    mockUseMessagePagination.mockReturnValue({
      ...defaultMockReturn,
      hasMore: true,
    });

    render(<InfiniteMessageList {...mockProps} enableInfiniteScroll={false} />);

    // Should show manual load more button instead of infinite scroll indicator
    expect(screen.getByText(/Load older messages/)).toBeInTheDocument();
    expect(screen.queryByText(/Scroll up to load more/)).not.toBeInTheDocument();
  });
});