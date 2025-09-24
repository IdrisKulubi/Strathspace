import { renderHook, act, waitFor } from '@testing-library/react';
import { useMessagePagination } from '../use-message-pagination';
import { getMessages } from '@/lib/actions/messaging.actions';
import type { MessageWithSender, PaginatedMessages } from '@/lib/actions/messaging.actions';

// Mock the messaging actions
jest.mock('@/lib/actions/messaging.actions', () => ({
  getMessages: jest.fn(),
}));

// Mock the infinite scroll hook
jest.mock('../use-infinite-scroll', () => ({
  useInfiniteScroll: jest.fn(() => ({
    scrollRef: { current: null },
    loadMoreRef: { current: null },
    isInfiniteScrollActive: false,
    triggerLoadMore: jest.fn(),
    scrollTo: jest.fn(),
    scrollToBottom: jest.fn(),
    scrollToTop: jest.fn(),
    getScrollInfo: jest.fn(() => ({
      scrollTop: 0,
      scrollHeight: 0,
      clientHeight: 0,
      isAtBottom: true,
      isAtTop: false,
      distanceFromBottom: 0,
      distanceFromTop: 0,
    })),
  })),
}));

const mockGetMessages = getMessages as jest.MockedFunction<typeof getMessages>;

describe('useMessagePagination', () => {
  const mockMatchId = 'test-match-id';
  const mockMessages: MessageWithSender[] = [
    {
      id: '1',
      content: 'Hello',
      matchId: mockMatchId,
      senderId: 'user1',
      status: 'sent',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      sender: { id: 'user1', name: 'User 1', image: null },
    },
    {
      id: '2',
      content: 'Hi there',
      matchId: mockMatchId,
      senderId: 'user2',
      status: 'sent',
      createdAt: new Date('2024-01-01T10:01:00Z'),
      updatedAt: new Date('2024-01-01T10:01:00Z'),
      sender: { id: 'user2', name: 'User 2', image: null },
    },
  ];

  const mockPaginatedResponse: PaginatedMessages = {
    messages: mockMessages,
    hasMore: false,
    nextCursor: undefined,
    totalCount: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMessages.mockResolvedValue({
      success: true,
      data: mockPaginatedResponse,
    });
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() =>
      useMessagePagination({ matchId: mockMatchId })
    );

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isLoadingMore).toBe(false);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.totalCount).toBe(0);
    expect(typeof result.current.loadMore).toBe('function');
    expect(typeof result.current.refresh).toBe('function');
    expect(typeof result.current.addOptimisticMessage).toBe('function');
    expect(typeof result.current.updateMessage).toBe('function');
    expect(typeof result.current.removeMessage).toBe('function');
    expect(result.current.infiniteScroll).toBeDefined();
  });

  it('should fetch messages on mount', async () => {
    renderHook(() => useMessagePagination({ matchId: mockMatchId }));

    await waitFor(() => {
      expect(mockGetMessages).toHaveBeenCalledWith(mockMatchId, 50, undefined);
    });
  });

  it('should handle successful message fetch', async () => {
    const { result } = renderHook(() =>
      useMessagePagination({ matchId: mockMatchId })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.messages).toEqual(mockMessages.reverse()); // Should be in chronological order
    expect(result.current.hasMore).toBe(false);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch error', async () => {
    const errorMessage = 'Failed to fetch messages';
    mockGetMessages.mockResolvedValue({
      success: false,
      error: errorMessage,
    });

    const { result } = renderHook(() =>
      useMessagePagination({ matchId: mockMatchId })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
  });

  it('should load more messages when hasMore is true', async () => {
    const firstBatch: PaginatedMessages = {
      messages: [mockMessages[0]],
      hasMore: true,
      nextCursor: 'cursor-1',
      totalCount: 2,
    };

    const secondBatch: PaginatedMessages = {
      messages: [mockMessages[1]],
      hasMore: false,
      nextCursor: undefined,
      totalCount: 2,
    };

    mockGetMessages
      .mockResolvedValueOnce({ success: true, data: firstBatch })
      .mockResolvedValueOnce({ success: true, data: secondBatch });

    const { result } = renderHook(() =>
      useMessagePagination({ matchId: mockMatchId })
    );

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);

    // Load more
    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockGetMessages).toHaveBeenCalledTimes(2);
    expect(mockGetMessages).toHaveBeenLastCalledWith(mockMatchId, 50, 'cursor-1');
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.hasMore).toBe(false);
  });

  it('should not load more when hasMore is false', async () => {
    const { result } = renderHook(() =>
      useMessagePagination({ matchId: mockMatchId })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialCallCount = mockGetMessages.mock.calls.length;

    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockGetMessages).toHaveBeenCalledTimes(initialCallCount);
  });

  it('should refresh messages', async () => {
    const { result } = renderHook(() =>
      useMessagePagination({ matchId: mockMatchId })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialCallCount = mockGetMessages.mock.calls.length;

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetMessages).toHaveBeenCalledTimes(initialCallCount + 1);
    expect(mockGetMessages).toHaveBeenLastCalledWith(mockMatchId, 50, undefined);
  });

  it('should add optimistic message', async () => {
    const { result } = renderHook(() =>
      useMessagePagination({ matchId: mockMatchId })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const optimisticMessage: MessageWithSender = {
      id: 'optimistic-1',
      content: 'Optimistic message',
      matchId: mockMatchId,
      senderId: 'user1',
      status: 'sending',
      createdAt: new Date(),
      updatedAt: new Date(),
      sender: { id: 'user1', name: 'User 1', image: null },
    };

    act(() => {
      result.current.addOptimisticMessage(optimisticMessage);
    });

    expect(result.current.messages).toContain(optimisticMessage);
    expect(result.current.messages).toHaveLength(3);
  });

  it('should update existing message', async () => {
    const { result } = renderHook(() =>
      useMessagePagination({ matchId: mockMatchId })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateMessage('1', { status: 'delivered' });
    });

    const updatedMessage = result.current.messages.find(msg => msg.id === '1');
    expect(updatedMessage?.status).toBe('delivered');
  });

  it('should remove message', async () => {
    const { result } = renderHook(() =>
      useMessagePagination({ matchId: mockMatchId })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.removeMessage('1');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages.find(msg => msg.id === '1')).toBeUndefined();
  });

  it('should call onMessagesLoaded callback', async () => {
    const onMessagesLoaded = jest.fn();

    renderHook(() =>
      useMessagePagination({
        matchId: mockMatchId,
        onMessagesLoaded,
      })
    );

    await waitFor(() => {
      expect(onMessagesLoaded).toHaveBeenCalledWith(mockMessages, false);
    });
  });

  it('should call onError callback on fetch error', async () => {
    const onError = jest.fn();
    const errorMessage = 'Network error';

    mockGetMessages.mockResolvedValue({
      success: false,
      error: errorMessage,
    });

    renderHook(() =>
      useMessagePagination({
        matchId: mockMatchId,
        onError,
      })
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(errorMessage);
    });
  });

  it('should use custom page size', async () => {
    const customPageSize = 25;

    renderHook(() =>
      useMessagePagination({
        matchId: mockMatchId,
        pageSize: customPageSize,
      })
    );

    await waitFor(() => {
      expect(mockGetMessages).toHaveBeenCalledWith(mockMatchId, customPageSize, undefined);
    });
  });

  it('should not fetch when disabled', () => {
    renderHook(() =>
      useMessagePagination({
        matchId: mockMatchId,
        enabled: false,
      })
    );

    expect(mockGetMessages).not.toHaveBeenCalled();
  });

  it('should refetch when matchId changes', async () => {
    const { rerender } = renderHook(
      ({ matchId }) => useMessagePagination({ matchId }),
      { initialProps: { matchId: 'match-1' } }
    );

    await waitFor(() => {
      expect(mockGetMessages).toHaveBeenCalledWith('match-1', 50, undefined);
    });

    rerender({ matchId: 'match-2' });

    await waitFor(() => {
      expect(mockGetMessages).toHaveBeenCalledWith('match-2', 50, undefined);
    });

    expect(mockGetMessages).toHaveBeenCalledTimes(2);
  });
});