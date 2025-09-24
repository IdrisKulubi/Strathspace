import { renderHook, act } from '@testing-library/react';
import { useInfiniteScroll } from '../use-infinite-scroll';

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

describe('useInfiniteScroll', () => {
  const mockLoadMore = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadMore.mockResolvedValue(undefined);
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() =>
      useInfiniteScroll({
        loadMore: mockLoadMore,
        hasMore: true,
        isLoading: false,
      })
    );

    expect(result.current.scrollRef.current).toBeNull();
    expect(result.current.loadMoreRef.current).toBeNull();
    expect(result.current.isInfiniteScrollActive).toBe(false);
    expect(typeof result.current.triggerLoadMore).toBe('function');
    expect(typeof result.current.scrollTo).toBe('function');
    expect(typeof result.current.scrollToBottom).toBe('function');
    expect(typeof result.current.scrollToTop).toBe('function');
    expect(typeof result.current.getScrollInfo).toBe('function');
  });

  it('should not trigger load more when hasMore is false', async () => {
    const { result } = renderHook(() =>
      useInfiniteScroll({
        loadMore: mockLoadMore,
        hasMore: false,
        isLoading: false,
      })
    );

    await act(async () => {
      await result.current.triggerLoadMore();
    });

    expect(mockLoadMore).not.toHaveBeenCalled();
  });

  it('should not trigger load more when isLoading is true', async () => {
    const { result } = renderHook(() =>
      useInfiniteScroll({
        loadMore: mockLoadMore,
        hasMore: true,
        isLoading: true,
      })
    );

    await act(async () => {
      await result.current.triggerLoadMore();
    });

    expect(mockLoadMore).not.toHaveBeenCalled();
  });

  it('should not trigger load more when disabled', async () => {
    const { result } = renderHook(() =>
      useInfiniteScroll({
        loadMore: mockLoadMore,
        hasMore: true,
        isLoading: false,
        enabled: false,
      })
    );

    await act(async () => {
      await result.current.triggerLoadMore();
    });

    expect(mockLoadMore).not.toHaveBeenCalled();
  });

  it('should trigger load more when conditions are met', async () => {
    const { result } = renderHook(() =>
      useInfiniteScroll({
        loadMore: mockLoadMore,
        hasMore: true,
        isLoading: false,
      })
    );

    await act(async () => {
      await result.current.triggerLoadMore();
    });

    expect(mockLoadMore).toHaveBeenCalledTimes(1);
  });

  it('should handle load more errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const errorMessage = 'Load more failed';
    mockLoadMore.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() =>
      useInfiniteScroll({
        loadMore: mockLoadMore,
        hasMore: true,
        isLoading: false,
      })
    );

    await act(async () => {
      await result.current.triggerLoadMore();
    });

    expect(mockLoadMore).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading more items:', expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it('should prevent concurrent load more requests', async () => {
    let resolveLoadMore: () => void;
    const slowLoadMore = jest.fn(() => new Promise<void>((resolve) => {
      resolveLoadMore = resolve;
    }));

    const { result } = renderHook(() =>
      useInfiniteScroll({
        loadMore: slowLoadMore,
        hasMore: true,
        isLoading: false,
      })
    );

    // Start first load more
    const firstLoadMore = act(async () => {
      await result.current.triggerLoadMore();
    });

    // Try to start second load more immediately
    await act(async () => {
      await result.current.triggerLoadMore();
    });

    // Only first should be called
    expect(slowLoadMore).toHaveBeenCalledTimes(1);

    // Resolve the first load more
    act(() => {
      resolveLoadMore!();
    });

    await firstLoadMore;
  });

  it('should return correct scroll info when no element is attached', () => {
    const { result } = renderHook(() =>
      useInfiniteScroll({
        loadMore: mockLoadMore,
        hasMore: true,
        isLoading: false,
      })
    );

    const scrollInfo = result.current.getScrollInfo();

    expect(scrollInfo).toEqual({
      scrollTop: 0,
      scrollHeight: 0,
      clientHeight: 0,
      isAtBottom: false,
      isAtTop: true,
      distanceFromBottom: 0,
      distanceFromTop: 0,
    });
  });

  it('should setup IntersectionObserver when elements are available', () => {
    const { result } = renderHook(() =>
      useInfiniteScroll({
        loadMore: mockLoadMore,
        hasMore: true,
        isLoading: false,
      })
    );

    // Mock refs having elements
    const mockScrollElement = document.createElement('div');
    const mockLoadMoreElement = document.createElement('div');
    
    Object.defineProperty(result.current.scrollRef, 'current', {
      value: mockScrollElement,
      writable: true,
    });
    
    Object.defineProperty(result.current.loadMoreRef, 'current', {
      value: mockLoadMoreElement,
      writable: true,
    });

    // Re-render to trigger useEffect
    const { rerender } = renderHook(() =>
      useInfiniteScroll({
        loadMore: mockLoadMore,
        hasMore: true,
        isLoading: false,
      })
    );

    rerender();

    expect(mockIntersectionObserver).toHaveBeenCalled();
  });

  it('should use custom threshold value', () => {
    const customThreshold = 200;
    
    const { result } = renderHook(() =>
      useInfiniteScroll({
        loadMore: mockLoadMore,
        hasMore: true,
        isLoading: false,
        threshold: customThreshold,
      })
    );

    // Mock scroll element with specific dimensions
    const mockElement = {
      scrollTop: 100,
      scrollHeight: 1000,
      clientHeight: 400,
      scrollTo: jest.fn(),
    };

    Object.defineProperty(result.current.scrollRef, 'current', {
      value: mockElement,
      writable: true,
    });

    const scrollInfo = result.current.getScrollInfo();
    
    expect(scrollInfo.isAtTop).toBe(customThreshold >= 100);
    expect(scrollInfo.isAtBottom).toBe(500 <= customThreshold); // 1000 - 100 - 400 = 500
  });
});